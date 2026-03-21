from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    beneficiaries,
    campaign_checkpoints,
    campaigns,
    dashboards,
    donations,
    health,
    organizations,
    supporters,
    transparency,
    volunteer_registrations,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(dashboards.router)
api_router.include_router(organizations.router)
api_router.include_router(campaigns.router)
api_router.include_router(campaign_checkpoints.router)
api_router.include_router(beneficiaries.router)
api_router.include_router(donations.router)
api_router.include_router(volunteer_registrations.router)
api_router.include_router(supporters.router)
api_router.include_router(transparency.router)
