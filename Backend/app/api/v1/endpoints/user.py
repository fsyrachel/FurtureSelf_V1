from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
import uuid
import logging
from typing import List

from app.core.database import get_db
from app.models import User, CurrentProfile, FutureProfile
from app.schemas import (
    UserInitRequest, UserInitResponse,
    CurrentProfileRequest, CurrentProfileResponse,
    FutureProfileRequest, FutureProfileResponse, CreatedProfileInfo
)
# (P1 v1.11 修复) 导入 *async* RAG 写入服务
from app.services.vector_store import add_future_profile_to_rag_async

logger = logging.getLogger(__name__)

router_init = APIRouter()
router = APIRouter()


@router_init.post("/init", response_model=UserInitResponse)
async def init_user(
    request: UserInitRequest,
    db: Session = Depends(get_db)
):
    """(P1) F1.1 匿名用户初始化 (v1.11)"""
    user_id = request.anonymous_user_id
    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if user is not None:
        return {"user_id": user.id, "status": user.status}
    else:
        new_user = User(id=uuid.uuid4(), status='ONBOARDING')
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"F1.1: 创建了新用户: {new_user.id}, status: {new_user.status}")
        return {"user_id": new_user.id, "status": new_user.status}


async def get_current_user(db: Session = Depends(get_db)) -> User:
    """(P1 Day 2 妥协) 总是获取第一个用户，用于 Postman 测试"""
    user = db.query(User).order_by(User.created_at.desc()).first()
    if user is None:
        raise HTTPException(status_code=404, detail="[Day 2 测试] 数据库中没有用户。请先调用 /api/v1/user/init")
    logger.debug(f"[Day 2 测试] 使用最新的用户: {user.id}")
    return user


@router.post("/current", response_model=CurrentProfileResponse)
async def create_current_profile(
    request: CurrentProfileRequest,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """(P1) F2.1 提交当前档案 (v1.11 新问卷)"""
    logger.info(f"F2.1: 用户 {current_user.id} 正在提交 'current_profile'...")
    db_profile = db.query(CurrentProfile).filter(CurrentProfile.user_id == current_user.id).first()
    if db_profile is not None:
        logger.warning(f"F2.1: 用户 {current_user.id} 试图重复提交 profile")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PROFILE_ALREADY_EXISTS")
        
    new_profile = CurrentProfile(
        user_id=current_user.id,
        demo_data=request.demo_data.model_dump(),
        vals_data=request.vals_data,
        bfi_data=request.bfi_data
    )
    db.add(new_profile)
    db.commit()
    logger.info(f"F2.1: 用户 {current_user.id} 的 'current_profile' 已保存。")
    return {"status": "CURRENT_PROFILE_SAVED"}


@router.post("/future", response_model=FutureProfileResponse)
async def create_future_profile(
    request: FutureProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    (P1) F2.2 提交未来档案 (v1.11)
    (v1.11 - P1 冲刺（Sprint）asyncio 修复)
    """
    logger.info(f"F2.2: 用户 {current_user.id} 正在提交 'future_profile'...")

    count = db.query(FutureProfile).filter(FutureProfile.user_id == current_user.id).count()
    if count > 0:
        logger.warning(f"F2.2: 用户 {current_user.id} 试图重复提交 F2.2")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="FUTURE_PROFILES_ALREADY_EXIST")
    
    created_profiles_info: List[CreatedProfileInfo] = []

    # (v1.11 修复) 我们必须在 *事务 (Transaction)* 中执行
    try:
        for profile_item in request.profiles:
            
            # (V1 核心妥协) "同步合成"
            profile_description = f"""
# 我的核心价值观 (My Values)
{profile_item.future_values}
# 我的理想愿景 (My Vision)
{profile_item.future_vision}
# 我的主要障碍 (My Obstacles)
{profile_item.future_obstacles}
""".strip()
            
            new_profile = FutureProfile(
                user_id=current_user.id,
                profile_name=profile_item.profile_name,
                future_values=profile_item.future_values,
                future_vision=profile_item.future_vision,
                future_obstacles=profile_item.future_obstacles,
                profile_description=profile_description
            )
            db.add(new_profile)
            
            # (P1 v1.11 修复)
            # RAG 写入 *必须* 在 commit 之前，以确保它在同一个事务中
            # `db.flush()` 会给 new_profile 分配一个 ID
            db.flush() 
            
            # (P1 v1.11 修复) 必须 `await` 
            await add_future_profile_to_rag_async(db, new_profile)
            
            db.refresh(new_profile) # (P1) 刷新以获取 ID
            
            created_profiles_info.append(CreatedProfileInfo(
                future_profile_id=new_profile.id, # type: ignore [arg-type]
                profile_name=new_profile.profile_name # type: ignore [arg-type]
            ))
            
        current_user.status = "ACTIVE" # type: ignore [assignment]
        db.add(current_user)
        
        # (P1 v1.11 修复) *只在*最后 commit
        db.commit()
    
    except Exception as e:
        logger.error(f"F2.2 (API) 失败 (RAG 或 DB)! 事务回滚。 {e}", exc_info=True)
        db.rollback()
        # (P1 v1.11 修复) 抛出 500 错误，而不是静默失败
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"创建未来档案失败: {e}"
        )
    
    logger.info(f"F2.2: 用户 {current_user.id} 的 'future_profile' 已保存, 状态更新为 ACTIVE。")
    
    return FutureProfileResponse(
        status="ACTIVE",
        user_id=current_user.id, # type: ignore [arg-type]
        created_profiles=created_profiles_info
    )