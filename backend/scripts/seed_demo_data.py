from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.beneficiary import Beneficiary
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus


def _get_or_create(
    session: Session,
    model: type,
    defaults: dict | None = None,
    **filters,
):
    instance = session.scalar(select(model).filter_by(**filters))
    if instance:
        return instance, False

    payload = {**filters, **(defaults or {})}
    instance = model(**payload)
    session.add(instance)
    session.flush()
    return instance, True


def seed() -> None:
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        admin_user, admin_created = _get_or_create(
            db,
            User,
            email="admin@lotushack.local",
            defaults={
                "full_name": "System Admin",
                "hashed_password": get_password_hash("Admin@123456"),
                "is_superuser": True,
                "is_active": True,
            },
        )

        org_data = [
            {
                "name": "Lotus Relief Foundation",
                "description": "Emergency support and education grants for vulnerable families.",
                "website": "https://lotusrelief.example.org",
            },
            {
                "name": "Green Sprout Network",
                "description": "Community-led healthcare and livelihood support initiatives.",
                "website": "https://greensprout.example.org",
            },
        ]

        organizations: list[Organization] = []
        org_created_count = 0
        for entry in org_data:
            org, created = _get_or_create(db, Organization, name=entry["name"], defaults=entry)
            organizations.append(org)
            org_created_count += int(created)

        campaigns_data = [
            {
                "title": "School Supplies for Rural Students",
                "slug": "school-supplies-rural-students",
                "organization_id": organizations[0].id,
                "description": "Raise funds for books, uniforms and digital kits.",
                "goal_amount": Decimal("15000.00"),
                "raised_amount": Decimal("4800.00"),
                "support_types": [SupportType.money.value, SupportType.goods.value],
                "province": "An Giang",
                "district": "Chau Phu",
                "address_line": "Commune Hall, Chau Phu",
                "media_urls": [
                    "https://images.example.org/campaigns/school-supplies-cover.jpg",
                ],
                "starts_at": now - timedelta(days=20),
                "ends_at": now + timedelta(days=45),
                "is_active": True,
                "status": CampaignStatus.published,
                "published_at": now - timedelta(days=20),
            },
            {
                "title": "Medical Aid for Pediatric Patients",
                "slug": "medical-aid-pediatric-patients",
                "organization_id": organizations[1].id,
                "description": "Support critical treatment and post-care for children.",
                "goal_amount": Decimal("30000.00"),
                "raised_amount": Decimal("11200.00"),
                "support_types": [SupportType.money.value, SupportType.volunteer.value],
                "province": "Can Tho",
                "district": "Ninh Kieu",
                "address_line": "Pediatric Ward, Ninh Kieu",
                "media_urls": [
                    "https://images.example.org/campaigns/pediatric-aid-cover.jpg",
                ],
                "starts_at": now - timedelta(days=10),
                "ends_at": now + timedelta(days=60),
                "is_active": True,
                "status": CampaignStatus.published,
                "published_at": now - timedelta(days=10),
            },
            {
                "title": "Food and Shelter for Flood Victims",
                "slug": "food-shelter-flood-victims",
                "organization_id": organizations[0].id,
                "description": "Provide temporary shelter and food for displaced households.",
                "goal_amount": Decimal("25000.00"),
                "raised_amount": Decimal("9300.00"),
                "support_types": [SupportType.money.value, SupportType.goods.value],
                "province": "Dong Thap",
                "district": "Tam Nong",
                "address_line": "Temporary Shelter Point 2",
                "media_urls": [
                    "https://images.example.org/campaigns/flood-victims-cover.jpg",
                ],
                "starts_at": now - timedelta(days=7),
                "ends_at": now + timedelta(days=30),
                "is_active": True,
                "status": CampaignStatus.published,
                "published_at": now - timedelta(days=7),
            },
        ]

        campaigns: list[Campaign] = []
        campaign_created_count = 0
        for entry in campaigns_data:
            campaign, created = _get_or_create(
                db,
                Campaign,
                slug=entry["slug"],
                defaults=entry,
            )
            campaigns.append(campaign)
            campaign_created_count += int(created)

        beneficiary_data = [
            {
                "organization_id": organizations[0].id,
                "campaign_id": campaigns[0].id,
                "full_name": "Nguyen Minh An",
                "category": "education",
                "story": "Needs tuition and school transport support.",
                "target_support_amount": Decimal("1200.00"),
                "is_verified": True,
            },
            {
                "organization_id": organizations[0].id,
                "campaign_id": campaigns[2].id,
                "full_name": "Tran Thi Hoa",
                "category": "disaster_recovery",
                "story": "Home heavily damaged by seasonal floods.",
                "target_support_amount": Decimal("2500.00"),
                "is_verified": True,
            },
            {
                "organization_id": organizations[1].id,
                "campaign_id": campaigns[1].id,
                "full_name": "Le Quoc Bao",
                "category": "medical",
                "story": "Pediatric surgery and aftercare support needed.",
                "target_support_amount": Decimal("5000.00"),
                "is_verified": True,
            },
            {
                "organization_id": organizations[1].id,
                "campaign_id": campaigns[1].id,
                "full_name": "Pham Gia Linh",
                "category": "medical",
                "story": "Long-term medication assistance program.",
                "target_support_amount": Decimal("3800.00"),
                "is_verified": False,
            },
            {
                "organization_id": organizations[0].id,
                "campaign_id": campaigns[0].id,
                "full_name": "Vo Thanh Dat",
                "category": "education",
                "story": "Needs laptop access for online high school classes.",
                "target_support_amount": Decimal("900.00"),
                "is_verified": True,
            },
        ]

        beneficiary_created_count = 0
        for entry in beneficiary_data:
            _, created = _get_or_create(
                db,
                Beneficiary,
                full_name=entry["full_name"],
                organization_id=entry["organization_id"],
                defaults=entry,
            )
            beneficiary_created_count += int(created)

        donation_data = [
            {
                "campaign_id": campaigns[0].id,
                "donor_user_id": admin_user.id,
                "donor_name": "System Admin",
                "amount": Decimal("500.00"),
                "currency": "USD",
                "payment_method": "bank_transfer",
                "note": "Kick-off contribution",
                "donated_at": now - timedelta(days=5),
            },
            {
                "campaign_id": campaigns[1].id,
                "donor_user_id": None,
                "donor_name": "Anonymous Donor",
                "amount": Decimal("750.00"),
                "currency": "USD",
                "payment_method": "credit_card",
                "note": "For urgent treatment",
                "donated_at": now - timedelta(days=4),
            },
            {
                "campaign_id": campaigns[2].id,
                "donor_user_id": None,
                "donor_name": "Lan Nguyen",
                "amount": Decimal("250.00"),
                "currency": "USD",
                "payment_method": "e_wallet",
                "note": "Supporting flood response",
                "donated_at": now - timedelta(days=3),
            },
            {
                "campaign_id": campaigns[0].id,
                "donor_user_id": None,
                "donor_name": "GlobalCare Partner",
                "amount": Decimal("1800.00"),
                "currency": "USD",
                "payment_method": "bank_transfer",
                "note": "Corporate donation",
                "donated_at": now - timedelta(days=2),
            },
            {
                "campaign_id": campaigns[1].id,
                "donor_user_id": None,
                "donor_name": "Huy Tran",
                "amount": Decimal("320.00"),
                "currency": "USD",
                "payment_method": "credit_card",
                "note": "Hope this helps",
                "donated_at": now - timedelta(days=1),
            },
        ]

        donation_created_count = 0
        for entry in donation_data:
            _, created = _get_or_create(
                db,
                MonetaryDonation,
                campaign_id=entry["campaign_id"],
                donor_name=entry["donor_name"],
                amount=entry["amount"],
                defaults=entry,
            )
            donation_created_count += int(created)

        volunteer_data = [
            {
                "campaign_id": campaigns[0].id,
                "user_id": admin_user.id,
                "full_name": "System Admin",
                "email": "admin@lotushack.local",
                "phone_number": "+84-900-000-001",
                "message": "Coordinate volunteer schedules.",
                "status": VolunteerStatus.approved,
            },
            {
                "campaign_id": campaigns[2].id,
                "user_id": None,
                "full_name": "Minh Hoang",
                "email": "minh.hoang@example.org",
                "phone_number": "+84-900-000-002",
                "message": "Available on weekends for logistics.",
                "status": VolunteerStatus.pending,
            },
            {
                "campaign_id": campaigns[1].id,
                "user_id": None,
                "full_name": "Thao Le",
                "email": "thao.le@example.org",
                "phone_number": "+84-900-000-003",
                "message": "Medical background, ready for patient support.",
                "status": VolunteerStatus.pending,
            },
        ]

        volunteer_created_count = 0
        for entry in volunteer_data:
            _, created = _get_or_create(
                db,
                VolunteerRegistration,
                campaign_id=entry["campaign_id"],
                email=entry["email"],
                defaults=entry,
            )
            volunteer_created_count += int(created)

        db.commit()

        print("Seed completed.")
        print(f"Admin created: {int(admin_created)}")
        print(f"Organizations created: {org_created_count}")
        print(f"Campaigns created: {campaign_created_count}")
        print(f"Beneficiaries created: {beneficiary_created_count}")
        print(f"Donations created: {donation_created_count}")
        print(f"Volunteer registrations created: {volunteer_created_count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
