import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = os.getenv("APP_NAME", "Tour Agency API")
    app_version: str = os.getenv("APP_VERSION", "0.2.0")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "replace-me-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    cors_origins: list[str] = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173").split(",")]
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_full_name: str = os.getenv("ADMIN_FULL_NAME", "System Admin")
    admin_phone: str = os.getenv("ADMIN_PHONE", "+70000000000")


@lru_cache
def get_settings() -> Settings:
    return Settings()
