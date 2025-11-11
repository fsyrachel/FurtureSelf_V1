# 位于: Backend/app/api/v1/endpoints/report.py
"""
(P1 关键) Day 7 - F5.1, F5.3, F5.2 API
(基于 FRD v1.11 和 Tech Specs v1.5)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid
import logging
import json

from app.core.database import get_db
from app.models import User, Report
from app.schemas import ( # (Day 7) 导入新的 schemas
    ReportGenerateResponse, ReportStatusResponse, ReportResponse
)
# (P1 Day 7) 导入 Celery 任务
from app.tasks.process_report import generate_report
# (P1 Day 7) 导入 Day 2 的 "妥协版" 认证
from .user import get_current_user 

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate", response_model=ReportGenerateResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_report_generation(
    current_user: User = Depends(get_current_user), # (P1 妥协)
    db: Session = Depends(get_db)
):
    """
    (P1) F5.1 触发报告生成 (Tech Specs v1.5)
    (由前端在 F3.2.2 聊完 5 条后自动调用)
    """
    logger.info(f"F5.1 (API): 用户 {current_user.id} 正在触发报告生成...")
    
    # (P1) 检查是否已在生成
    existing_report = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).first()
    if existing_report is not None and existing_report.status == 'GENERATING':# type: ignore
        logger.warning(f"F5.1 (API): 用户 {current_user.id} 试图重复触发报告。")
        return {
            "report_id": existing_report.id,
            "status": "GENERATING"
        }
        
    # 1. (DB) 存入数据库 (DB v1.3)
    new_report = Report(
        user_id=current_user.id,
        status='GENERATING' # (F5.3 关键)
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    # 2. (Async) (P1 关键) 推送异步任务到 Redis (Celery)
    try:
        generate_report.delay(report_id=str(new_report.id), user_id=str(current_user.id))
        logger.info(f"F5.1 (API): 任务 generate_report 已推送到 Redis。")
    except Exception as e:
        logger.error(f"F5.1 (API): Celery 任务推送失败! {e}", exc_info=True)
        pass # (P1) 失败也不应 500

    return {
        "report_id": new_report.id,
        "status": "GENERATING"
    }


@router.get("/status", response_model=ReportStatusResponse)
async def get_report_status(
    current_user: User = Depends(get_current_user), # (P1 妥协)
    db: Session = Depends(get_db)
):
    """
    (P1) F5.3 等待页轮询 (Tech Specs v1.5)
    """
    logger.debug(f"F5.3 (Poll): 用户 {current_user.id} 正在检查报告状态...")
    report = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="REPORT_NOT_FOUND")
        
    return {"status": report.status} # 'GENERATING' or 'READY'


@router.get("/latest", response_model=ReportResponse)
async def get_latest_report(
    current_user: User = Depends(get_current_user), # (P1 妥协)
    db: Session = Depends(get_db)
):
    """
    (P1) F5.2 获取报告 (Tech Specs v1.5)
    """
    logger.debug(f"F5.2 (API): 用户 {current_user.id} 正在加载最新报告...")
    report = db.query(Report).filter(
        Report.user_id == current_user.id,
        Report.status == 'READY'
    ).order_by(Report.created_at.desc()).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="REPORT_NOT_READY")

    # (P1) F4.5 Worker 存的是 JSON 字符串, 我们在这里解析它
    try:
        report_content_json = json.loads(str(report.content))
    except Exception:
        report_content_json = {
            "W": "报告生成失败。", "O": "", "O": "", "P": ""
        }

    return {
        "report_id": report.id,
        "status": report.status,
        "content": report_content_json, # (P1) 返回 JSON
        "created_at": report.created_at
    }