import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://drd:drd@localhost:5432/drd_test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Role, User
from app.security import hash_password

engine = create_engine(settings.database_url, future=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(autouse=True)
def _clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def _get_db_override():
        yield db

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def make_user(db, email, role, password="password123", name=None):
    user = User(
        email=email,
        name=name or email.split("@")[0],
        role=role,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(client, email, password="password123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res


@pytest.fixture
def admin(db):
    return make_user(db, "admin@test.com", Role.admin)


@pytest.fixture
def operator(db):
    return make_user(db, "operator@test.com", Role.operator)


@pytest.fixture
def client_user(db):
    return make_user(db, "client@test.com", Role.client)


@pytest.fixture
def other_client_user(db):
    return make_user(db, "other-client@test.com", Role.client)
