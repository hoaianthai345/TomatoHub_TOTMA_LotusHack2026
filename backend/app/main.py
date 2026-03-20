from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    )

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"message": "LotusHack backend is running"}

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    return app


app = create_application()
