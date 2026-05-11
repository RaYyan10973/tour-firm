import importlib
import os
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    # IMPORTANT: the backend creates SQLAlchemy engine at import time based on env vars.
    # We set env and reload modules to ensure tests use isolated sqlite DB.
    test_db_path = tmp_path / "test_app.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
    os.environ.setdefault("ADMIN_USERNAME", "admin")
    os.environ.setdefault("ADMIN_PASSWORD", "admin123")
    os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
    os.environ.setdefault("ADMIN_FULL_NAME", "System Admin")
    os.environ.setdefault("ADMIN_PHONE", "+70000000000")

    # Ensure a clean import graph so DATABASE_URL takes effect everywhere.
    for name in list(sys.modules.keys()):
        if name == "app" or name.startswith("app."):
            del sys.modules[name]

    import app.database as database_module
    import app.models as models_module  # noqa: F401 - registers ORM models
    import app.main as main_module

    # Create tables before FastAPI startup events seed demo data.
    database_module.Base.metadata.create_all(bind=database_module.engine)

    with TestClient(main_module.app) as c:
        yield c


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def tokens(client: TestClient) -> dict[str, str]:
    def login(username: str, password: str) -> str:
        res = client.post("/auth/login", json={"username": username, "password": password})
        assert res.status_code == 200, res.text
        return res.json()["access_token"]

    return {
        "admin": login("admin", "admin123"),
        "manager": login("boric", "manager123"),
        "client": login("ivan_client", "client123"),
    }

