# 位于: Backend/app/api/v1/api.py
"""
(P1) API 路由器
(v1.6 - P1 冲刺（Sprint）最终版)
"""
from fastapi import APIRouter
from .endpoints import user # (Day 2) 
from .endpoints import letter # (Day 3) (新)
from .endpoints import chat # (Day 5) (新)
from .endpoints import report # (Day 7) (新)

# (P1) 这是您 main.py 中导入的 `api_router`
api_router = APIRouter()

# (P1) 装载 Day 2 的 API
api_router.include_router(user.router_init, prefix="/user", tags=["[Day 2] 1. User Init (F1)"])
api_router.include_router(user.router, prefix="/profile", tags=["[Day 2] 2. Profile (F2)"])

# (Day 3) 装载信件
api_router.include_router(letter.router, prefix="/letters", tags=["[Day 3-4] 3. Letter (F3/F6)"])

# (Day 5) 装载聊天
api_router.include_router(chat.router, prefix="/chat", tags=["[Day 5-6] 4. Chat (F3)"])

# (Day 7) 装载报告
api_router.include_router(report.router, prefix="/report", tags=["[Day 7] 5. Report (F5)"])