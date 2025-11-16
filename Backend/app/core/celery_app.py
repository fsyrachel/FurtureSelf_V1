from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "p1_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL, 
    include=[
        "app.tasks.process_letter", 
        "app.tasks.process_report"  
    ]
)

celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    # Celery/FastAPI/SQLAlchemy 时区一致
    timezone="Asia/Shanghai", 
    enable_utc=True,
)

logger.info(f"Celery App '{celery_app.main}' 已配置 (Broker: {settings.REDIS_URL})")