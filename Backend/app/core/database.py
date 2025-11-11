# 位于: Backend/app/core/database.py
"""
(P1) SQLAlchemy 引擎和会话管理
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.core.config import settings

# (P1) 创建 SQLAlchemy 引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=(settings.APP_ENV == "development") # (P1 调试) 打印所有 SQL
)

# (P1) 创建会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# (P1) 声明式基类
class Base(DeclarativeBase):
    pass

# (P1 关键) 依赖注入 (Dependency Injection)
# 我们的 API 路由 (Day 2) 将使用这个函数来获取数据库会话
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()