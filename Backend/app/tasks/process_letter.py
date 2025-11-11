# 位于: Backend/app/tasks/process_letter.py
"""
(P1 关键) Day 3/4 - F4.3 (异步回信) Worker
(基于 FRD v1.11 和 Tech Specs v1.5)
"""
import logging
import asyncio # (P1) Celery 任务中运行 async
import uuid

from app.core.celery_app import celery_app
from app.core.database import SessionLocal # (P1 关键) Worker 必须创建*自己的* DB 会话
from app.models import Letter, CurrentProfile, FutureProfile, LetterReply
from app.services.ai_services import generate_letter_reply_service # (P1) 导入 Day 3 AI 链

logger = logging.getLogger(__name__)

# (P1) 这是一个辅助函数，用于在 sync (Celery) 中运行 async (LangChain)
def async_to_sync(awaitable):
    return asyncio.run(awaitable)

@celery_app.task(name="process_letter")
def process_letter(letter_id: str, user_id: str):
    """
    (P1) F4.3 异步回信任务 (Tech Specs v1.5, 4.2节)
    """
    logger.info(f"F4.3 (Worker): 收到任务! LetterID: {letter_id}, UserID: {user_id}")
    
    # (P1 关键) Worker *必须* 创建自己的 DB 会话
    db = SessionLocal()
    
    try:
        # 1. (DB) 获取所有需要的数据
        letter = db.query(Letter).filter(Letter.id == uuid.UUID(letter_id)).first()
        current_profile = db.query(CurrentProfile).filter(CurrentProfile.user_id == uuid.UUID(user_id)).first()
        future_profiles = db.query(FutureProfile).filter(FutureProfile.user_id == uuid.UUID(user_id)).all()

        if letter is None or current_profile is None or not future_profiles:
            logger.error(f"F4.3 (Worker): 数据不完整。Letter, CurrentProfile 或 FutureProfiles 未找到。")
            raise ValueError("Data incomplete for letter generation.")

        logger.debug(f"F4.3 (Worker): 找到 {len(future_profiles)} 个人设需要回信。")

        # 2. (AI) (FRD v1.11) 循环为每个人设生成回信
        for profile in future_profiles:
            logger.debug(f"F4.3 (Worker): 正在处理人设: {profile.profile_name} ({profile.id})")
            
            # (P1 Day 3) 调用 Day 3 的 AI 链 (F4.3)
            # (我们使用 async_to_sync 运行 LangChain 的 ainvoke)
            ai_content = async_to_sync(
                generate_letter_reply_service(current_profile, profile, letter)  # type: ignore
            )
            
            # (P1 DB v1.3) 存入数据库
            new_reply = LetterReply(
                id=uuid.uuid4(),
                letter_id=letter.id,
                future_profile_id=profile.id,
                content=ai_content,
                chat_status='NOT_STARTED' # (P1 DB v1.3 关键!)
            )
            db.add(new_reply)
            
        # 3. (DB) (F6.6 关键) 更新信件状态为 "REPLIES_READY"
        letter.status = 'REPLIES_READY'
        db.add(letter)
        
        db.commit()
        logger.info(f"F4.3 (Worker): 任务成功完成! LetterID: {letter_id} 状态已更新为 REPLIES_READY。")
        
    except Exception as e:
        logger.error(f"F4.3 (Worker): 任务失败! LetterID: {letter_id}. 错误: {e}", exc_info=True)
        db.rollback()
        # (P1) TODO: Day 8 - 实现重试逻辑
    finally:
        db.close() # (P1 关键) 确保会话被关闭