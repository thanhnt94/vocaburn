import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vocaburn"
    API_V1_STR: str = "/api/v1"
    
    # Database
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    STORAGE_DIR: str = os.path.abspath(os.path.join(BASE_DIR, "..", "Storage", "database"))
    VOCABURN_STORAGE_DIR: str = os.path.abspath(os.path.join(BASE_DIR, "..", "Storage", "Vocaburn"))
    
    @property
    def DATABASE_URL(self) -> str:
        # Create directory if it doesn't exist
        os.makedirs(self.STORAGE_DIR, exist_ok=True)
        db_path = os.path.join(self.STORAGE_DIR, "Vocaburn.db")
        return f"sqlite+aiosqlite:///{db_path}"
    
    # SSO / CentralAuth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vocaburn_default_secret_key_change_me_123456789")
    CENTRAL_AUTH_URL: str = os.getenv("CENTRAL_AUTH_URL", "https://auth.inmind.site")
    CENTRALAUTH_INTERNAL_URL: str = os.getenv("CENTRALAUTH_INTERNAL_URL", "http://127.0.0.1:5050")
    CENTRALAUTH_QUEUE_TOKEN: str = os.getenv("CENTRALAUTH_QUEUE_TOKEN", os.getenv("QUEUE_API_SECRET", "super-secret-token-123"))
    QUEUE_API_SECRET: str = os.getenv("QUEUE_API_SECRET", os.getenv("CENTRALAUTH_QUEUE_TOKEN", "super-secret-token-123"))
    CLIENT_ID: str = os.getenv("CLIENT_ID", "vocaburn-v1")
    CLIENT_SECRET: str = os.getenv("CLIENT_SECRET", "vocaburn_secret_123")
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "https://vocab.inmind.site")
    
    # AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()

if settings.SECRET_KEY == "vocaburn_default_secret_key_change_me_123456789":
    import logging
    logging.getLogger("uvicorn.error").warning(
        "⚠️ SECURITY WARNING: SECRET_KEY is set to default placeholder. "
        "Please set SECRET_KEY in environment variables for production!"
    )
