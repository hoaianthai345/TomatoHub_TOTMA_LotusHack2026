from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.beneficiary import Beneficiary, BeneficiaryStatus
from app.models.campaign import Campaign, CampaignStatus, SupportType
from app.models.campaign_checkpoint import CampaignCheckpoint, CheckpointType
from app.models.checkpoint_scan_log import (
    CheckpointScanLog,
    CheckpointScanResult,
    CheckpointScanType,
)
from app.models.goods_checkin import GoodsCheckin
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_attendance import VolunteerAttendance
from app.models.volunteer_registration import VolunteerRegistration, VolunteerStatus

SEED_REFERENCE_TIME = datetime(2026, 3, 21, 9, 0, tzinfo=timezone.utc)
SUPPORTER_DEFAULT_PASSWORD = "Supporter@123"
ORGANIZATION_DEFAULT_PASSWORD = "Org@123456"
ADMIN_PASSWORD = "Admin@123456"


@dataclass(slots=True)
class SeedStats:
    created: int = 0
    updated: int = 0

    def record(self, created: bool, updated: bool) -> None:
        self.created += int(created)
        self.updated += int(updated)


@dataclass(slots=True)
class SeedContext:
    organizations: dict[str, Organization]
    users_by_email: dict[str, User]
    campaigns: dict[str, Campaign]
    volunteer_checkpoints: dict[str, CampaignCheckpoint]
    goods_checkpoints: dict[str, CampaignCheckpoint]


def _upsert(
    session: Session,
    model: type[Any],
    *,
    lookup: dict[str, Any],
    values: dict[str, Any],
) -> tuple[Any, bool, bool]:
    instance = session.scalar(select(model).filter_by(**lookup))
    if instance is None:
        payload = {**lookup, **values}
        instance = model(**payload)
        session.add(instance)
        session.flush()
        return instance, True, False

    updated = False
    for field, value in values.items():
        if getattr(instance, field) != value:
            setattr(instance, field, value)
            updated = True

    if updated:
        session.add(instance)
        session.flush()

    return instance, False, updated


def _build_campaign_description(
    *,
    mission: str,
    beneficiary_scope: str,
    field_plan: list[str],
    volunteer_tasks: list[str],
    handover_rules: list[str],
) -> str:
    lines = [
        f"Mission: {mission}",
        "",
        f"Target beneficiaries: {beneficiary_scope}",
        "",
        "Field execution plan:",
    ]
    lines.extend(f"- {item}" for item in field_plan)
    lines.append("")
    lines.append("Volunteer responsibilities:")
    lines.extend(f"- {task}" for task in volunteer_tasks)
    lines.append("")
    lines.append("Check-out and evidence requirements:")
    lines.extend(f"- {rule}" for rule in handover_rules)
    return "\n".join(lines)


def _seed_admin_user(db: Session, stats: SeedStats) -> User:
    admin_user = db.scalar(select(User).where(User.email == "admin@lotushack.local"))
    if admin_user is None:
        admin_user = User(
            email="admin@lotushack.local",
            full_name="System Admin",
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            is_superuser=True,
            is_active=True,
            support_types=[],
            location="Ho Chi Minh City",
        )
        db.add(admin_user)
        db.flush()
        stats.record(created=True, updated=False)
        return admin_user

    updated = False
    if not admin_user.is_superuser:
        admin_user.is_superuser = True
        updated = True
    if not admin_user.is_active:
        admin_user.is_active = True
        updated = True
    if updated:
        db.add(admin_user)
        db.flush()
    stats.record(created=False, updated=updated)
    return admin_user


def _seed_organizations(db: Session, stats: SeedStats) -> dict[str, Organization]:
    organizations_data = [
        {
            "key": "lotus_relief",
            "name": "Lotus Relief Foundation",
            "description": (
                "Grassroots organization focused on emergency relief, student support, and "
                "transparent delivery reporting for low-income communities."
            ),
            "website": "https://lotusrelief.example.org",
            "location": "Thu Duc, Ho Chi Minh City",
            "verified": True,
            "logo_url": "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=200&q=80",
        },
        {
            "key": "green_sprout",
            "name": "Green Sprout Network",
            "description": (
                "Volunteer-first network coordinating hospital assistance, pediatric case support, "
                "and long-term family follow-up."
            ),
            "website": "https://greensprout.example.org",
            "location": "District 5, Ho Chi Minh City",
            "verified": True,
            "logo_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&q=80",
        },
        {
            "key": "mekong_care",
            "name": "Mekong Care Alliance",
            "description": (
                "Regional alliance delivering mobile clinics, clean water kits, and resilient "
                "livelihood recovery support in the Mekong Delta."
            ),
            "website": "https://mekongcare.example.org",
            "location": "Ninh Kieu, Can Tho",
            "verified": True,
            "logo_url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&q=80",
        },
    ]

    organizations: dict[str, Organization] = {}
    for payload in organizations_data:
        organization, created, updated = _upsert(
            db,
            Organization,
            lookup={"name": payload["name"]},
            values={
                "description": payload["description"],
                "website": payload["website"],
                "location": payload["location"],
                "verified": payload["verified"],
                "logo_url": payload["logo_url"],
            },
        )
        organizations[payload["key"]] = organization
        stats.record(created=created, updated=updated)

    return organizations


def _seed_users(
    db: Session,
    *,
    organizations: dict[str, Organization],
    stats: SeedStats,
) -> dict[str, User]:
    users_data = [
        {
            "email": "mai.giang@example.com",
            "full_name": "Mai Giang",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Thu Duc, Ho Chi Minh City",
            "support_types": ["donor_money", "volunteer"],
            "organization_id": None,
        },
        {
            "email": "nguyen.tuan@example.com",
            "full_name": "Nguyen Tuan",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "District 1, Ho Chi Minh City",
            "support_types": ["donor_goods", "coordinator"],
            "organization_id": None,
        },
        {
            "email": "pham.lananh@example.com",
            "full_name": "Pham Lan Anh",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Binh Thanh, Ho Chi Minh City",
            "support_types": ["donor_money", "donor_goods"],
            "organization_id": None,
        },
        {
            "email": "tran.quocminh@example.com",
            "full_name": "Tran Quoc Minh",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Go Vap, Ho Chi Minh City",
            "support_types": ["volunteer", "coordinator"],
            "organization_id": None,
        },
        {
            "email": "le.thanhha@example.com",
            "full_name": "Le Thanh Ha",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Ninh Kieu, Can Tho",
            "support_types": ["volunteer"],
            "organization_id": None,
        },
        {
            "email": "vo.ducphuc@example.com",
            "full_name": "Vo Duc Phuc",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Long Xuyen, An Giang",
            "support_types": ["donor_goods", "volunteer"],
            "organization_id": None,
        },
        {
            "email": "huynh.minhthu@example.com",
            "full_name": "Huynh Minh Thu",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Tam Nong, Dong Thap",
            "support_types": ["donor_money"],
            "organization_id": None,
        },
        {
            "email": "dao.khanhlinh@example.com",
            "full_name": "Dao Khanh Linh",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Thu Dau Mot, Binh Duong",
            "support_types": ["volunteer", "donor_money"],
            "organization_id": None,
        },
        {
            "email": "ngoc.bui@example.com",
            "full_name": "Ngoc Bui",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "Phu Nhuan, Ho Chi Minh City",
            "support_types": ["coordinator", "volunteer"],
            "organization_id": None,
        },
        {
            "email": "quang.le@example.com",
            "full_name": "Quang Le",
            "password": SUPPORTER_DEFAULT_PASSWORD,
            "location": "My Tho, Tien Giang",
            "support_types": ["donor_goods"],
            "organization_id": None,
        },
        {
            "email": "info@tomatorelief.org",
            "full_name": "Lotus Relief Operator",
            "password": ORGANIZATION_DEFAULT_PASSWORD,
            "location": "Thu Duc, Ho Chi Minh City",
            "support_types": [],
            "organization_id": organizations["lotus_relief"].id,
        },
        {
            "email": "contact@communityaid.org",
            "full_name": "Green Sprout Operator",
            "password": ORGANIZATION_DEFAULT_PASSWORD,
            "location": "District 5, Ho Chi Minh City",
            "support_types": [],
            "organization_id": organizations["green_sprout"].id,
        },
        {
            "email": "hello@mekongcare.org",
            "full_name": "Mekong Care Operator",
            "password": ORGANIZATION_DEFAULT_PASSWORD,
            "location": "Ninh Kieu, Can Tho",
            "support_types": [],
            "organization_id": organizations["mekong_care"].id,
        },
    ]

    users_by_email: dict[str, User] = {}
    for payload in users_data:
        existing = db.scalar(select(User).where(User.email == payload["email"]))
        if existing is None:
            user = User(
                email=payload["email"],
                full_name=payload["full_name"],
                hashed_password=get_password_hash(payload["password"]),
                location=payload["location"],
                support_types=payload["support_types"],
                organization_id=payload["organization_id"],
                is_superuser=False,
                is_active=True,
            )
            db.add(user)
            db.flush()
            stats.record(created=True, updated=False)
            users_by_email[user.email] = user
            continue

        updated = False
        for field in ("full_name", "location", "support_types", "organization_id"):
            if getattr(existing, field) != payload[field]:
                setattr(existing, field, payload[field])
                updated = True
        if not existing.is_active:
            existing.is_active = True
            updated = True

        if updated:
            db.add(existing)
            db.flush()
        stats.record(created=False, updated=updated)
        users_by_email[existing.email] = existing

    return users_by_email


