#!/bin/bash

# ========================================
# 未来自我后端 - Linux/Mac 快速部署脚本
# ========================================
# 用途：从 Git 克隆后一键启动开发环境
# 作者：FutureSelf Team
# ========================================

set -e

SKIP_DEPENDENCIES=false
STOP_ONLY=false

# 解析参数
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-dependencies) SKIP_DEPENDENCIES=true ;;
        --stop-only) STOP_ONLY=true ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

echo "========================================"
echo "  未来自我后端 - 快速部署工具"
echo "========================================"
echo ""

# 设置工作目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ========================================
# 如果只是停止服务
# ========================================
if [ "$STOP_ONLY" = true ]; then
    echo "🛑 正在停止所有服务..."
    
    # 停止 Docker Compose
    if [ -f "docker-compose.yml" ]; then
        echo "📦 停止 Docker 服务 (PostgreSQL + Redis)..."
        docker-compose down
        echo "✅ Docker 服务已停止"
    fi
    
    echo ""
    echo "✅ 所有服务已停止"
    exit 0
fi

# ========================================
# 步骤 1: 检查先决条件
# ========================================
echo "📋 步骤 1: 检查系统环境..."

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "✅ Docker: $(docker --version)"

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo "✅ Docker Compose: $(docker-compose --version)"

# 检查 Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ 错误: 未找到 Python"
    echo "请确保已安装 Python 3.11+ 或激活了 Conda/虚拟环境"
    exit 1
fi

if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
    PIP_CMD=pip3
else
    PYTHON_CMD=python
    PIP_CMD=pip
fi

echo "✅ Python: $($PYTHON_CMD --version)"
echo ""

# ========================================
# 步骤 2: 启动 Docker 服务
# ========================================
echo "📦 步骤 2: 启动 Docker 服务 (PostgreSQL + Redis)..."

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 未找到 docker-compose.yml 文件"
    exit 1
fi

# 启动 Docker Compose
docker-compose up -d

echo "✅ Docker 服务启动成功"
echo ""

# ========================================
# 步骤 3: 等待服务就绪
# ========================================
echo "⏳ 步骤 3: 等待 PostgreSQL 和 Redis 就绪..."

MAX_RETRIES=30
RETRY_COUNT=0

# 等待 PostgreSQL
echo "  等待 PostgreSQL..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U futureself_user -d futureself_db &> /dev/null; then
        echo "  ✅ PostgreSQL 已就绪"
        break
    fi
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ PostgreSQL 启动超时"
    exit 1
fi

# 等待 Redis
echo "  等待 Redis..."
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        echo "  ✅ Redis 已就绪"
        break
    fi
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Redis 启动超时"
    exit 1
fi

echo ""

# ========================================
# 步骤 4: 初始化数据库
# ========================================
echo "🗄️  步骤 4: 初始化数据库扩展..."

if [ -f "init_db.sql" ]; then
    if docker-compose exec -T postgres psql -U futureself_user -d futureself_db < init_db.sql 2>/dev/null; then
        echo "✅ 数据库扩展初始化成功 (pgvector, uuid-ossp)"
    else
        echo "⚠️  数据库扩展初始化失败（可能已存在）"
    fi
else
    echo "⚠️  未找到 init_db.sql，跳过数据库初始化"
fi

echo ""

# ========================================
# 步骤 5: 安装 Python 依赖
# ========================================
if [ "$SKIP_DEPENDENCIES" = false ]; then
    echo "📦 步骤 5: 安装 Python 依赖..."
    
    if [ -f "requirements.txt" ]; then
        $PIP_CMD install -r requirements.txt
        echo "✅ Python 依赖安装成功"
    else
        echo "⚠️  未找到 requirements.txt"
    fi
else
    echo "⏭️  步骤 5: 跳过 Python 依赖安装 (使用了 --skip-dependencies 参数)"
fi

echo ""

# ========================================
# 步骤 6: 创建 .env 文件（如果不存在）
# ========================================
echo "📝 步骤 6: 检查环境变量配置..."

if [ ! -f ".env" ]; then
    echo "  创建 .env 文件..."
    
    cat > .env << 'EOF'
# 应用配置
APP_ENV=development
APP_NAME=未来自我
APP_VERSION=1.0.0

# 数据库配置
DATABASE_URL=postgresql://futureself_user:futureself_pass@localhost:5432/futureself_db

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# AI 服务配置 (Siliconflow)
SILICONFLOW_API_KEY=your_api_key_here
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1

# 加密配置
ENCRYPTION_KEY=your_32_char_encryption_key_here

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 聊天消息限制
MAX_CHAT_MESSAGES=5
EOF
    
    echo "✅ .env 文件已创建"
    echo "⚠️  请编辑 .env 文件，填入你的 API 密钥和加密密钥！"
else
    echo "✅ .env 文件已存在"
fi

echo ""

# ========================================
# 完成
# ========================================
echo "========================================"
echo "  🎉 环境部署完成！"
echo "========================================"
echo ""
echo "📊 服务状态:"
echo "  - PostgreSQL: http://localhost:5432"
echo "  - Redis:      http://localhost:6379"
echo ""
echo "🚀 后续步骤:"
echo ""
echo "  1. 编辑 .env 文件，配置 API 密钥:"
echo "     nano .env    # 或使用你喜欢的编辑器"
echo ""
echo "  2. 启动 FastAPI 开发服务器:"
echo "     uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "  3. 在新终端中启动 Celery Worker:"
echo "     celery -A app.core.celery_app worker --loglevel=info"
echo ""
echo "  4. 运行测试（可选）:"
echo "     pytest tests/ -v"
echo ""
echo "📚 其他命令:"
echo "  - 停止所有服务:    ./setup.sh --stop-only"
echo "  - 查看 Docker 日志: docker-compose logs -f"
echo "  - 重启服务:        docker-compose restart"
echo ""
echo "========================================"

