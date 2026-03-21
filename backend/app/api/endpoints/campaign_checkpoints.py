from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_active_user,
    get_current_organization_user,
    get_db,
    get_optional_current_user,
)
from app.models.campaign import Campaign
from app.models.campaign_checkpoint import CampaignCheckpoint, CheckpointType
from app.models.checkpoint_scan_log import (
    CheckpointScanLog,
    CheckpointScanResult,
    CheckpointScanType,
)
from app.models.goods_checkin import GoodsCheckin
from app.models.user import User
from app.models.volunteer_attendance import VolunteerAttendance
from app.models.volunteer_registration import (
    VolunteerAttendanceStatus,
    VolunteerRegistration,
    VolunteerStatus,
)
from app.schemas.campaign_checkpoint import (
    CampaignCheckpointCreate,
    CampaignCheckpointGenerateQrRequest,
    CampaignCheckpointGenerateQrResponse,
    CampaignCheckpointManualAttendanceRequest,
    CampaignCheckpointRead,
    CampaignCheckpointScanRequest,
    CampaignCheckpointScanResponse,
    CampaignCheckpointUpdate,
    CheckpointScanLogRead,
    GoodsCheckinRead,
    VolunteerAttendanceRead,
)
from app.services.checkpoint_qr_service import (
    decode_checkpoint_qr_token,
    generate_checkpoint_qr_token,
)

router = APIRouter(prefix="/campaign-checkpoints", tags=["campaign_checkpoints"])


def _get_checkpoint_or_404(db: Session, checkpoint_id: UUID) -> CampaignCheckpoint:
    checkpoint = db.get(CampaignCheckpoint, checkpoint_id)
    if checkpoint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checkpoint not found")
    return checkpoint


def _get_campaign_or_404(db: Session, campaign_id: UUID) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


def _ensure_checkpoint_owner(checkpoint: CampaignCheckpoint, current_user: User) -> None:
    if checkpoint.organization_id != current_user.organization_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot manage checkpoint from another organization",
        )


def _ensure_supporter_user(current_user: User) -> None:
    if current_user.organization_id is not None and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supporter account required for this action",
        )


def _build_scan_log(
    *,
    checkpoint: CampaignCheckpoint,
    user_id: UUID | None,
    registration_id: UUID | None,
    scan_type: CheckpointScanType,
    result: CheckpointScanResult,
    message: str | None,
    token_nonce: str | None,
) -> CheckpointScanLog:
    return CheckpointScanLog(
        campaign_id=checkpoint.campaign_id,
        checkpoint_id=checkpoint.id,
        registration_id=registration_id,
        user_id=user_id,
        scan_type=scan_type.value,
        result=result.value,
        message=message,
        token_nonce=token_nonce,
    )


def _resolve_checkout_attendance_status(
    registration: VolunteerRegistration,
    check_out_at: datetime,
) -> VolunteerAttendanceStatus:
    shift_end = registration.shift_end_at
    if shift_end is None:
        return VolunteerAttendanceStatus.completed
    if shift_end.tzinfo is None:
        shift_end = shift_end.replace(tzinfo=timezone.utc)
    return (
        VolunteerAttendanceStatus.left_early
        if check_out_at < shift_end
        else VolunteerAttendanceStatus.completed
    )


@router.get("/", response_model=list[CampaignCheckpointRead])
def list_campaign_checkpoints(
    campaign_id: UUID | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> list[CampaignCheckpoint]:
    stmt = select(CampaignCheckpoint).order_by(CampaignCheckpoint.created_at.desc()).limit(limit)

    if include_inactive:
        if current_user is None or (
            current_user.organization_id is None and not current_user.is_superuser
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization account required to include inactive checkpoints",
            )
        if current_user.is_superuser:
            pass
        elif campaign_id is not None:
            campaign = _get_campaign_or_404(db, campaign_id)
            if campaign.organization_id != current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot list checkpoints from another organization",
                )
        else:
            stmt = stmt.where(CampaignCheckpoint.organization_id == current_user.organization_id)
    else:
        stmt = stmt.where(CampaignCheckpoint.is_active.is_(True))

    if campaign_id is not None:
        stmt = stmt.where(CampaignCheckpoint.campaign_id == campaign_id)

    return list(db.scalars(stmt).all())


