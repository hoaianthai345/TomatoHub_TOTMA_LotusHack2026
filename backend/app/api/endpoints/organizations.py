from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_superuser, get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationRead

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/", response_model=list[OrganizationRead])
def list_organizations(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[Organization]:
    stmt = select(Organization).order_by(Organization.created_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


@router.get("/{organization_id}", response_model=OrganizationRead)
def get_organization(organization_id: UUID, db: Session = Depends(get_db)) -> Organization:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


@router.post("/", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
) -> Organization:
    organization = Organization(
        name=payload.name.strip(),
        description=payload.description,
        website=payload.website,
        location=payload.location,
        logo_url=payload.logo_url,
        verified=False,
    )
    db.add(organization)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from None
    db.refresh(organization)
    return organization
