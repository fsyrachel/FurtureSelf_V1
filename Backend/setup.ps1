# ========================================
# 未来自我后端 - Windows 快速部署脚本
# ========================================
# 用途：从 Git 克隆后一键启动开发环境
# 作者：FutureSelf Team
# ========================================

param(
    [switch]$SkipDependencies,
    [switch]$StopOnly
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  未来自我后端 - 快速部署工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置工作目录
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $SCRIPT_DIR

# ========================================
# 如果只是停止服务
# ========================================
if ($StopOnly) {
    Write-Host "🛑 正在停止所有服务..." -ForegroundColor Yellow
    
    # 停止 Docker Compose
    if (Test-Path "docker-compose.yml") {
        Write-Host "📦 停止 Docker 服务 (PostgreSQL + Redis)..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "✅ Docker 服务已停止" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✅ 所有服务已停止" -ForegroundColor Green
    exit 0
}

# ========================================
# 步骤 1: 检查先决条件
# ========================================
Write-Host "📋 步骤 1: 检查系统环境..." -ForegroundColor Yellow

# 检查 Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 Docker 或 Docker 未启动" -ForegroundColor Red
    Write-Host "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker Compose
try {
    $dockerComposeVersion = docker-compose --version
    Write-Host "✅ Docker Compose: $dockerComposeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未安装 Docker Compose" -ForegroundColor Red
    exit 1
}

# 检查 Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未找到 Python" -ForegroundColor Red
    Write-Host "请确保已安装 Python 3.11+ 或激活了 Conda 环境" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ========================================
# 步骤 2: 启动 Docker 服务
# ========================================
Write-Host "📦 步骤 2: 启动 Docker 服务 (PostgreSQL + Redis)..." -ForegroundColor Yellow

if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ 错误: 未找到 docker-compose.yml 文件" -ForegroundColor Red
    exit 1
}

# 启动 Docker Compose
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Compose 启动失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker 服务启动成功" -ForegroundColor Green
Write-Host ""

# ========================================
# 步骤 3: 等待服务就绪
# ========================================
Write-Host "⏳ 步骤 3: 等待 PostgreSQL 和 Redis 就绪..." -ForegroundColor Yellow

$maxRetries = 30
$retryCount = 0

# 等待 PostgreSQL
Write-Host "  等待 PostgreSQL..." -ForegroundColor Cyan
while ($retryCount -lt $maxRetries) {
    $pgReady = docker-compose exec -T postgres pg_isready -U futureself_user -d futureself_db 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL 已就绪" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $retryCount++
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ PostgreSQL 启动超时" -ForegroundColor Red
    exit 1
}

# 等待 Redis
Write-Host "  等待 Redis..." -ForegroundColor Cyan
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    $redisReady = docker-compose exec -T redis redis-cli ping 2>$null
    if ($redisReady -eq "PONG") {
        Write-Host "  ✅ Redis 已就绪" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $retryCount++
}

if ($retryCount -eq $maxRetries) {
    Write-Host "❌ Redis 启动超时" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========================================
# 步骤 4: 初始化数据库
# ========================================
Write-Host "🗄️  步骤 4: 初始化数据库扩展..." -ForegroundColor Yellow

if (Test-Path "init_db.sql") {
    docker-compose exec -T postgres psql -U futureself_user -d futureself_db -f - < init_db.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 数据库扩展初始化成功 (pgvector, uuid-ossp)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  数据库扩展初始化失败（可能已存在）" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  未找到 init_db.sql，跳过数据库初始化" -ForegroundColor Yellow
}

Write-Host ""

# ========================================
# 步骤 5: 安装 Python 依赖
# ========================================
if (-not $SkipDependencies) {
    Write-Host "📦 步骤 5: 安装 Python 依赖..." -ForegroundColor Yellow
    
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Python 依赖安装成功" -ForegroundColor Green
        } else {
            Write-Host "❌ Python 依赖安装失败" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⚠️  未找到 requirements.txt" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  步骤 5: 跳过 Python 依赖安装 (使用了 -SkipDependencies 参数)" -ForegroundColor Cyan
}

Write-Host ""

# ========================================
# 步骤 6: 创建 .env 文件（如果不存在）
# ========================================
Write-Host "📝 步骤 6: 检查环境变量配置..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "  创建 .env 文件..." -ForegroundColor Cyan
    
    $envContent = @"
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
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ .env 文件已创建" -ForegroundColor Green
    Write-Host "⚠️  请编辑 .env 文件，填入你的 API 密钥和加密密钥！" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env 文件已存在" -ForegroundColor Green
}

Write-Host ""

# ========================================
# 完成
# ========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "  🎉 环境部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 服务状态:" -ForegroundColor Cyan
Write-Host "  - PostgreSQL: http://localhost:5432" -ForegroundColor White
Write-Host "  - Redis:      http://localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🚀 后续步骤:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 编辑 .env 文件，配置 API 密钥:" -ForegroundColor White
Write-Host "     notepad .env" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. 启动 FastAPI 开发服务器:" -ForegroundColor White
Write-Host "     uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. 在新终端中启动 Celery Worker:" -ForegroundColor White
Write-Host "     celery -A app.core.celery_app worker --loglevel=info --pool=solo" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. 运行测试（可选）:" -ForegroundColor White
Write-Host "     pytest tests/ -v" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 其他命令:" -ForegroundColor Cyan
Write-Host "  - 停止所有服务:    .\setup.ps1 -StopOnly" -ForegroundColor White
Write-Host "  - 查看 Docker 日志: docker-compose logs -f" -ForegroundColor White
Write-Host "  - 重启服务:        docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green

