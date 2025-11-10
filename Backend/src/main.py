from fastapi import FastAPI
import uvicorn

# 初始化 FastAPI 应用
app = FastAPI(
    title="P1 未来自我 - 后端 API",
    version="1.0.0"
)

# (P1 关键) 允许前端 (F6.7) 在本地访问
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # (P1) 允许本地前端
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Health"])
async def root():
    """根目录，返回应用信息"""
    return {"message": "P1 Backend API is running."}

@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """(Day 1 交付物) 健康检查接口"""
    return {"status": "ok", "timestamp": "2025-11-10T12:39:00Z"}

# --- (Day 2 及以后, 在这里添加 F1.1, F2.1, F2.2 ... 的 API) ---
# @app.post("/api/v1/user/init")
# async def user_init():
#     ...


# (Day 1) 定义如何启动应用
if __name__ == "__main__":
    # (P1) 我们的标准本地端口
    uvicorn.run(app, host="0.0.0.0", port=8000)