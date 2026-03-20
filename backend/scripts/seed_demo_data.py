from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.beneficiary import Beneficiary, BeneficiaryStatus
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
                "location": "Thu Duc, HCMC",
                "verified": True,
                "logo_url": "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=200&q=80",
            },
            {
                "name": "Green Sprout Network",
                "description": "Community-led healthcare and livelihood support initiatives.",
                "website": "https://greensprout.example.org",
                "location": "District 5, HCMC",
                "verified": True,
                "logo_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&q=80",
            },
        ]

        organizations: list[Organization] = []
        org_created_count = 0
        for entry in org_data:
            org, created = _get_or_create(db, Organization, name=entry["name"], defaults=entry)
            organizations.append(org)
            org_created_count += int(created)

        user_data = [
            {
                "email": "mai.giang@example.com",
                "full_name": "Mai Giang",
                "password": "Supporter@123",
                "location": "Thu Duc, HCMC",
                "support_types": ["donor_money", "volunteer"],
                "organization_id": None,
            },
            {
                "email": "nguyen.tuan@example.com",
                "full_name": "Nguyen Tuan",
                "password": "Supporter@123",
                "location": "District 1, HCMC",
                "support_types": ["donor_goods", "coordinator"],
                "organization_id": None,
            },
            {
                "email": "info@tomatorelief.org",
                "full_name": "Tomato Relief Network",
                "password": "Org@123456",
                "location": "Thu Duc, HCMC",
                "support_types": [],
                "organization_id": organizations[0].id,
            },
            {
                "email": "contact@communityaid.org",
                "full_name": "Community Aid Foundation",
                "password": "Org@123456",
                "location": "District 5, HCMC",
                "support_types": [],
                "organization_id": organizations[1].id,
            },
        ]

        users_by_email: dict[str, User] = {admin_user.email: admin_user}
        user_created_count = 0
        for entry in user_data:
            user, created = _get_or_create(
                db,
                User,
                email=entry["email"],
                defaults={
                    "full_name": entry["full_name"],
                    "hashed_password": get_password_hash(entry["password"]),
                    "location": entry["location"],
                    "support_types": entry["support_types"],
                    "organization_id": entry["organization_id"],
                    "is_superuser": False,
                    "is_active": True,
                },
            )
            users_by_email[user.email] = user
            user_created_count += int(created)

        campaigns_data = [
            {
                "title": "School Supplies for Rural Students",
                "slug": "school-supplies-rural-students",
                "organization_id": organizations[0].id,
                "description": "Raise funds for books, uniforms and digital kits.",
                "short_description": "Collect books, uniforms and digital kits for rural students.",
                "tags": ["education", "children"],
                "cover_image_url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80",
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
                "short_description": "Urgent treatment and post-care assistance for pediatric patients.",
                "tags": ["medical", "urgent"],
                "cover_image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80",
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
                "short_description": "Food and temporary shelter for flood-affected families.",
                "tags": ["flood", "emergency", "community"],
                "cover_image_url": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
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
                "location": "Chau Phu, An Giang",
                "category": "education",
                "story": "Needs tuition and school transport support.",
                "target_support_amount": Decimal("1200.00"),
                "is_verified": True,
                "status": BeneficiaryStatus.verified,
            },
            {
                "organization_id": organizations[0].id,
                "campaign_id": campaigns[2].id,
                "full_name": "Tran Thi Hoa",
                "location": "Tam Nong, Dong Thap",
                "category": "disaster_recovery",
                "story": "Home heavily damaged by seasonal floods.",
                "target_support_amount": Decimal("2500.00"),
                "is_verified": True,
                "status": BeneficiaryStatus.assigned,
            },
            {
                "organization_id": organizations[1].id,
                "campaign_id": campaigns[1].id,
                "full_name": "Le Quoc Bao",
                "location": "Ninh Kieu, Can Tho",
                "category": "medical",
                "story": "Pediatric surgery and aftercare support needed.",
                "target_support_amount": Decimal("5000.00"),
                "is_verified": True,
                "status": BeneficiaryStatus.verified,
            },
            {
                "organization_id": organizations[1].id,
                "campaign_id": campaigns[1].id,
                "full_name": "Pham Gia Linh",
                "location": "Ninh Kieu, Can Tho",
                "category": "medical",
                "story": "Long-term medication assistance program.",
                "target_support_amount": Decimal("3800.00"),
                "is_verified": False,
                "status": BeneficiaryStatus.added,
            },
            {
                "organization_id": organizations[0].id,
                "campaign_id": campaigns[0].id,
                "full_name": "Vo Thanh Dat",
                "location": "Chau Phu, An Giang",
                "category": "education",
                "story": "Needs laptop access for online high school classes.",
                "target_support_amount": Decimal("900.00"),
                "is_verified": True,
                "status": BeneficiaryStatus.received,
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
                "donor_user_id": users_by_email["mai.giang@example.com"].id,
                "donor_name": "Mai Giang",
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
                "donor_user_id": users_by_email["nguyen.tuan@example.com"].id,
                "donor_name": "Nguyen Tuan",
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
                "user_id": users_by_email["mai.giang@example.com"].id,
                "full_name": "Mai Giang",
                "email": "mai.giang@example.com",
                "phone_number": "+84-900-000-001",
                "message": "Coordinate volunteer schedules.",
                "status": VolunteerStatus.approved,
            },
            {
                "campaign_id": campaigns[2].id,
                "user_id": users_by_email["nguyen.tuan@example.com"].id,
                "full_name": "Nguyen Tuan",
                "email": "nguyen.tuan@example.com",
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
        print(f"Users created: {user_created_count}")
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
