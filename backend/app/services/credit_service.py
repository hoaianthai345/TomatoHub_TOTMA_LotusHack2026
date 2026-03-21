from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.credit_event import CreditEvent, CreditTargetType
from app.models.organization import Organization
from app.models.user import User

DONATION_CREATED_SUPPORTER_POINTS = 5
DONATION_RECEIVED_ORGANIZATION_POINTS = 2
VOLUNTEER_REGISTERED_SUPPORTER_POINTS = 3
VOLUNTEER_REGISTERED_ORGANIZATION_POINTS = 1
VOLUNTEER_APPROVED_SUPPORTER_POINTS = 6
VOLUNTEER_APPROVED_ORGANIZATION_POINTS = 2
CAMPAIGN_PUBLISHED_ORGANIZATION_POINTS = 10
CAMPAIGN_CLOSED_ORGANIZATION_POINTS = 4


def credit_level_from_score(score: int) -> str:
    if score >= 500:
        return "platinum"
    if score >= 250:
        return "gold"
    if score >= 100:
        return "silver"
    if score >= 25:
        return "bronze"
    return "new"


def _apply_score_delta(current_value: int, points: int) -> int:
    return max(current_value + points, 0)


def apply_credit_event(
    db: Session,
    *,
    target_type: CreditTargetType,
    points: int,
    event_type: str,
    target_user_id: UUID | None = None,
    target_organization_id: UUID | None = None,
    actor_user_id: UUID | None = None,
    note: str | None = None,
    context: dict[str, Any] | None = None,
) -> CreditEvent:
    if points == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Credit points cannot be zero",
        )

    if target_type == CreditTargetType.supporter:
        if target_user_id is None or target_organization_id is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Supporter credit event must target only a user",
            )
        target_user = db.get(User, target_user_id)
        if target_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit target user not found",
            )
        if target_user.organization_id is not None and not target_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Credit target user must be a supporter account",
            )
        target_user.credit_score = _apply_score_delta(target_user.credit_score, points)
        db.add(target_user)

    if target_type == CreditTargetType.organization:
        if target_organization_id is None or target_user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Organization credit event must target only an organization",
            )
        target_org = db.get(Organization, target_organization_id)
        if target_org is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credit target organization not found",
            )
        target_org.credit_score = _apply_score_delta(target_org.credit_score, points)
        db.add(target_org)

    event = CreditEvent(
        target_type=target_type,
        target_user_id=target_user_id,
        target_organization_id=target_organization_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        points=points,
        note=note,
        context=context or {},
    )
    db.add(event)
    return event


def list_supporter_credit_events(
    db: Session,
    supporter_id: UUID,
    *,
    limit: int = 50,
) -> list[CreditEvent]:
    stmt = (
        select(CreditEvent)
        .where(CreditEvent.target_user_id == supporter_id)
        .order_by(CreditEvent.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def list_organization_credit_events(
    db: Session,
    organization_id: UUID,
    *,
    limit: int = 50,
) -> list[CreditEvent]:
    stmt = (
        select(CreditEvent)
        .where(CreditEvent.target_organization_id == organization_id)
        .order_by(CreditEvent.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
