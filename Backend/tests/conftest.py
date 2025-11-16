import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal, get_db
from app.api.v1.endpoints.user import get_current_user
from app.models import User


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    初始化测试环境：
    - 将 APP_ENV 切换为 test，避免开发环境副作用
    - 确保测试数据库的表结构存在
    - 测试结束后清理表结构（保持测试库干净）
    """
    settings.APP_ENV = "test"
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_database():
    """
    每个测试结束后清空所有业务表，保证测试互不影响。
    """
    yield
    session = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
    finally:
        session.close()


@pytest.fixture()
def db_session():
    """
    为单个测试提供独立的数据库 Session。
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def test_user(db_session):
    """
    准备一个默认的测试用户，所有接口依赖 get_current_user 时都返回该用户。
    """
    user = User(id=uuid.uuid4(), status="ACTIVE")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def client(db_session, test_user):
    """
    提供 FastAPI TestClient，同时覆盖 get_db / get_current_user 依赖，
    让接口在测试时使用同一个 Session 与默认用户。
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

