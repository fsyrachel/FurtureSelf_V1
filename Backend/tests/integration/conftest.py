"""
端到端集成测试配置
需要真实的 Redis 和 Celery Worker 环境
"""
import pytest
import time
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base
from app.core.config import settings
from app.models import User


# 集成测试使用真实的Redis和数据库
INTEGRATION_DATABASE_URL = settings.DATABASE_URL.replace("futureself_db", "futureself_test_integration")

def ensure_integration_database_exists():
    """
    确保集成测试数据库存在，如果不存在则创建它
    """
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    
    # 从 DATABASE_URL 解析连接参数
    # 格式: postgresql+psycopg2://user:password@host:port/dbname
    import re
    match = re.match(r'postgresql\+psycopg2://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', settings.DATABASE_URL)
    if not match:
        raise ValueError(f"无法解析 DATABASE_URL: {settings.DATABASE_URL}")
    
    user, password, host, port, _ = match.groups()
    test_db_name = "futureself_test_integration"
    
    # 连接到默认的 postgres 数据库
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # 检查测试数据库是否存在
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (test_db_name,)
        )
        
        if not cursor.fetchone():
            # 数据库不存在，创建它
            print(f"📝 创建集成测试数据库: {test_db_name}")
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(test_db_name)
                )
            )
            print(f"✅ 数据库 {test_db_name} 创建成功")
            
            # 连接到新创建的数据库并启用必要的扩展
            conn.close()
            conn = psycopg2.connect(
                dbname=test_db_name,
                user=user,
                password=password,
                host=host,
                port=port
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            # 启用 pgvector 和 uuid-ossp 扩展
            print(f"📝 启用 PostgreSQL 扩展...")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
            print(f"✅ 扩展启用成功")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 创建集成测试数据库失败: {e}")
        print(f"💡 请手动创建数据库:")
        print(f"   createdb -U {user} {test_db_name}")
        print(f"   psql -U {user} -d {test_db_name} -c 'CREATE EXTENSION IF NOT EXISTS vector'")
        print(f"   psql -U {user} -d {test_db_name} -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"'")
        raise


@pytest.fixture(scope="session")
def integration_engine():
    """创建集成测试数据库引擎"""
    # 确保数据库存在
    ensure_integration_database_exists()
    
    engine = create_engine(INTEGRATION_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def integration_db_session(integration_engine):
    """每个测试用例使用独立的数据库会话"""
    Session = sessionmaker(bind=integration_engine)
    session = Session()
    yield session
    
    # 清理所有表数据
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    session.close()


@pytest.fixture()
def integration_test_user(integration_db_session):
    """创建集成测试用户"""
    user = User(id=uuid.uuid4(), status="ACTIVE")
    integration_db_session.add(user)
    integration_db_session.commit()
    integration_db_session.refresh(user)
    return user


@pytest.fixture()
def integration_client(integration_db_session, integration_test_user):
    """集成测试客户端 - 使用真实的依赖（不mock）"""
    from app.dependencies import get_db, get_current_user
    
    def override_get_db():
        try:
            yield integration_db_session
        finally:
            pass
    
    async def override_get_current_user():
        return integration_test_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


def wait_for_task_completion(db_session, model, record_id, status_field="status", 
                             expected_status="READY", timeout=60, poll_interval=2):
    """
    轮询等待异步任务完成
    
    Args:
        db_session: 数据库会话
        model: 模型类（如 Letter, Report）
        record_id: 记录ID
        status_field: 状态字段名
        expected_status: 期望的最终状态
        timeout: 超时时间（秒）
        poll_interval: 轮询间隔（秒）
    
    Returns:
        记录对象，如果超时则返回 None
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        db_session.expire_all()  # 刷新会话，获取最新数据
        record = db_session.query(model).filter(model.id == record_id).first()
        
        if record is None:
            return None
        
        current_status = getattr(record, status_field)
        
        if current_status == expected_status:
            return record
        
        if current_status == "FAILED":
            return record  # 返回失败的记录，让测试断言失败
        
        time.sleep(poll_interval)
    
    return None  # 超时

