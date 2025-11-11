# 位于: Backend/app/tasks/process_report.py
"""
(P1 关键) Day 7 - F4.5 (异步总结) Worker
(基于 FRD v1.11 和 Tech Specs v1.5)
"""
import logging
import asyncio
import uuid
import json
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models import Report, Letter, ChatMessage, CurrentProfile
from app.services.ai_services import report_chain # (P1) 导入 Day 7 AI 链

logger = logging.getLogger(__name__)

def async_to_sync(awaitable):
    return asyncio.run(awaitable)

@celery_app.task(name="generate_report")
def generate_report(report_id: str, user_id: str):
    """
    (P1) F4.5 异步总结任务 (Tech Specs v1.5, 4.2节)
    """
    logger.info(f"F4.5 (Worker): 收到任务! ReportID: {report_id}, UserID: {user_id}")
    
    db = SessionLocal()
    
    try:
        # 1. (DB) 获取 *所有* 数据
        report = db.query(Report).filter(Report.id == uuid.UUID(report_id)).first()
        letter = db.query(Letter).filter(Letter.user_id == uuid.UUID(user_id)).order_by(Letter.created_at.desc()).first()
        current_profile = db.query(CurrentProfile).filter(CurrentProfile.user_id == uuid.UUID(user_id)).first()
        chat_history_db = db.query(ChatMessage).filter(ChatMessage.user_id == uuid.UUID(user_id)).order_by(ChatMessage.created_at.asc()).all()
        if not all([report, letter, current_profile, chat_history_db]):
            logger.error(f"F4.5 (Worker): 数据不完整。")
            raise ValueError("Data incomplete for report generation.")

        # 2. (P1) 格式化聊天记录
        chat_history_full = "\n".join(
            [f"{msg.sender}: {msg.content}" for msg in chat_history_db]
        )
        
        # 3. (P1 妥协 B) 准备阉割版的 Profile (不含 Story)
        # (Tech Specs v1.5, 2.4 节)
        profile_data_light = {
            "demo_data": current_profile.demo_data, # type: ignore
            "vals_data": current_profile.vals_data,# type: ignore
            "bfi_data": current_profile.bfi_data# type: ignore
        }

        # 4. (AI) 准备 Prompt 输入
        prompt_input = {
            "current_profile_data": json.dumps(profile_data_light, indent=2),
            "user_letter_content": letter.content,# type: ignore
            "full_chat_history": chat_history_full
        }
        
        # 5. (AI) 调用 F4.5 (总结) AI 链
        ai_response_json = async_to_sync(
            report_chain.ainvoke(prompt_input)
        )
        # (P1) TODO: Day 8 - 添加对 ai_response_json 的解析和验证
        
        # 6. (DB) (F5.3 关键) 更新报告状态为 "READY"
        report.content = ai_response_json# type: ignore # (P1) 我们假设 AI 返回了 WOOP JSON
        report.status = 'READY'# type: ignore
        db.add(report)
        db.commit()
        
        logger.info(f"F4.5 (Worker): 任务成功完成! ReportID: {report_id} 状态已更新为 READY。")
        
    except Exception as e:
        logger.error(f"F4.5 (Worker): 任务失败! ReportID: {report_id}. 错误: {e}", exc_info=True)
        db.rollback()
        # (P1) TODO: Day 8 - 更新 report status 为 'FAILED'
    finally:
        db.close()