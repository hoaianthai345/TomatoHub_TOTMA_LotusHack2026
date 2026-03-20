from app.db.base_class import Base

# Import models so Alembic can discover metadata from Base.
from app.models.beneficiary import Beneficiary  # noqa: F401
from app.models.campaign import Campaign  # noqa: F401
from app.models.monetary_donation import MonetaryDonation  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.volunteer_registration import VolunteerRegistration  # noqa: F401

__all__ = ["Base"]
