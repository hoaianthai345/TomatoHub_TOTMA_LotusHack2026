from fastapi import FastAPI
from sqladmin import Admin, ModelView

from app.admin.auth import AdminAuth
from app.core.config import settings
from app.db.session import engine
from app.models.beneficiary import Beneficiary
from app.models.campaign import Campaign
from app.models.campaign_image import CampaignImage
from app.models.monetary_donation import MonetaryDonation
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer_registration import VolunteerRegistration


class BaseAdminView(ModelView):
    can_view_details = True
    page_size = 50


class UserAdmin(BaseAdminView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    column_list = [
        User.id,
        User.email,
        User.full_name,
        User.location,
        User.support_types,
        User.is_active,
        User.is_superuser,
        User.organization_id,
        User.created_at,
    ]
    column_searchable_list = [User.email, User.full_name]
    column_default_sort = [(User.created_at, True)]
    form_excluded_columns = [User.donations, User.volunteer_registrations]


class OrganizationAdmin(BaseAdminView, model=Organization):
    name = "Organization"
    name_plural = "Organizations"
    icon = "fa-solid fa-building"
    column_list = [
        Organization.id,
        Organization.name,
        Organization.location,
        Organization.verified,
        Organization.website,
        Organization.created_at,
    ]
    column_searchable_list = [Organization.name]
    column_default_sort = [(Organization.created_at, True)]
    form_excluded_columns = [Organization.campaigns, Organization.beneficiaries, Organization.members]


class CampaignAdmin(BaseAdminView, model=Campaign):
    name = "Campaign"
    name_plural = "Campaigns"
    icon = "fa-solid fa-bullhorn"
    column_list = [
        Campaign.id,
        Campaign.title,
        Campaign.short_description,
        Campaign.organization_id,
        Campaign.status,
        Campaign.tags,
        Campaign.goal_amount,
        Campaign.raised_amount,
        Campaign.starts_at,
        Campaign.ends_at,
        Campaign.is_active,
        Campaign.created_at,
    ]
    column_searchable_list = [Campaign.title, Campaign.slug]
    column_default_sort = [(Campaign.created_at, True)]
    form_excluded_columns = [Campaign.organization, Campaign.beneficiaries, Campaign.donations]


class CampaignImageAdmin(BaseAdminView, model=CampaignImage):
    name = "Campaign Image"
    name_plural = "Campaign Images"
    icon = "fa-solid fa-image"
    column_list = [
        CampaignImage.id,
        CampaignImage.campaign_id,
        CampaignImage.uploaded_by_user_id,
        CampaignImage.original_filename,
        CampaignImage.mime_type,
        CampaignImage.size_bytes,
        CampaignImage.relative_path,
        CampaignImage.created_at,
    ]
    column_searchable_list = [CampaignImage.original_filename, CampaignImage.relative_path]
    column_default_sort = [(CampaignImage.created_at, True)]
    form_excluded_columns = [CampaignImage.campaign, CampaignImage.uploaded_by_user]


class BeneficiaryAdmin(BaseAdminView, model=Beneficiary):
    name = "Beneficiary"
    name_plural = "Beneficiaries"
    icon = "fa-solid fa-user-group"
    column_list = [
        Beneficiary.id,
        Beneficiary.full_name,
        Beneficiary.location,
        Beneficiary.category,
        Beneficiary.status,
        Beneficiary.organization_id,
        Beneficiary.campaign_id,
        Beneficiary.target_support_amount,
        Beneficiary.is_verified,
        Beneficiary.created_at,
    ]
    column_searchable_list = [Beneficiary.full_name, Beneficiary.category]
    column_default_sort = [(Beneficiary.created_at, True)]
    form_excluded_columns = [Beneficiary.organization, Beneficiary.campaign]


class MonetaryDonationAdmin(BaseAdminView, model=MonetaryDonation):
    name = "Monetary Donation"
    name_plural = "Monetary Donations"
    icon = "fa-solid fa-hand-holding-dollar"
    column_list = [
        MonetaryDonation.id,
        MonetaryDonation.campaign_id,
        MonetaryDonation.donor_name,
        MonetaryDonation.amount,
        MonetaryDonation.currency,
        MonetaryDonation.payment_method,
        MonetaryDonation.donated_at,
    ]
    column_searchable_list = [MonetaryDonation.donor_name, MonetaryDonation.payment_method]
    column_default_sort = [(MonetaryDonation.donated_at, True)]
    form_excluded_columns = [MonetaryDonation.campaign, MonetaryDonation.donor_user]


class VolunteerRegistrationAdmin(BaseAdminView, model=VolunteerRegistration):
    name = "Volunteer Registration"
    name_plural = "Volunteer Registrations"
    icon = "fa-solid fa-people-carry-box"
    column_list = [
        VolunteerRegistration.id,
        VolunteerRegistration.campaign_id,
        VolunteerRegistration.full_name,
        VolunteerRegistration.email,
        VolunteerRegistration.phone_number,
        VolunteerRegistration.status,
        VolunteerRegistration.registered_at,
    ]
    column_searchable_list = [
        VolunteerRegistration.full_name,
        VolunteerRegistration.email,
        VolunteerRegistration.phone_number,
    ]
    column_default_sort = [(VolunteerRegistration.registered_at, True)]
    form_excluded_columns = [VolunteerRegistration.campaign, VolunteerRegistration.user]


def setup_admin(app: FastAPI) -> None:
    admin = Admin(
        app,
        engine,
        authentication_backend=AdminAuth(),
        title=f"{settings.APP_NAME} Admin",
        base_url="/admin",
    )
    admin.add_view(UserAdmin)
    admin.add_view(OrganizationAdmin)
    admin.add_view(CampaignAdmin)
    admin.add_view(CampaignImageAdmin)
    admin.add_view(BeneficiaryAdmin)
    admin.add_view(MonetaryDonationAdmin)
    admin.add_view(VolunteerRegistrationAdmin)
