from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.auth.models import User
from typing import Optional

class AuthService:
    @staticmethod
    def verify_password(plain_password, hashed_password):
        if not hashed_password:
            return False
        return check_password_hash(hashed_password, plain_password)

    @staticmethod
    def get_password_hash(password):
        return generate_password_hash(password)

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str):
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str):
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        user = await AuthService.get_user_by_username(db, username)
        if not user or not user.hashed_password:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int):
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_current_user(request, db: AsyncSession) -> Optional[User]:
        from app.modules.sso_module.cookie_signer import verify_cookie
        from app.core.config import settings

        raw_user_id = request.cookies.get("user_id")
        verified_id = None

        if raw_user_id:
            if "." in raw_user_id:
                verified_id = verify_cookie(raw_user_id, settings.SECRET_KEY)
            else:
                verified_id = raw_user_id

        if not verified_id:
            auth_header = request.headers.get("Authorization")
            if auth_header:
                token_val = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else auth_header.strip()
                if "." in token_val:
                    verified_id = verify_cookie(token_val, settings.SECRET_KEY)

        if not verified_id:
            return None

        try:
            return await AuthService.get_user_by_id(db, int(verified_id))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def get_user_id(request) -> int:
        from app.modules.sso_module.cookie_signer import verify_cookie
        from app.core.config import settings

        raw = request.cookies.get("user_id")
        if not raw:
            auth_header = request.headers.get("Authorization")
            if auth_header:
                raw = auth_header.split(" ")[1] if auth_header.startswith("Bearer ") else auth_header.strip()

        if not raw:
            return 1

        if "." in raw:
            verified = verify_cookie(raw, settings.SECRET_KEY)
            if verified:
                try:
                    return int(verified)
                except (ValueError, TypeError):
                    pass
            try:
                return int(raw.split(".")[0])
            except (ValueError, TypeError):
                return 1

        try:
            return int(raw)
        except (ValueError, TypeError):
            return 1

