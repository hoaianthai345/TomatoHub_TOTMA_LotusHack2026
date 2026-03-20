from fastapi import APIRouter

from app.api.endpoints import campaigns, health, organizations

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(organizations.router)
api_router.include_router(campaigns.router)
