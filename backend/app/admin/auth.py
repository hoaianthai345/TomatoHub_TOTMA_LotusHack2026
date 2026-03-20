import secrets

from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request

from app.core.config import settings


class AdminAuth(AuthenticationBackend):
    """Simple session-based auth for /admin."""

    def __init__(self) -> None:
        super().__init__(secret_key=settings.SECRET_KEY)

    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = str(form.get("username", ""))
        password = str(form.get("password", ""))

        is_valid_username = secrets.compare_digest(username, settings.ADMIN_USERNAME)
        is_valid_password = secrets.compare_digest(password, settings.ADMIN_PASSWORD)
        if not (is_valid_username and is_valid_password):
            return False

        request.session.update({"admin_authenticated": True})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin_authenticated"))