def _seed_campaigns(
    db: Session,
    *,
    organizations: dict[str, Organization],
    stats: SeedStats,
) -> dict[str, Campaign]:
    campaigns_data = [
        {
            "key": "school_supplies",
            "slug": "school-supplies-rural-students",
            "organization_key": "lotus_relief",
            "title": "School Supplies for Rural Students",
            "short_description": "Books, uniforms, and digital kits for students in Chau Phu.",
            "description": _build_campaign_description(
                mission=(
                    "Keep 420 students in school through full-semester supplies and shared learning devices."
                ),
                beneficiary_scope=(
                    "Families in Chau Phu communes with household income below provincial minimum."
                ),
                field_plan=[
                    "Map students by grade and split into 4 delivery clusters.",
                    "Bundle school kits with a signed inventory sheet per beneficiary.",
                    "Run weekend parent sessions on digital safety and homework support.",
                ],
                volunteer_tasks=[
                    "Sort and label school kits by grade (2-hour warehouse shifts).",
                    "Support distribution desks and verify beneficiary handover signatures.",
                    "Photograph delivery evidence and upload after each shift.",
                ],
                handover_rules=[
                    "Every kit handover must have beneficiary signature + campaign QR log.",
                    "Open incidents (missing item, size mismatch) must be closed within 24h.",
                ],
            ),
            "tags": ["education", "children", "rural"],
            "cover_image_url": "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80",
            "goal_amount": Decimal("25000.00"),
            "support_types": [SupportType.money.value, SupportType.goods.value, SupportType.volunteer.value],
            "province": "An Giang",
            "district": "Chau Phu",
            "address_line": "Commune Hall, Chau Phu",
            "latitude": Decimal("10.626321"),
            "longitude": Decimal("105.182377"),
            "media_urls": [
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80",
                "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=34),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=46),
            "status": CampaignStatus.published,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=33),
            "closed_at": None,
            "is_active": True,
        },
        {
            "key": "pediatric_medical",
            "slug": "medical-aid-pediatric-patients",
            "organization_key": "green_sprout",
            "title": "Medical Aid for Pediatric Patients",
            "short_description": "Treatment and aftercare support for high-risk pediatric cases.",
            "description": _build_campaign_description(
                mission=(
                    "Fund emergency treatment, travel support, and aftercare supplies for pediatric patients."
                ),
                beneficiary_scope=(
                    "Children referred by partner hospitals in Can Tho with priority for urgent surgery cases."
                ),
                field_plan=[
                    "Screen applications weekly with hospital social workers.",
                    "Release treatment grants in milestone-based disbursements.",
                    "Track post-treatment medication adherence for 90 days.",
                ],
                volunteer_tasks=[
                    "Assist patient families in paperwork and hospital navigation.",
                    "Support medicine pick-up and delivery coordination.",
                    "Maintain confidential case notes in standardized format.",
                ],
                handover_rules=[
                    "Every disbursement requires hospital invoice and guardian confirmation.",
                    "Case closure report must include outcomes and remaining needs.",
                ],
            ),
            "tags": ["medical", "children", "urgent"],
            "cover_image_url": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80",
            "goal_amount": Decimal("60000.00"),
            "support_types": [SupportType.money.value, SupportType.volunteer.value],
            "province": "Can Tho",
            "district": "Ninh Kieu",
            "address_line": "Pediatric Ward, Ninh Kieu",
            "latitude": Decimal("10.030654"),
            "longitude": Decimal("105.768986"),
            "media_urls": [
                "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1200&q=80",
                "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=19),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=72),
            "status": CampaignStatus.published,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=18),
            "closed_at": None,
            "is_active": True,
        },
        {
            "key": "flood_relief",
            "slug": "food-shelter-flood-victims",
            "organization_key": "lotus_relief",
            "title": "Food and Shelter for Flood Victims",
            "short_description": "Food packs and temporary shelter reinforcement for flood-hit households.",
            "description": _build_campaign_description(
                mission="Stabilize 300 flood-affected households with food, shelter, and hygiene kits.",
                beneficiary_scope=(
                    "Families relocated to temporary zones in Tam Nong after seasonal flooding."
                ),
                field_plan=[
                    "Set up 3 rotating distribution points near relocation zones.",
                    "Deliver shelter repair kits prioritized by housing damage level.",
                    "Publish daily stock movement and beneficiary count.",
                ],
                volunteer_tasks=[
                    "Pack food kits by family size at logistics point.",
                    "Run check-in/check-out at each distribution checkpoint via QR.",
                    "Support elderly beneficiaries during line management and transport.",
                ],
                handover_rules=[
                    "Shelter materials require beneficiary photo evidence at handover.",
                    "Any stock discrepancy above 2 percent must be escalated the same day.",
                ],
            ),
            "tags": ["flood", "emergency", "community"],
            "cover_image_url": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
            "goal_amount": Decimal("42000.00"),
            "support_types": [SupportType.money.value, SupportType.goods.value, SupportType.volunteer.value],
            "province": "Dong Thap",
            "district": "Tam Nong",
            "address_line": "Temporary Shelter Point 2",
            "latitude": Decimal("10.694675"),
            "longitude": Decimal("105.535102"),
            "media_urls": [
                "https://images.unsplash.com/photo-1444212477490-ca407925329e?w=1200&q=80",
                "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=16),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=29),
            "status": CampaignStatus.published,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=15),
            "closed_at": None,
            "is_active": True,
        },
        {
            "key": "heat_relief",
            "slug": "heat-relief-binh-thanh-workers",
            "organization_key": "lotus_relief",
            "title": "Heat Relief Support for Binh Thanh Workers",
            "short_description": "Cooling stations and hydration kits for outdoor workers.",
            "description": _build_campaign_description(
                mission=(
                    "Reduce heat-related incidents among outdoor workers through hydration, shade, and meal support."
                ),
                beneficiary_scope=(
                    "Street cleaners, delivery riders, and construction workers in Wards 22 and 25."
                ),
                field_plan=[
                    "Deploy 6 hydration points from 5:00 to 12:00 daily.",
                    "Distribute cooling towels and oral rehydration packs.",
                    "Coordinate evening meal delivery for night shifts.",
                ],
                volunteer_tasks=[
                    "Manage morning hydration counters and replenish supplies.",
                    "Track inventory by QR goods check-in and close each shift report.",
                    "Document high-risk cases and refer to partner clinic.",
                ],
                handover_rules=[
                    "Each point must close with stock and attendance reconciliation.",
                    "Escalate medical red-flag cases to hotline within 15 minutes.",
                ],
            ),
            "tags": ["heat", "workers", "urban"],
            "cover_image_url": "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=1200&q=80",
            "goal_amount": Decimal("22000.00"),
            "support_types": [SupportType.money.value, SupportType.goods.value, SupportType.volunteer.value],
            "province": "Ho Chi Minh City",
            "district": "Binh Thanh",
            "address_line": "Worker Support Hub, Ward 22",
            "latitude": Decimal("10.808517"),
            "longitude": Decimal("106.709144"),
            "media_urls": [
                "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=80",
                "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&q=80&sat=-100",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=8),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=44),
            "status": CampaignStatus.published,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=7),
            "closed_at": None,
            "is_active": True,
        },
        {
            "key": "weekend_logistics",
            "slug": "weekend-logistics-hub-community-deliveries",
            "organization_key": "lotus_relief",
            "title": "Weekend Logistics Hub for Community Deliveries",
            "short_description": "Draft workflow for packing and last-mile community deliveries.",
            "description": _build_campaign_description(
                mission="Prepare a scalable weekend logistics pipeline for multi-campaign deliveries.",
                beneficiary_scope=(
                    "Cross-campaign support operation for 4 districts, currently in planning stage."
                ),
                field_plan=[
                    "Define inbound sorting lanes by item category.",
                    "Pilot route grouping with volunteer rider teams.",
                    "Test transparency dashboard integration for package-level visibility.",
                ],
                volunteer_tasks=[
                    "Warehouse sorting and route labeling.",
                    "Driver dispatch support and handover verification.",
                    "Exception tracking for missed or delayed deliveries.",
                ],
                handover_rules=[
                    "No delivery leaves without route manifest and checkpoint approval.",
                    "Pilot runs must log cycle time and bottleneck notes.",
                ],
            ),
            "tags": ["logistics", "draft", "operations"],
            "cover_image_url": "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&q=80",
            "goal_amount": Decimal("15000.00"),
            "support_types": [SupportType.goods.value, SupportType.volunteer.value],
            "province": "Ho Chi Minh City",
            "district": "Thu Duc",
            "address_line": "Shared Community Warehouse",
            "latitude": Decimal("10.846251"),
            "longitude": Decimal("106.801743"),
            "media_urls": [
                "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME + timedelta(days=12),
            "ends_at": None,
            "status": CampaignStatus.draft,
            "published_at": None,
            "closed_at": None,
            "is_active": False,
        },
        {
            "key": "mobile_clinic",
            "slug": "mobile-clinic-mekong-delta",
            "organization_key": "mekong_care",
            "title": "Mobile Clinic Rotation for Mekong Delta",
            "short_description": "Monthly mobile clinic services for remote riverside communes.",
            "description": _build_campaign_description(
                mission=(
                    "Deliver preventive screening and chronic care follow-up through rotating mobile clinic days."
                ),
                beneficiary_scope=(
                    "Elderly and chronic-condition patients in riverside areas with limited transport access."
                ),
                field_plan=[
                    "Run 8 clinic days per month across 4 communes.",
                    "Bundle medicine support with adherence monitoring.",
                    "Coordinate referrals to district hospitals when needed.",
                ],
                volunteer_tasks=[
                    "Patient queue management and triage form preparation.",
                    "Medication packaging and counseling support.",
                    "Data entry for anonymized outcome tracking.",
                ],
                handover_rules=[
                    "All medicine handovers must map to patient ID and dosage log.",
                    "Referral records must include transport and caregiver contact.",
                ],
            ),
            "tags": ["medical", "rural", "mobile-clinic"],
            "cover_image_url": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&q=80",
            "goal_amount": Decimal("50000.00"),
            "support_types": [SupportType.money.value, SupportType.volunteer.value],
            "province": "Can Tho",
            "district": "Thoi Lai",
            "address_line": "Mekong Outreach Coordination Point",
            "latitude": Decimal("10.073111"),
            "longitude": Decimal("105.551847"),
            "media_urls": [
                "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1200&q=80",
                "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=24),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=96),
            "status": CampaignStatus.published,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=23),
            "closed_at": None,
            "is_active": True,
        },
        {
            "key": "clean_water",
            "slug": "clean-water-post-flood",
            "organization_key": "mekong_care",
            "title": "Clean Water Access Post Flood",
            "short_description": "Closed campaign for emergency water filters and sanitation kits.",
            "description": _build_campaign_description(
                mission="Restore household clean water access after flood contamination events.",
                beneficiary_scope=(
                    "Rural communities with water quality levels below safe threshold after peak flooding."
                ),
                field_plan=[
                    "Deploy water filter kits with household-level usage training.",
                    "Provide sanitation packs for children and elderly care points.",
                    "Run follow-up water quality checks every 2 weeks.",
                ],
                volunteer_tasks=[
                    "Assist filter installation and usage demonstrations.",
                    "Collect pre/post installation water test evidence.",
                    "Support beneficiary follow-up interviews.",
                ],
                handover_rules=[
                    "Each filter delivery requires installation photo and beneficiary confirmation.",
                    "Campaign close-out includes water test summary by commune.",
                ],
            ),
            "tags": ["water", "flood", "closed"],
            "cover_image_url": "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=1200&q=80",
            "goal_amount": Decimal("30000.00"),
            "support_types": [SupportType.money.value, SupportType.goods.value, SupportType.volunteer.value],
            "province": "Vinh Long",
            "district": "Tra On",
            "address_line": "Community Water Point, Tra On",
            "latitude": Decimal("10.241365"),
            "longitude": Decimal("105.944520"),
            "media_urls": [
                "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=80",
                "https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=1200&q=80",
            ],
            "starts_at": SEED_REFERENCE_TIME - timedelta(days=110),
            "ends_at": SEED_REFERENCE_TIME - timedelta(days=30),
            "status": CampaignStatus.closed,
            "published_at": SEED_REFERENCE_TIME - timedelta(days=108),
            "closed_at": SEED_REFERENCE_TIME - timedelta(days=28),
            "is_active": False,
        },
        {
            "key": "stem_scholarship",
            "slug": "scholarship-girls-stem",
            "organization_key": "green_sprout",
            "title": "Girls in STEM Scholarship Pipeline",
            "short_description": "Scholarship planning campaign for high-school girls in STEM tracks.",
            "description": _build_campaign_description(
                mission=(
                    "Build a scholarship and mentorship track for girls entering STEM-focused high schools."
                ),
                beneficiary_scope=(
                    "Grade 9 students from low-income households with strong STEM placement potential."
                ),
                field_plan=[
                    "Partner with schools for candidate nomination pipeline.",
                    "Design scholarship rubric and mentor matching process.",
                    "Prepare annual transparency report template before launch.",
                ],
                volunteer_tasks=[
                    "Student interview scheduling and family outreach.",
                    "Mentor onboarding support and orientation logistics.",
                    "Documentation quality check for applicant profiles.",
                ],
                handover_rules=[
                    "Scholarship committee review notes must be archived per applicant.",
                    "No disbursement before guardian consent and school verification.",
                ],
            ),
            "tags": ["education", "stem", "draft"],
            "cover_image_url": None,
            "goal_amount": Decimal("28000.00"),
            "support_types": [SupportType.money.value, SupportType.volunteer.value],
            "province": "Can Tho",
            "district": "Binh Thuy",
            "address_line": "Education Partnership Hub, Binh Thuy",
            "latitude": Decimal("10.070593"),
            "longitude": Decimal("105.732661"),
            "media_urls": [],
            "starts_at": SEED_REFERENCE_TIME + timedelta(days=20),
            "ends_at": SEED_REFERENCE_TIME + timedelta(days=180),
            "status": CampaignStatus.draft,
            "published_at": None,
            "closed_at": None,
            "is_active": False,
        },
    ]

    campaigns: dict[str, Campaign] = {}
    for payload in campaigns_data:
        organization = organizations[payload["organization_key"]]
        campaign, created, updated = _upsert(
            db,
            Campaign,
            lookup={"slug": payload["slug"]},
            values={
                "organization_id": organization.id,
                "title": payload["title"],
                "short_description": payload["short_description"],
                "description": payload["description"],
                "tags": payload["tags"],
                "cover_image_url": payload["cover_image_url"],
                "goal_amount": payload["goal_amount"],
                "support_types": payload["support_types"],
                "province": payload["province"],
                "district": payload["district"],
                "address_line": payload["address_line"],
                "latitude": payload["latitude"],
                "longitude": payload["longitude"],
                "media_urls": payload["media_urls"],
                "starts_at": payload["starts_at"],
                "ends_at": payload["ends_at"],
                "status": payload["status"],
                "published_at": payload["published_at"],
                "closed_at": payload["closed_at"],
                "is_active": payload["is_active"],
            },
        )
        campaigns[payload["key"]] = campaign
        stats.record(created=created, updated=updated)

    return campaigns


