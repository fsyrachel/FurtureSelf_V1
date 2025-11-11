"""
(P1 关键) Day 3 - Celery (异步 Worker) 应用实例
(基于 System Arch v1.6)
"""
from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# (P1) 初始化 Celery，使用 Redis (来自 .env) 作为 Broker
celery_app = Celery(
    "p1_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL, # 我们也用 Redis 存结果
    include=[
        "app.tasks.process_letter", # (Day 3) 我们的 F4.3 任务
        "app.tasks.process_report"  # (Day 7) 我们的 F4.5 任务
    ]
)

celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    # (P1) 确保 Celery/FastAPI/SQLAlchemy 时区一致
    # (注意: 您需要 `pip install tzdata`)
    timezone="Asia/Shanghai", 
    enable_utc=True,
)

logger.info(f"Celery App '{celery_app.main}' 已配置 (Broker: {settings.REDIS_URL})")