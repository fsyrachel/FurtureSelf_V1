import logging
import asyncio # (P1) Celery 任务中运行 async
import uuid

from app.core.celery_app import celery_app
from app.core.database import SessionLocal # (P1 关键) Worker 必须创建*自己的* DB 会话
from app.models import Letter, CurrentProfile, FutureProfile, LetterReply
from app.services.ai_services import generate_letter_reply_service # (P1) 导入 Day 3 AI 链

logger = logging.getLogger(__name__)

# 重试配置
MAX_RETRIES = 3  # 最大重试次数
RETRY_DELAY = 60  # 重试延迟（秒）

# (P1) 这是一个辅助函数，用于在 sync (Celery) 中运行 async (LangChain)
def async_to_sync(awaitable):
    return asyncio.run(awaitable)

@celery_app.task(
    name="process_letter",
    bind=True,  # 绑定任务实例，允许访问 self
    max_retries=MAX_RETRIES,  # 最大重试次数
    default_retry_delay=RETRY_DELAY,  # 默认重试延迟
)
def process_letter(self, letter_id: str, user_id: str):
    """
    (P1) F4.3 异步回信任务 (Tech Specs v1.5, 4.2节)
    """
    logger.info(f"F4.3 (Worker): 收到任务! LetterID: {letter_id}, UserID: {user_id}")
    
    # Worker创建自己的 DB 会话
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

        # 2. (AI) 循环为每个人设生成回信
        for profile in future_profiles:
            logger.debug(f"F4.3 (Worker): 正在处理人设: {profile.profile_name} ({profile.id})")
            
            ai_content = async_to_sync(
                generate_letter_reply_service(current_profile, profile, letter)  # type: ignore
            )
            
            # 存入数据库
            new_reply = LetterReply(
                id=uuid.uuid4(),
                letter_id=letter.id,
                future_profile_id=profile.id,
                content=ai_content,
                chat_status='NOT_STARTED' 
            )
            db.add(new_reply)
            
        # 3. (DB) (F6.6 关键) 更新信件状态为 "REPLIES_READY"
        letter.status = 'REPLIES_READY'
        db.add(letter)
        
        db.commit()
        logger.info(f"F4.3 (Worker): 任务成功完成! LetterID: {letter_id} 状态已更新为 REPLIES_READY。")
        
    except ValueError as e:
        # 数据错误（如数据不完整）- 不应该重试，但也要标记为 FAILED 让前端可以重试
        logger.error(f"F4.3 (Worker): 数据错误，不重试! LetterID: {letter_id}. 错误: {e}", exc_info=True)
        db.rollback()
        # 更新信件状态为 FAILED，让前端知道可以手动重试
        try:
            letter = db.query(Letter).filter(Letter.id == uuid.UUID(letter_id)).first()
            if letter:
                letter.status = 'FAILED'
                db.commit()
                logger.info(f"F4.3 (Worker): 信件 {letter_id} 状态已更新为 FAILED（数据错误）")
        except Exception as update_error:
            logger.error(f"F4.3 (Worker): 更新信件状态失败: {update_error}", exc_info=True)
        raise  # 不重试，直接抛出异常
        
    except Exception as e:
        # 其他错误（如 AI API 超时、网络错误等）- 可以重试
        logger.error(f"F4.3 (Worker): 任务失败! LetterID: {letter_id}. 错误: {e}", exc_info=True)
        db.rollback()
        
        # 检查是否还有重试机会
        if self.request.retries < MAX_RETRIES:
            logger.info(f"F4.3 (Worker): 准备重试 ({self.request.retries + 1}/{MAX_RETRIES})...")
            # 指数退避：第1次重试等60秒，第2次等120秒，第3次等240秒
            retry_delay = RETRY_DELAY * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        else:
            # 达到最大重试次数，任务最终失败
            logger.error(f"F4.3 (Worker): 达到最大重试次数 ({MAX_RETRIES})，任务最终失败!")
            # 更新信件状态为 FAILED，让前端知道可以手动重试
            try:
                letter = db.query(Letter).filter(Letter.id == uuid.UUID(letter_id)).first()
                if letter:
                    letter.status = 'FAILED'
                    db.commit()
                    logger.info(f"F4.3 (Worker): 信件 {letter_id} 状态已更新为 FAILED")
            except Exception as update_error:
                logger.error(f"F4.3 (Worker): 更新信件状态失败: {update_error}", exc_info=True)
            raise  # 最终失败，抛出异常
    finally:
        db.close() # (P1 关键) 确保会话被关闭