@router.post("/", response_model=CampaignCheckpointRead, status_code=status.HTTP_201_CREATED)
def create_campaign_checkpoint(
    payload: CampaignCheckpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignCheckpoint:
    campaign = _get_campaign_or_404(db, payload.campaign_id)
    if campaign.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create checkpoint for another organization campaign",
        )

    checkpoint = CampaignCheckpoint(
        campaign_id=payload.campaign_id,
        organization_id=current_user.organization_id,
        name=payload.name,
        checkpoint_type=payload.checkpoint_type.value,
        description=payload.description,
        address_line=payload.address_line,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_active=payload.is_active,
    )
    db.add(checkpoint)
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


@router.patch("/{checkpoint_id}", response_model=CampaignCheckpointRead)
def update_campaign_checkpoint(
    checkpoint_id: UUID,
    payload: CampaignCheckpointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignCheckpoint:
    checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
    _ensure_checkpoint_owner(checkpoint, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    if "checkpoint_type" in update_data and update_data["checkpoint_type"] is not None:
        update_data["checkpoint_type"] = update_data["checkpoint_type"].value

    for field, value in update_data.items():
        setattr(checkpoint, field, value)

    db.commit()
    db.refresh(checkpoint)
    return checkpoint


@router.delete("/{checkpoint_id}")
def delete_campaign_checkpoint(
    checkpoint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> dict[str, str]:
    checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
    _ensure_checkpoint_owner(checkpoint, current_user)
    db.delete(checkpoint)
    db.commit()
    return {"message": "Checkpoint deleted successfully"}


@router.post("/{checkpoint_id}/qr", response_model=CampaignCheckpointGenerateQrResponse)
def generate_checkpoint_qr(
    checkpoint_id: UUID,
    payload: CampaignCheckpointGenerateQrRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignCheckpointGenerateQrResponse:
    checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
    _ensure_checkpoint_owner(checkpoint, current_user)

    if checkpoint.checkpoint_type not in {
        CheckpointType.volunteer.value,
        CheckpointType.goods.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported checkpoint type",
        )

    if (
        checkpoint.checkpoint_type == CheckpointType.goods.value
        and payload.scan_type != CheckpointScanType.check_in
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goods checkpoint QR only supports check-in",
        )

    token, expires_at, _ = generate_checkpoint_qr_token(
        checkpoint_id=checkpoint.id,
        campaign_id=checkpoint.campaign_id,
        organization_id=checkpoint.organization_id,
        scan_type=payload.scan_type,
        expires_in_minutes=payload.expires_in_minutes,
    )
    return CampaignCheckpointGenerateQrResponse(
        checkpoint_id=checkpoint.id,
        campaign_id=checkpoint.campaign_id,
        scan_type=payload.scan_type,
        token=token,
        expires_at=expires_at,
    )


@router.post(
    "/{checkpoint_id}/manual-attendance",
    response_model=CampaignCheckpointScanResponse,
)
def create_manual_volunteer_attendance(
    checkpoint_id: UUID,
    payload: CampaignCheckpointManualAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> CampaignCheckpointScanResponse:
    checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
    _ensure_checkpoint_owner(checkpoint, current_user)

    if checkpoint.checkpoint_type != CheckpointType.volunteer.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual attendance is only available for volunteer checkpoints",
        )
    if not checkpoint.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checkpoint is inactive",
        )

    registration = db.get(VolunteerRegistration, payload.registration_id)
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Volunteer registration not found",
        )
    if registration.campaign_id != checkpoint.campaign_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Registration does not belong to this campaign",
        )
    if registration.status != VolunteerStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Volunteer registration must be approved for attendance",
        )
    if registration.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Manual attendance requires a linked supporter account",
        )

    now = datetime.now(timezone.utc)
    open_attendance = db.scalar(
        select(VolunteerAttendance)
        .where(
            VolunteerAttendance.checkpoint_id == checkpoint.id,
            VolunteerAttendance.user_id == registration.user_id,
            VolunteerAttendance.check_out_at.is_(None),
        )
        .order_by(VolunteerAttendance.check_in_at.desc())
    )

    if payload.scan_type == CheckpointScanType.check_in:
        if open_attendance is not None:
            db.add(
                _build_scan_log(
                    checkpoint=checkpoint,
                    user_id=registration.user_id,
                    registration_id=registration.id,
                    scan_type=payload.scan_type,
                    result=CheckpointScanResult.rejected,
                    message="Manual check-in rejected: open session already exists",
                    token_nonce=None,
                )
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Volunteer is already checked in and has not checked out",
            )

        attendance = VolunteerAttendance(
            campaign_id=checkpoint.campaign_id,
            checkpoint_id=checkpoint.id,
            registration_id=registration.id,
            user_id=registration.user_id,
            check_in_at=now,
            check_out_at=None,
            duration_minutes=None,
        )
        db.add(attendance)
        db.flush()
        registration.attendance_status = VolunteerAttendanceStatus.arrived
        registration.attendance_marked_at = now
        registration.attendance_marked_by_user_id = current_user.id
        db.add(
            _build_scan_log(
                checkpoint=checkpoint,
                user_id=registration.user_id,
                registration_id=registration.id,
                scan_type=payload.scan_type,
                result=CheckpointScanResult.success,
                message="Manual check-in successful",
                token_nonce=None,
            )
        )
        db.commit()
        db.refresh(attendance)
        return CampaignCheckpointScanResponse(
            message="Manual check-in successful",
            scan_type=CheckpointScanType.check_in,
            flow_type=CheckpointType.volunteer,
            attendance=VolunteerAttendanceRead.model_validate(attendance),
        )

    if open_attendance is None:
        db.add(
            _build_scan_log(
                checkpoint=checkpoint,
                user_id=registration.user_id,
                registration_id=registration.id,
                scan_type=payload.scan_type,
                result=CheckpointScanResult.rejected,
                message="Manual check-out rejected: no active check-in found",
                token_nonce=None,
            )
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active check-in found for this volunteer",
        )

    duration_minutes = max(int((now - open_attendance.check_in_at).total_seconds() // 60), 0)
    open_attendance.check_out_at = now
    open_attendance.duration_minutes = duration_minutes
    registration.attendance_status = _resolve_checkout_attendance_status(registration, now)
    registration.attendance_marked_at = now
    registration.attendance_marked_by_user_id = current_user.id
    db.add(
        _build_scan_log(
            checkpoint=checkpoint,
            user_id=registration.user_id,
            registration_id=registration.id,
            scan_type=payload.scan_type,
            result=CheckpointScanResult.success,
            message="Manual check-out successful",
            token_nonce=None,
        )
    )
    db.commit()
    db.refresh(open_attendance)
    return CampaignCheckpointScanResponse(
        message="Manual check-out successful",
        scan_type=CheckpointScanType.check_out,
        flow_type=CheckpointType.volunteer,
        attendance=VolunteerAttendanceRead.model_validate(open_attendance),
    )


@router.post("/scan", response_model=CampaignCheckpointScanResponse)
def scan_campaign_checkpoint_qr(
    payload: CampaignCheckpointScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CampaignCheckpointScanResponse:
    _ensure_supporter_user(current_user)

    try:
        token_data = decode_checkpoint_qr_token(payload.token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    checkpoint = _get_checkpoint_or_404(db, token_data.checkpoint_id)
    if (
        checkpoint.campaign_id != token_data.campaign_id
        or checkpoint.organization_id != token_data.organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR token does not match checkpoint metadata",
        )
    if not checkpoint.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Checkpoint is inactive")
    if checkpoint.checkpoint_type != CheckpointType.volunteer.value:
        if checkpoint.checkpoint_type != CheckpointType.goods.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported checkpoint type",
            )

    duplicated_nonce = db.scalar(
        select(CheckpointScanLog.id).where(
            CheckpointScanLog.user_id == current_user.id,
            CheckpointScanLog.scan_type == token_data.scan_type.value,
            CheckpointScanLog.result == CheckpointScanResult.success.value,
            CheckpointScanLog.token_nonce == token_data.nonce,
        )
    )
    if duplicated_nonce is not None:
        db.add(
            _build_scan_log(
                checkpoint=checkpoint,
                user_id=current_user.id,
                registration_id=None,
                scan_type=token_data.scan_type,
                result=CheckpointScanResult.rejected,
                message="Duplicated QR scan nonce",
                token_nonce=token_data.nonce,
            )
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This QR has already been used for your account",
        )

    if checkpoint.checkpoint_type == CheckpointType.goods.value:
        if token_data.scan_type != CheckpointScanType.check_in:
            db.add(
                _build_scan_log(
                    checkpoint=checkpoint,
                    user_id=current_user.id,
                    registration_id=None,
                    scan_type=token_data.scan_type,
                    result=CheckpointScanResult.rejected,
                    message="Goods checkpoint only supports check-in",
                    token_nonce=token_data.nonce,
                )
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Goods checkpoint only supports check-in",
            )

        item_name = (payload.item_name or "").strip()
        quantity = payload.quantity
        donor_name = (payload.donor_name or "").strip() or current_user.full_name
        unit = (payload.unit or "").strip() or "item"

        if not item_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="item_name is required for goods check-in",
            )
        if quantity is None or Decimal(quantity) <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="quantity must be greater than 0 for goods check-in",
            )

        goods_checkin = GoodsCheckin(
            campaign_id=checkpoint.campaign_id,
            checkpoint_id=checkpoint.id,
            user_id=current_user.id,
            donor_name=donor_name,
            item_name=item_name,
            quantity=quantity,
            unit=unit,
            note=payload.note,
        )
        db.add(goods_checkin)
        db.flush()
        db.add(
            _build_scan_log(
                checkpoint=checkpoint,
                user_id=current_user.id,
                registration_id=None,
                scan_type=token_data.scan_type,
                result=CheckpointScanResult.success,
                message=(
                    f"Goods check-in successful: {donor_name} checked in "
                    f"{item_name} x{quantity} {unit}"
                ),
                token_nonce=token_data.nonce,
            )
        )
        db.commit()
        db.refresh(goods_checkin)
        return CampaignCheckpointScanResponse(
            message="Goods check-in successful",
            scan_type=CheckpointScanType.check_in,
            flow_type=CheckpointType.goods,
            goods_checkin=GoodsCheckinRead.model_validate(goods_checkin),
        )

    registration = db.scalar(
        select(VolunteerRegistration)
        .where(
            VolunteerRegistration.campaign_id == checkpoint.campaign_id,
            VolunteerRegistration.user_id == current_user.id,
        )
        .order_by(VolunteerRegistration.registered_at.desc())
    )
    if registration is None:
        log = _build_scan_log(
            checkpoint=checkpoint,
            user_id=current_user.id,
            registration_id=None,
            scan_type=token_data.scan_type,
            result=CheckpointScanResult.rejected,
            message="User has no registration for this campaign",
            token_nonce=token_data.nonce,
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not registered for this campaign",
        )

    if registration.status != VolunteerStatus.approved:
        log = _build_scan_log(
            checkpoint=checkpoint,
            user_id=current_user.id,
            registration_id=registration.id,
            scan_type=token_data.scan_type,
            result=CheckpointScanResult.rejected,
            message=f"Registration status is {registration.status.value}",
            token_nonce=token_data.nonce,
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration is not approved yet",
        )

    now = datetime.now(timezone.utc)

    open_attendance = db.scalar(
        select(VolunteerAttendance)
        .where(
            VolunteerAttendance.checkpoint_id == checkpoint.id,
            VolunteerAttendance.user_id == current_user.id,
            VolunteerAttendance.check_out_at.is_(None),
        )
        .order_by(VolunteerAttendance.check_in_at.desc())
    )

    if token_data.scan_type == CheckpointScanType.check_in:
        if open_attendance is not None:
            log = _build_scan_log(
                checkpoint=checkpoint,
                user_id=current_user.id,
                registration_id=registration.id,
                scan_type=token_data.scan_type,
                result=CheckpointScanResult.rejected,
                message="User already has an open check-in session",
                token_nonce=token_data.nonce,
            )
            db.add(log)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already checked in and have not checked out yet",
            )

        attendance = VolunteerAttendance(
            campaign_id=checkpoint.campaign_id,
            checkpoint_id=checkpoint.id,
            registration_id=registration.id,
            user_id=current_user.id,
            check_in_at=now,
            check_out_at=None,
            duration_minutes=None,
        )
        db.add(attendance)
        db.flush()
        registration.attendance_status = VolunteerAttendanceStatus.arrived
        registration.attendance_marked_at = now
        registration.attendance_marked_by_user_id = current_user.id
        db.add(
            _build_scan_log(
                checkpoint=checkpoint,
                user_id=current_user.id,
                registration_id=registration.id,
                scan_type=token_data.scan_type,
                result=CheckpointScanResult.success,
                message="Check-in successful",
                token_nonce=token_data.nonce,
            )
        )
        db.commit()
        db.refresh(attendance)
        return CampaignCheckpointScanResponse(
            message="Check-in successful",
            scan_type=CheckpointScanType.check_in,
            flow_type=CheckpointType.volunteer,
            attendance=VolunteerAttendanceRead.model_validate(attendance),
        )

    if open_attendance is None:
        log = _build_scan_log(
            checkpoint=checkpoint,
            user_id=current_user.id,
            registration_id=registration.id,
            scan_type=token_data.scan_type,
            result=CheckpointScanResult.rejected,
            message="No open check-in session found",
            token_nonce=token_data.nonce,
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active check-in found. Please check in first.",
        )

    duration_minutes = max(int((now - open_attendance.check_in_at).total_seconds() // 60), 0)
    open_attendance.check_out_at = now
    open_attendance.duration_minutes = duration_minutes
    registration.attendance_status = _resolve_checkout_attendance_status(registration, now)
    registration.attendance_marked_at = now
    registration.attendance_marked_by_user_id = current_user.id
    db.add(
        _build_scan_log(
            checkpoint=checkpoint,
            user_id=current_user.id,
            registration_id=registration.id,
            scan_type=token_data.scan_type,
            result=CheckpointScanResult.success,
            message="Check-out successful",
            token_nonce=token_data.nonce,
        )
    )
    db.commit()
    db.refresh(open_attendance)
    return CampaignCheckpointScanResponse(
        message="Check-out successful",
        scan_type=CheckpointScanType.check_out,
        flow_type=CheckpointType.volunteer,
        attendance=VolunteerAttendanceRead.model_validate(open_attendance),
    )


@router.get("/goods-checkins", response_model=list[GoodsCheckinRead])
def list_goods_checkins_for_organization(
    campaign_id: UUID | None = Query(default=None),
    checkpoint_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> list[GoodsCheckin]:
    stmt = (
        select(GoodsCheckin)
        .join(CampaignCheckpoint, CampaignCheckpoint.id == GoodsCheckin.checkpoint_id)
        .order_by(GoodsCheckin.checked_in_at.desc())
        .limit(limit)
    )

    if checkpoint_id is not None:
        checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
        _ensure_checkpoint_owner(checkpoint, current_user)
        stmt = stmt.where(GoodsCheckin.checkpoint_id == checkpoint_id)

    if campaign_id is not None:
        campaign = _get_campaign_or_404(db, campaign_id)
        if campaign.organization_id != current_user.organization_id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot query goods check-ins for another organization campaign",
            )
        stmt = stmt.where(GoodsCheckin.campaign_id == campaign_id)
    elif not current_user.is_superuser:
        stmt = stmt.where(CampaignCheckpoint.organization_id == current_user.organization_id)

    if user_id is not None:
        stmt = stmt.where(GoodsCheckin.user_id == user_id)

    return list(db.scalars(stmt).all())


@router.get("/my-goods-checkins", response_model=list[GoodsCheckinRead])
def list_my_goods_checkins(
    campaign_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[GoodsCheckin]:
    _ensure_supporter_user(current_user)
    stmt = (
        select(GoodsCheckin)
        .where(GoodsCheckin.user_id == current_user.id)
        .order_by(GoodsCheckin.checked_in_at.desc())
        .limit(limit)
    )
    if campaign_id is not None:
        stmt = stmt.where(GoodsCheckin.campaign_id == campaign_id)
    return list(db.scalars(stmt).all())


@router.get("/my-attendance", response_model=list[VolunteerAttendanceRead])
def list_my_attendance(
    campaign_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[VolunteerAttendance]:
    _ensure_supporter_user(current_user)

    stmt = (
        select(VolunteerAttendance)
        .where(VolunteerAttendance.user_id == current_user.id)
        .order_by(VolunteerAttendance.check_in_at.desc())
        .limit(limit)
    )
    if campaign_id is not None:
        stmt = stmt.where(VolunteerAttendance.campaign_id == campaign_id)
    return list(db.scalars(stmt).all())


@router.get("/{checkpoint_id}/logs", response_model=list[CheckpointScanLogRead])
def list_checkpoint_scan_logs(
    checkpoint_id: UUID,
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_organization_user),
) -> list[CheckpointScanLog]:
    checkpoint = _get_checkpoint_or_404(db, checkpoint_id)
    _ensure_checkpoint_owner(checkpoint, current_user)

    stmt = (
        select(CheckpointScanLog)
        .where(CheckpointScanLog.checkpoint_id == checkpoint_id)
        .order_by(CheckpointScanLog.scanned_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