def _seed_beneficiaries(
    db: Session,
    *,
    organizations: dict[str, Organization],
    campaigns: dict[str, Campaign],
    stats: SeedStats,
) -> None:
    beneficiaries_data = [
        {
            "full_name": "Nguyen Minh An",
            "organization_key": "lotus_relief",
            "campaign_key": "school_supplies",
            "location": "Chau Phu, An Giang",
            "category": "education",
            "story": "Single-parent household, needs semester books and transportation support.",
            "target_support_amount": Decimal("1450.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.verified,
        },
        {
            "full_name": "Vo Thanh Dat",
            "organization_key": "lotus_relief",
            "campaign_key": "school_supplies",
            "location": "Chau Phu, An Giang",
            "category": "education",
            "story": "Needs second-hand laptop and uniform kit to continue grade 10 classes.",
            "target_support_amount": Decimal("1250.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
        {
            "full_name": "Le Thi Nhu Y",
            "organization_key": "lotus_relief",
            "campaign_key": "school_supplies",
            "location": "Tan Chau, An Giang",
            "category": "education",
            "story": "Family relocated for seasonal work, student at risk of dropping out.",
            "target_support_amount": Decimal("980.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.assigned,
        },
        {
            "full_name": "Tran Thi Hoa",
            "organization_key": "lotus_relief",
            "campaign_key": "flood_relief",
            "location": "Tam Nong, Dong Thap",
            "category": "disaster_recovery",
            "story": "Flood damaged home roof and cooking area; temporary shelter support needed.",
            "target_support_amount": Decimal("3200.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.assigned,
        },
        {
            "full_name": "Pham Van Long",
            "organization_key": "lotus_relief",
            "campaign_key": "flood_relief",
            "location": "Tam Nong, Dong Thap",
            "category": "disaster_recovery",
            "story": "Elderly couple needing monthly food and sanitation support package.",
            "target_support_amount": Decimal("1900.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
        {
            "full_name": "Nguyen Thi Cam",
            "organization_key": "lotus_relief",
            "campaign_key": "flood_relief",
            "location": "Hong Ngu, Dong Thap",
            "category": "disaster_recovery",
            "story": "Livelihood assets lost after flood; needs short-term recovery support.",
            "target_support_amount": Decimal("2800.00"),
            "is_verified": False,
            "status": BeneficiaryStatus.added,
        },
        {
            "full_name": "Do Thi Kim Ngan",
            "organization_key": "lotus_relief",
            "campaign_key": "heat_relief",
            "location": "Binh Thanh, Ho Chi Minh City",
            "category": "heat_relief",
            "story": "Outdoor sanitation worker with repeated heat exhaustion incidents.",
            "target_support_amount": Decimal("1400.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.verified,
        },
        {
            "full_name": "Vu Hoang Son",
            "organization_key": "lotus_relief",
            "campaign_key": "heat_relief",
            "location": "Binh Thanh, Ho Chi Minh City",
            "category": "heat_relief",
            "story": "Night-shift construction worker requiring hydration and meal support.",
            "target_support_amount": Decimal("900.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
        {
            "full_name": "Le Quoc Bao",
            "organization_key": "green_sprout",
            "campaign_key": "pediatric_medical",
            "location": "Ninh Kieu, Can Tho",
            "category": "medical",
            "story": "Requires pediatric surgery and 3-month post-op medicine support.",
            "target_support_amount": Decimal("7200.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.verified,
        },
        {
            "full_name": "Pham Gia Linh",
            "organization_key": "green_sprout",
            "campaign_key": "pediatric_medical",
            "location": "Ninh Kieu, Can Tho",
            "category": "medical",
            "story": "Long-term respiratory treatment with high monthly medication costs.",
            "target_support_amount": Decimal("5600.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.assigned,
        },
        {
            "full_name": "Huynh Anh Kiet",
            "organization_key": "green_sprout",
            "campaign_key": "pediatric_medical",
            "location": "Thot Not, Can Tho",
            "category": "medical",
            "story": "Needs travel and lodging support for bi-weekly hospital visits.",
            "target_support_amount": Decimal("3100.00"),
            "is_verified": False,
            "status": BeneficiaryStatus.added,
        },
        {
            "full_name": "Tran Nhat Vy",
            "organization_key": "green_sprout",
            "campaign_key": "stem_scholarship",
            "location": "Binh Thuy, Can Tho",
            "category": "education",
            "story": "Top STEM track candidate awaiting scholarship committee review.",
            "target_support_amount": Decimal("2600.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.added,
        },
        {
            "full_name": "Dinh Van Tuan",
            "organization_key": "mekong_care",
            "campaign_key": "mobile_clinic",
            "location": "Thoi Lai, Can Tho",
            "category": "medical",
            "story": "Chronic hypertension case requiring routine screening and medicine support.",
            "target_support_amount": Decimal("1800.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.assigned,
        },
        {
            "full_name": "Nguyen Thi Bich",
            "organization_key": "mekong_care",
            "campaign_key": "mobile_clinic",
            "location": "Co Do, Can Tho",
            "category": "medical",
            "story": "Elderly patient with diabetes requiring monthly follow-up.",
            "target_support_amount": Decimal("2100.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
        {
            "full_name": "Tran Van Duy",
            "organization_key": "mekong_care",
            "campaign_key": "clean_water",
            "location": "Tra On, Vinh Long",
            "category": "water_access",
            "story": "Family in flood-impacted zone requiring filter replacement and hygiene packs.",
            "target_support_amount": Decimal("1300.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
        {
            "full_name": "Phan Thi Loan",
            "organization_key": "mekong_care",
            "campaign_key": "clean_water",
            "location": "Tra On, Vinh Long",
            "category": "water_access",
            "story": "Household with infants prioritized for clean water interventions.",
            "target_support_amount": Decimal("1100.00"),
            "is_verified": True,
            "status": BeneficiaryStatus.received,
        },
    ]

    for payload in beneficiaries_data:
        organization = organizations[payload["organization_key"]]
        campaign = campaigns[payload["campaign_key"]]
        _, created, updated = _upsert(
            db,
            Beneficiary,
            lookup={
                "organization_id": organization.id,
                "full_name": payload["full_name"],
            },
            values={
                "campaign_id": campaign.id,
                "location": payload["location"],
                "category": payload["category"],
                "story": payload["story"],
                "target_support_amount": payload["target_support_amount"],
                "is_verified": payload["is_verified"],
                "status": payload["status"],
            },
        )
        stats.record(created=created, updated=updated)


def _seed_donations(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    users_by_email: dict[str, User],
    stats: SeedStats,
) -> None:
    donations_data = [
        {
            "campaign_key": "school_supplies",
            "donor_email": "mai.giang@example.com",
            "donor_name": "Mai Giang",
            "amount": Decimal("1200.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Term-1 kit sponsorship",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=20, hours=2),
        },
        {
            "campaign_key": "school_supplies",
            "donor_email": "pham.lananh@example.com",
            "donor_name": "Pham Lan Anh",
            "amount": Decimal("1700.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Laptop sharing fund",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=15, hours=5),
        },
        {
            "campaign_key": "school_supplies",
            "donor_email": None,
            "donor_name": "Rural Parent Circle",
            "amount": Decimal("2500.00"),
            "currency": "VND",
            "payment_method": "e_wallet",
            "note": "Collective class support",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=12, hours=3),
        },
        {
            "campaign_key": "school_supplies",
            "donor_email": "vo.ducphuc@example.com",
            "donor_name": "Vo Duc Phuc",
            "amount": Decimal("900.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Uniform kits",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=9, hours=6),
        },
        {
            "campaign_key": "school_supplies",
            "donor_email": None,
            "donor_name": "Saigon Learning Club",
            "amount": Decimal("4600.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Digital learning devices",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=7, hours=2),
        },
        {
            "campaign_key": "school_supplies",
            "donor_email": "huynh.minhthu@example.com",
            "donor_name": "Huynh Minh Thu",
            "amount": Decimal("1100.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Exam season support",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=3, hours=18),
        },
        {
            "campaign_key": "pediatric_medical",
            "donor_email": None,
            "donor_name": "Anonymous Donor",
            "amount": Decimal("3200.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Urgent surgery assistance",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=17, hours=7),
        },
        {
            "campaign_key": "pediatric_medical",
            "donor_email": "pham.lananh@example.com",
            "donor_name": "Pham Lan Anh",
            "amount": Decimal("2800.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Aftercare medicine package",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=13, hours=10),
        },
        {
            "campaign_key": "pediatric_medical",
            "donor_email": None,
            "donor_name": "CareBridge Sponsor",
            "amount": Decimal("7600.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Hospital social work fund",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=10, hours=8),
        },
        {
            "campaign_key": "pediatric_medical",
            "donor_email": "dao.khanhlinh@example.com",
            "donor_name": "Dao Khanh Linh",
            "amount": Decimal("1250.00"),
            "currency": "VND",
            "payment_method": "e_wallet",
            "note": "Transport and lodging",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=8, hours=9),
        },
        {
            "campaign_key": "pediatric_medical",
            "donor_email": None,
            "donor_name": "Pediatric Hope Fund",
            "amount": Decimal("9500.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Critical case reserve",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=5, hours=12),
        },
        {
            "campaign_key": "flood_relief",
            "donor_email": "nguyen.tuan@example.com",
            "donor_name": "Nguyen Tuan",
            "amount": Decimal("1400.00"),
            "currency": "VND",
            "payment_method": "e_wallet",
            "note": "Emergency food packs",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=14, hours=4),
        },
        {
            "campaign_key": "flood_relief",
            "donor_email": None,
            "donor_name": "Community Pantry",
            "amount": Decimal("4200.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Bulk staple foods",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=11, hours=6),
        },
        {
            "campaign_key": "flood_relief",
            "donor_email": "quang.le@example.com",
            "donor_name": "Quang Le",
            "amount": Decimal("800.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Shelter tarp support",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=9, hours=3),
        },
        {
            "campaign_key": "flood_relief",
            "donor_email": None,
            "donor_name": "Rainy Season Fund",
            "amount": Decimal("5300.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Family shelter kits",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=6, hours=2),
        },
        {
            "campaign_key": "flood_relief",
            "donor_email": "mai.giang@example.com",
            "donor_name": "Mai Giang",
            "amount": Decimal("900.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Hygiene pack support",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=2, hours=14),
        },
        {
            "campaign_key": "heat_relief",
            "donor_email": "mai.giang@example.com",
            "donor_name": "Mai Giang",
            "amount": Decimal("1000.00"),
            "currency": "VND",
            "payment_method": "e_wallet",
            "note": "Hydration station kickoff",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=7, hours=13),
        },
        {
            "campaign_key": "heat_relief",
            "donor_email": "nguyen.tuan@example.com",
            "donor_name": "Nguyen Tuan",
            "amount": Decimal("1500.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Cooling towels and ice packs",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=6, hours=16),
        },
        {
            "campaign_key": "heat_relief",
            "donor_email": None,
            "donor_name": "Saigon Food Lab",
            "amount": Decimal("2800.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Night-shift meal boxes",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=4, hours=9),
        },
        {
            "campaign_key": "heat_relief",
            "donor_email": None,
            "donor_name": "Local Business Guild",
            "amount": Decimal("3200.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Monthly heat relief pool",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=2, hours=9),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_email": "le.thanhha@example.com",
            "donor_name": "Le Thanh Ha",
            "amount": Decimal("1600.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Clinic day medicine fund",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=18, hours=5),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_email": None,
            "donor_name": "Mekong River Logistics",
            "amount": Decimal("4500.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Boat transport subsidy",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=15, hours=4),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_email": "ngoc.bui@example.com",
            "donor_name": "Ngoc Bui",
            "amount": Decimal("1200.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Elderly screening support",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=11, hours=10),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_email": None,
            "donor_name": "Delta Health Circle",
            "amount": Decimal("6000.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Quarterly clinic rotation",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=7, hours=11),
        },
        {
            "campaign_key": "clean_water",
            "donor_email": None,
            "donor_name": "WaterSafe Vietnam",
            "amount": Decimal("7200.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Filter kit procurement",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=100, hours=6),
        },
        {
            "campaign_key": "clean_water",
            "donor_email": "huynh.minhthu@example.com",
            "donor_name": "Huynh Minh Thu",
            "amount": Decimal("950.00"),
            "currency": "VND",
            "payment_method": "credit_card",
            "note": "Hygiene support for children",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=88, hours=4),
        },
        {
            "campaign_key": "clean_water",
            "donor_email": None,
            "donor_name": "River Community Council",
            "amount": Decimal("5300.00"),
            "currency": "VND",
            "payment_method": "bank_transfer",
            "note": "Water testing and replacement",
            "donated_at": SEED_REFERENCE_TIME - timedelta(days=67, hours=9),
        },
    ]

    for payload in donations_data:
        campaign = campaigns[payload["campaign_key"]]
        donor_user = users_by_email.get(payload["donor_email"]) if payload["donor_email"] else None

        _, created, updated = _upsert(
            db,
            MonetaryDonation,
            lookup={
                "campaign_id": campaign.id,
                "donor_name": payload["donor_name"],
                "note": payload["note"],
            },
            values={
                "donor_user_id": donor_user.id if donor_user is not None else None,
                "amount": payload["amount"],
                "currency": payload["currency"],
                "payment_method": payload["payment_method"],
                "donated_at": payload["donated_at"],
            },
        )
        stats.record(created=created, updated=updated)

    # Keep campaign totals consistent with the seeded donation ledger.
    for campaign in campaigns.values():
        running_total = sum(
            (
                donation.amount
                for donation in db.scalars(
                    select(MonetaryDonation).where(MonetaryDonation.campaign_id == campaign.id)
                ).all()
            ),
            start=Decimal("0.00"),
        )
        if campaign.raised_amount != running_total:
            campaign.raised_amount = running_total
            db.add(campaign)


def _seed_volunteer_registrations(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    users_by_email: dict[str, User],
    stats: SeedStats,
) -> None:
    registrations_data = [
        {
            "campaign_key": "school_supplies",
            "user_email": "mai.giang@example.com",
            "full_name": "Mai Giang",
            "email": "mai.giang@example.com",
            "phone_number": "+84-900-000-001",
            "message": (
                "Can coordinate classroom-by-classroom handover, verify signatures, and close QR check-out logs."
            ),
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=22),
        },
        {
            "campaign_key": "school_supplies",
            "user_email": "tran.quocminh@example.com",
            "full_name": "Tran Quoc Minh",
            "email": "tran.quocminh@example.com",
            "phone_number": "+84-900-000-004",
            "message": "Available for warehouse packing, dispatch loading, and on-site parent support.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=20),
        },
        {
            "campaign_key": "school_supplies",
            "user_email": "ngoc.bui@example.com",
            "full_name": "Ngoc Bui",
            "email": "ngoc.bui@example.com",
            "phone_number": "+84-900-000-009",
            "message": "Can manage route board and shift attendance reconciliation.",
            "status": VolunteerStatus.pending,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=6),
        },
        {
            "campaign_key": "pediatric_medical",
            "user_email": "tran.quocminh@example.com",
            "full_name": "Tran Quoc Minh",
            "email": "tran.quocminh@example.com",
            "phone_number": "+84-900-000-004",
            "message": (
                "Medical logistics support: transport scheduling, medicine pickup tracking, and guardian assistance."
            ),
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=16),
        },
        {
            "campaign_key": "pediatric_medical",
            "user_email": "le.thanhha@example.com",
            "full_name": "Le Thanh Ha",
            "email": "le.thanhha@example.com",
            "phone_number": "+84-900-000-005",
            "message": "Nursing student, can support patient intake and basic triage documentation.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=15),
        },
        {
            "campaign_key": "pediatric_medical",
            "user_email": None,
            "full_name": "Thao Le",
            "email": "thao.le@example.org",
            "phone_number": "+84-900-000-003",
            "message": "Weekend volunteer for family guidance desk.",
            "status": VolunteerStatus.pending,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=9),
        },
        {
            "campaign_key": "flood_relief",
            "user_email": "nguyen.tuan@example.com",
            "full_name": "Nguyen Tuan",
            "email": "nguyen.tuan@example.com",
            "phone_number": "+84-900-000-002",
            "message": "Can run goods sorting and checkpoint ledger with QR scanning.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=13),
        },
        {
            "campaign_key": "flood_relief",
            "user_email": "vo.ducphuc@example.com",
            "full_name": "Vo Duc Phuc",
            "email": "vo.ducphuc@example.com",
            "phone_number": "+84-900-000-006",
            "message": "Can provide boat transport coordination in flooded routes.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=11),
        },
        {
            "campaign_key": "flood_relief",
            "user_email": "quang.le@example.com",
            "full_name": "Quang Le",
            "email": "quang.le@example.com",
            "phone_number": "+84-900-000-010",
            "message": "Can support family kit delivery and beneficiary confirmation forms.",
            "status": VolunteerStatus.cancelled,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=5),
        },
        {
            "campaign_key": "heat_relief",
            "user_email": "mai.giang@example.com",
            "full_name": "Mai Giang",
            "email": "mai.giang@example.com",
            "phone_number": "+84-900-000-001",
            "message": "Available for 5am hydration station setup and stock reconciliation.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=8),
        },
        {
            "campaign_key": "heat_relief",
            "user_email": "pham.lananh@example.com",
            "full_name": "Pham Lan Anh",
            "email": "pham.lananh@example.com",
            "phone_number": "+84-900-000-007",
            "message": "Can handle worker interviews and risk flag documentation.",
            "status": VolunteerStatus.pending,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=6),
        },
        {
            "campaign_key": "heat_relief",
            "user_email": None,
            "full_name": "Linh Bui",
            "email": "linh.bui@example.org",
            "phone_number": "+84-900-000-008",
            "message": "Can help evening meal route and goods intake.",
            "status": VolunteerStatus.rejected,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=4),
        },
        {
            "campaign_key": "mobile_clinic",
            "user_email": "le.thanhha@example.com",
            "full_name": "Le Thanh Ha",
            "email": "le.thanhha@example.com",
            "phone_number": "+84-900-000-005",
            "message": "Can support chronic care follow-up desk during mobile clinic days.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=18),
        },
        {
            "campaign_key": "mobile_clinic",
            "user_email": "dao.khanhlinh@example.com",
            "full_name": "Dao Khanh Linh",
            "email": "dao.khanhlinh@example.com",
            "phone_number": "+84-900-000-011",
            "message": "Can run medicine distribution and post-visit records.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=14),
        },
        {
            "campaign_key": "mobile_clinic",
            "user_email": None,
            "full_name": "Khoa Tran",
            "email": "khoa.tran@example.org",
            "phone_number": "+84-900-000-012",
            "message": "Available for registration desk and translation support.",
            "status": VolunteerStatus.pending,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=10),
        },
        {
            "campaign_key": "clean_water",
            "user_email": "vo.ducphuc@example.com",
            "full_name": "Vo Duc Phuc",
            "email": "vo.ducphuc@example.com",
            "phone_number": "+84-900-000-006",
            "message": "Experienced in household filter installation and maintenance training.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=96),
        },
        {
            "campaign_key": "clean_water",
            "user_email": None,
            "full_name": "An Pham",
            "email": "an.pham@example.org",
            "phone_number": "+84-900-000-013",
            "message": "Can support field surveys and beneficiary follow-up.",
            "status": VolunteerStatus.approved,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=91),
        },
        {
            "campaign_key": "weekend_logistics",
            "user_email": "ngoc.bui@example.com",
            "full_name": "Ngoc Bui",
            "email": "ngoc.bui@example.com",
            "phone_number": "+84-900-000-009",
            "message": "Interested in pilot logistics route optimization and shift planning.",
            "status": VolunteerStatus.pending,
            "registered_at": SEED_REFERENCE_TIME - timedelta(days=1),
        },
    ]

    for payload in registrations_data:
        campaign = campaigns[payload["campaign_key"]]
        user = users_by_email.get(payload["user_email"]) if payload["user_email"] else None

        if user is not None:
            lookup = {
                "campaign_id": campaign.id,
                "user_id": user.id,
            }
        else:
            lookup = {
                "campaign_id": campaign.id,
                "email": payload["email"],
            }

        _, created, updated = _upsert(
            db,
            VolunteerRegistration,
            lookup=lookup,
            values={
                "user_id": user.id if user is not None else None,
                "full_name": payload["full_name"],
                "email": payload["email"],
                "phone_number": payload["phone_number"],
                "message": payload["message"],
                "status": payload["status"],
                "registered_at": payload["registered_at"],
            },
        )
        stats.record(created=created, updated=updated)


def _seed_campaign_checkpoints(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    stats: SeedStats,
) -> tuple[dict[str, CampaignCheckpoint], dict[str, CampaignCheckpoint]]:
    checkpoint_rows: list[dict[str, Any]] = []
    for campaign_key, campaign in campaigns.items():
        if campaign.status == CampaignStatus.draft:
            continue

        lat = campaign.latitude
        lon = campaign.longitude
        if lat is None:
            lat = Decimal("10.000000")
        if lon is None:
            lon = Decimal("106.000000")

        checkpoint_rows.extend(
            [
                {
                    "code": f"{campaign_key}:volunteer_hub",
                    "campaign_id": campaign.id,
                    "organization_id": campaign.organization_id,
                    "name": "Volunteer Check-in Hub",
                    "checkpoint_type": CheckpointType.volunteer.value,
                    "description": (
                        "Primary volunteer attendance point. Volunteers must scan check-in before shift and "
                        "scan check-out after handover."
                    ),
                    "address_line": campaign.address_line,
                    "latitude": lat,
                    "longitude": lon,
                    "is_active": True,
                },
                {
                    "code": f"{campaign_key}:goods_dock",
                    "campaign_id": campaign.id,
                    "organization_id": campaign.organization_id,
                    "name": "Goods Receiving Dock",
                    "checkpoint_type": CheckpointType.goods.value,
                    "description": (
                        "Goods intake point for in-kind donations. Each delivery requires itemized record and "
                        "condition note."
                    ),
                    "address_line": campaign.address_line,
                    "latitude": lat + Decimal("0.001200"),
                    "longitude": lon + Decimal("0.001100"),
                    "is_active": campaign.status != CampaignStatus.closed,
                },
            ]
        )

    volunteer_checkpoints: dict[str, CampaignCheckpoint] = {}
    goods_checkpoints: dict[str, CampaignCheckpoint] = {}

    for row in checkpoint_rows:
        checkpoint, created, updated = _upsert(
            db,
            CampaignCheckpoint,
            lookup={
                "campaign_id": row["campaign_id"],
                "name": row["name"],
            },
            values={
                "organization_id": row["organization_id"],
                "checkpoint_type": row["checkpoint_type"],
                "description": row["description"],
                "address_line": row["address_line"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "is_active": row["is_active"],
            },
        )
        stats.record(created=created, updated=updated)

        if row["checkpoint_type"] == CheckpointType.volunteer.value:
            volunteer_checkpoints[row["code"].split(":")[0]] = checkpoint
        else:
            goods_checkpoints[row["code"].split(":")[0]] = checkpoint

    return volunteer_checkpoints, goods_checkpoints


def _seed_volunteer_attendances(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    volunteer_checkpoints: dict[str, CampaignCheckpoint],
    stats: SeedStats,
) -> None:
    campaign_key_by_id = {campaign.id: key for key, campaign in campaigns.items()}

    approved_linked_regs = db.scalars(
        select(VolunteerRegistration).where(
            VolunteerRegistration.status == VolunteerStatus.approved,
            VolunteerRegistration.user_id.is_not(None),
        )
    ).all()

    for index, registration in enumerate(approved_linked_regs, start=1):
        campaign_key = campaign_key_by_id.get(registration.campaign_id)
        if campaign_key is None:
            continue
        checkpoint = volunteer_checkpoints.get(campaign_key)
        if checkpoint is None:
            continue

        check_in_at = registration.registered_at + timedelta(days=2 + (index % 4), hours=2)
        is_open_session = index % 5 == 0
        check_out_at = None
        duration_minutes: int | None = None
        if not is_open_session:
            duration_minutes = 150 + (index % 4) * 35
            check_out_at = check_in_at + timedelta(minutes=duration_minutes)

        _, created, updated = _upsert(
            db,
            VolunteerAttendance,
            lookup={
                "registration_id": registration.id,
                "checkpoint_id": checkpoint.id,
                "check_in_at": check_in_at,
            },
            values={
                "campaign_id": registration.campaign_id,
                "user_id": registration.user_id,
                "check_out_at": check_out_at,
                "duration_minutes": duration_minutes,
            },
        )
        stats.record(created=created, updated=updated)


def _seed_goods_checkins(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    goods_checkpoints: dict[str, CampaignCheckpoint],
    users_by_email: dict[str, User],
    stats: SeedStats,
) -> None:
    goods_data = [
        {
            "campaign_key": "school_supplies",
            "donor_name": "Vo Duc Phuc",
            "user_email": "vo.ducphuc@example.com",
            "item_name": "Used laptops (working)",
            "quantity": Decimal("8"),
            "unit": "item",
            "note": "Battery tested and chargers included.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=11, hours=2),
        },
        {
            "campaign_key": "school_supplies",
            "donor_name": "Youth Book Club",
            "user_email": None,
            "item_name": "Textbook sets",
            "quantity": Decimal("120"),
            "unit": "set",
            "note": "Sorted by grade 6-9.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=8, hours=6),
        },
        {
            "campaign_key": "school_supplies",
            "donor_name": "Parent Volunteer Group",
            "user_email": None,
            "item_name": "School uniforms",
            "quantity": Decimal("95"),
            "unit": "set",
            "note": "Mixed sizes, checklist attached.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=4, hours=5),
        },
        {
            "campaign_key": "flood_relief",
            "donor_name": "Nguyen Tuan",
            "user_email": "nguyen.tuan@example.com",
            "item_name": "Rice bags",
            "quantity": Decimal("65"),
            "unit": "bag",
            "note": "25kg each for family distribution.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=10, hours=8),
        },
        {
            "campaign_key": "flood_relief",
            "donor_name": "Community Pantry",
            "user_email": None,
            "item_name": "Canned food boxes",
            "quantity": Decimal("180"),
            "unit": "box",
            "note": "Mixed proteins and vegetables.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=7, hours=10),
        },
        {
            "campaign_key": "flood_relief",
            "donor_name": "District Relief Warehouse",
            "user_email": None,
            "item_name": "Mosquito nets",
            "quantity": Decimal("220"),
            "unit": "item",
            "note": "Emergency shelter stock.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=4, hours=9),
        },
        {
            "campaign_key": "heat_relief",
            "donor_name": "Local Business Guild",
            "user_email": None,
            "item_name": "Electrolyte drink packs",
            "quantity": Decimal("300"),
            "unit": "pack",
            "note": "For morning distribution shifts.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=6, hours=4),
        },
        {
            "campaign_key": "heat_relief",
            "donor_name": "Mai Giang",
            "user_email": "mai.giang@example.com",
            "item_name": "Cooling towels",
            "quantity": Decimal("160"),
            "unit": "item",
            "note": "Packed in sealed sets of 20.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=3, hours=9),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_name": "Delta Health Circle",
            "user_email": None,
            "item_name": "Blood pressure monitor",
            "quantity": Decimal("12"),
            "unit": "item",
            "note": "Calibrated before handover.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=12, hours=7),
        },
        {
            "campaign_key": "mobile_clinic",
            "donor_name": "Le Thanh Ha",
            "user_email": "le.thanhha@example.com",
            "item_name": "Medication pill organizers",
            "quantity": Decimal("240"),
            "unit": "item",
            "note": "For chronic care follow-up patients.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=8, hours=8),
        },
        {
            "campaign_key": "clean_water",
            "donor_name": "WaterSafe Vietnam",
            "user_email": None,
            "item_name": "Household filter units",
            "quantity": Decimal("140"),
            "unit": "item",
            "note": "Closed campaign historical ledger data.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=90, hours=4),
        },
        {
            "campaign_key": "clean_water",
            "donor_name": "Vo Duc Phuc",
            "user_email": "vo.ducphuc@example.com",
            "item_name": "Water testing strips",
            "quantity": Decimal("420"),
            "unit": "item",
            "note": "Packaged in zip bags by lot.",
            "checked_in_at": SEED_REFERENCE_TIME - timedelta(days=86, hours=5),
        },
    ]

    for payload in goods_data:
        campaign = campaigns[payload["campaign_key"]]
        checkpoint = goods_checkpoints.get(payload["campaign_key"])
        if checkpoint is None:
            continue
        user = users_by_email.get(payload["user_email"]) if payload["user_email"] else None

        _, created, updated = _upsert(
            db,
            GoodsCheckin,
            lookup={
                "campaign_id": campaign.id,
                "checkpoint_id": checkpoint.id,
                "donor_name": payload["donor_name"],
                "item_name": payload["item_name"],
            },
            values={
                "user_id": user.id if user is not None else None,
                "quantity": payload["quantity"],
                "unit": payload["unit"],
                "note": payload["note"],
                "checked_in_at": payload["checked_in_at"],
            },
        )
        stats.record(created=created, updated=updated)


def _seed_scan_logs(
    db: Session,
    *,
    campaigns: dict[str, Campaign],
    goods_checkpoints: dict[str, CampaignCheckpoint],
    stats: SeedStats,
) -> None:
    attendances = db.scalars(select(VolunteerAttendance).order_by(VolunteerAttendance.check_in_at.asc())).all()
    campaign_key_by_id = {campaign.id: key for key, campaign in campaigns.items()}

    for index, attendance in enumerate(attendances, start=1):
        checkpoint = db.get(CampaignCheckpoint, attendance.checkpoint_id)
        if checkpoint is None:
            continue

        check_in_nonce = f"seed-vol-{attendance.id}-in"
        _, created_in, updated_in = _upsert(
            db,
            CheckpointScanLog,
            lookup={
                "token_nonce": check_in_nonce,
            },
            values={
                "campaign_id": attendance.campaign_id,
                "checkpoint_id": attendance.checkpoint_id,
                "registration_id": attendance.registration_id,
                "user_id": attendance.user_id,
                "scan_type": CheckpointScanType.check_in.value,
                "result": CheckpointScanResult.success.value,
                "message": f"Volunteer checked in at {checkpoint.name}.",
                "scanned_at": attendance.check_in_at,
            },
        )
        stats.record(created=created_in, updated=updated_in)

        if attendance.check_out_at is not None:
            check_out_nonce = f"seed-vol-{attendance.id}-out"
            _, created_out, updated_out = _upsert(
                db,
                CheckpointScanLog,
                lookup={
                    "token_nonce": check_out_nonce,
                },
                values={
                    "campaign_id": attendance.campaign_id,
                    "checkpoint_id": attendance.checkpoint_id,
                    "registration_id": attendance.registration_id,
                    "user_id": attendance.user_id,
                    "scan_type": CheckpointScanType.check_out.value,
                    "result": CheckpointScanResult.success.value,
                    "message": (
                        "Volunteer checked out and shift handover confirmed."
                    ),
                    "scanned_at": attendance.check_out_at,
                },
            )
            stats.record(created=created_out, updated=updated_out)

        if index % 4 == 0:
            duplicate_nonce = f"seed-vol-{attendance.id}-dup"
            _, created_dup, updated_dup = _upsert(
                db,
                CheckpointScanLog,
                lookup={"token_nonce": duplicate_nonce},
                values={
                    "campaign_id": attendance.campaign_id,
                    "checkpoint_id": attendance.checkpoint_id,
                    "registration_id": attendance.registration_id,
                    "user_id": attendance.user_id,
                    "scan_type": CheckpointScanType.check_in.value,
                    "result": CheckpointScanResult.rejected.value,
                    "message": "Duplicate QR nonce detected for this user.",
                    "scanned_at": attendance.check_in_at + timedelta(minutes=1),
                },
            )
            stats.record(created=created_dup, updated=updated_dup)

    goods_checkins = db.scalars(select(GoodsCheckin).order_by(GoodsCheckin.checked_in_at.asc())).all()
    for goods in goods_checkins:
        campaign_key = campaign_key_by_id.get(goods.campaign_id)
        if campaign_key is None:
            continue
        goods_checkpoint = goods_checkpoints.get(campaign_key)
        if goods_checkpoint is None:
            continue

        nonce = f"seed-goods-{goods.id}"
        _, created, updated = _upsert(
            db,
            CheckpointScanLog,
            lookup={"token_nonce": nonce},
            values={
                "campaign_id": goods.campaign_id,
                "checkpoint_id": goods_checkpoint.id,
                "registration_id": None,
                "user_id": goods.user_id,
                "scan_type": CheckpointScanType.check_in.value,
                "result": CheckpointScanResult.success.value,
                "message": (
                    f"Goods check-in confirmed: {goods.item_name} x {goods.quantity} {goods.unit}."
                ),
                "scanned_at": goods.checked_in_at,
            },
        )
        stats.record(created=created, updated=updated)


def _refresh_credit_scores(db: Session, *, organizations: dict[str, Organization]) -> None:
    has_credit_score = hasattr(User, "credit_score") and hasattr(Organization, "credit_score")
    if not has_credit_score:
        return

    supporter_users = db.scalars(
        select(User).where(User.organization_id.is_(None), User.is_superuser.is_(False))
    ).all()
    for user in supporter_users:
        donation_count = len(
            db.scalars(
                select(MonetaryDonation).where(MonetaryDonation.donor_user_id == user.id)
            ).all()
        )
        registration_rows = db.scalars(
            select(VolunteerRegistration).where(VolunteerRegistration.user_id == user.id)
        ).all()
        registration_count = len(registration_rows)
        approved_count = sum(1 for row in registration_rows if row.status == VolunteerStatus.approved)

        user.credit_score = donation_count * 5 + registration_count * 3 + approved_count * 6
        db.add(user)

    for organization in organizations.values():
        campaign_rows = db.scalars(
            select(Campaign).where(Campaign.organization_id == organization.id)
        ).all()
        campaign_ids = [campaign.id for campaign in campaign_rows]

        published_count = sum(1 for campaign in campaign_rows if campaign.status == CampaignStatus.published)
        closed_count = sum(1 for campaign in campaign_rows if campaign.status == CampaignStatus.closed)

        donation_count = len(
            db.scalars(
                select(MonetaryDonation).where(MonetaryDonation.campaign_id.in_(campaign_ids))
            ).all()
        ) if campaign_ids else 0

        registration_rows = db.scalars(
            select(VolunteerRegistration).where(VolunteerRegistration.campaign_id.in_(campaign_ids))
        ).all() if campaign_ids else []

        registration_count = len(registration_rows)
        approved_count = sum(1 for row in registration_rows if row.status == VolunteerStatus.approved)

        organization.credit_score = (
            published_count * 10
            + closed_count * 4
            + donation_count * 2
            + registration_count * 1
            + approved_count * 2
        )
        db.add(organization)


def seed() -> None:
    db = SessionLocal()
    table_inspector = inspect(db.bind)
    has_checkpoints = table_inspector.has_table("campaign_checkpoints")
    has_attendance = table_inspector.has_table("volunteer_attendances")
    has_scan_logs = table_inspector.has_table("checkpoint_scan_logs")
    has_goods_checkins = table_inspector.has_table("goods_checkins")

    core_stats = SeedStats()
    advanced_stats = SeedStats()

    try:
        admin_user = _seed_admin_user(db, core_stats)

        organizations = _seed_organizations(db, core_stats)
        users_by_email = _seed_users(
            db,
            organizations=organizations,
            stats=core_stats,
        )
        users_by_email[admin_user.email] = admin_user

        campaigns = _seed_campaigns(
            db,
            organizations=organizations,
            stats=core_stats,
        )

        _seed_beneficiaries(
            db,
            organizations=organizations,
            campaigns=campaigns,
            stats=core_stats,
        )
        _seed_donations(
            db,
            campaigns=campaigns,
            users_by_email=users_by_email,
            stats=core_stats,
        )
        _seed_volunteer_registrations(
            db,
            campaigns=campaigns,
            users_by_email=users_by_email,
            stats=core_stats,
        )

        seed_context = SeedContext(
            organizations=organizations,
            users_by_email=users_by_email,
            campaigns=campaigns,
            volunteer_checkpoints={},
            goods_checkpoints={},
        )

        if has_checkpoints:
            volunteer_checkpoints, goods_checkpoints = _seed_campaign_checkpoints(
                db,
                campaigns=campaigns,
                stats=advanced_stats,
            )
            seed_context.volunteer_checkpoints = volunteer_checkpoints
            seed_context.goods_checkpoints = goods_checkpoints

        if has_checkpoints and has_attendance:
            _seed_volunteer_attendances(
                db,
                campaigns=campaigns,
                volunteer_checkpoints=seed_context.volunteer_checkpoints,
                stats=advanced_stats,
            )

        if has_checkpoints and has_goods_checkins:
            _seed_goods_checkins(
                db,
                campaigns=campaigns,
                goods_checkpoints=seed_context.goods_checkpoints,
                users_by_email=users_by_email,
                stats=advanced_stats,
            )

        if has_checkpoints and has_scan_logs:
            _seed_scan_logs(
                db,
                campaigns=campaigns,
                goods_checkpoints=seed_context.goods_checkpoints,
                stats=advanced_stats,
            )

        _refresh_credit_scores(db, organizations=organizations)

        db.commit()

        print("Seed completed.")
        print(
            "Core rows -> "
            f"created: {core_stats.created}, "
            f"updated: {core_stats.updated}"
        )
        print(
            "Advanced rows -> "
            f"created: {advanced_stats.created}, "
            f"updated: {advanced_stats.updated}"
        )
        print("Accounts:")
        print("- admin@lotushack.local / Admin@123456")
        print("- supporter accounts / Supporter@123")
        print("- organization operator accounts / Org@123456")

        if not has_checkpoints:
            print("Note: checkpoint tables not found, skipped QR-related mock data.")
        if not has_attendance:
            print("Note: volunteer_attendances table not found, skipped attendance mock data.")
        if not has_scan_logs:
            print("Note: checkpoint_scan_logs table not found, skipped scan log mock data.")
        if not has_goods_checkins:
            print("Note: goods_checkins table not found, skipped goods mock data.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
