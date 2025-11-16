# 端到端集成测试指南

## 📋 概述

本目录包含端到端（E2E）集成测试，用于测试真实 Celery/Redis 环境下的完整业务流程。

## 🎯 测试范围

### 已实现的集成测试

1. **信件处理完整流程** (`test_letter_e2e.py`)
   - ✅ 提交信件 → Worker 处理 → 生成回信 → 状态更新
   - ✅ 前端轮询状态流程
   - ✅ 失败重试机制（可选）

2. **报告生成完整流程** (`test_report_e2e.py`)
   - ✅ 触发报告 → Worker 处理 → WOOP报告生成 → 状态更新
   - ✅ 前端轮询状态流程
   - ✅ 幂等性验证

## 🔧 前置要求

### 1. 环境依赖

- ✅ PostgreSQL 数据库运行中
- ✅ Redis 服务运行中
- ✅ Python 虚拟环境已激活
- ✅ 所有依赖已安装 (`pip install -r requirements.txt`)

### 2. 配置准备

确保 `.env` 文件包含正确的配置：

```bash
# 数据库配置
DATABASE_URL=postgresql+psycopg2://futureself:futureself@localhost:5432/futureself_db

# Redis配置
REDIS_URL=redis://localhost:6379/0

# AI服务配置（必须有效，否则任务会失败）
SILICONFLOW_API_KEY=sk-your-valid-api-key
```

### 3. 测试数据库

集成测试会**自动创建**独立的测试数据库：`futureself_test_integration`

- ✅ 第一次运行时自动创建
- ✅ 自动启用 `vector` 和 `uuid-ossp` 扩展
- ✅ 不会影响开发数据库
- ✅ 每次测试后自动清理数据

**如果自动创建失败**，可以手动创建：

```bash
# 方式1：使用 psql
createdb -U futureself futureself_test_integration
psql -U futureself -d futureself_test_integration -c "CREATE EXTENSION IF NOT EXISTS vector"
psql -U futureself -d futureself_test_integration -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'

# 方式2：使用 SQL
psql -U futureself postgres
CREATE DATABASE futureself_test_integration;
\c futureself_test_integration
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

## 🚀 运行步骤

### 方式一：手动启动（推荐用于调试）

#### 步骤1：启动 Redis（如果未运行）

```bash
# 使用 Docker
docker-compose up redis -d

# 或使用本地 Redis
redis-server
```

#### 步骤2：启动 Celery Worker

在**新的终端窗口**中运行：

```bash
# 切换到项目目录
cd D:\Project\FurtureSelf_V1\Backend

# 激活虚拟环境
conda activate backend  # 或 source venv/bin/activate

# 启动 Worker
celery -A app.core.celery_app worker --loglevel=info --pool=solo
```

**重要提示**：
- Windows 环境必须使用 `--pool=solo` 参数
- 保持 Worker 运行，不要关闭终端

#### 步骤3：运行集成测试

在**另一个终端窗口**中：

```bash
# 切换到项目目录
cd D:\Project\FurtureSelf_V1\Backend

# 激活虚拟环境
conda activate backend

# 运行所有集成测试
pytest tests/integration -v -m integration

# 或运行特定测试文件
pytest tests/integration/test_letter_e2e.py -v
pytest tests/integration/test_report_e2e.py -v

# 运行特定测试用例
pytest tests/integration/test_letter_e2e.py::test_letter_submission_full_workflow -v -s
```

### 方式二：使用辅助脚本（自动化）

```bash
# Windows PowerShell
.\tests\integration\run_integration_tests.ps1

# Linux/Mac
bash tests/integration/run_integration_tests.sh
```

## 📊 测试输出示例

```
tests/integration/test_letter_e2e.py::test_letter_submission_full_workflow 
⏳ 等待 Celery Worker 处理信件...
   状态检查: PENDING -> PENDING -> REPLIES_READY
✅ 测试通过：生成了 3 封回信
PASSED

tests/integration/test_report_e2e.py::test_report_generation_full_workflow 
⏳ 等待 Celery Worker 生成报告...
   状态检查: GENERATING -> GENERATING -> READY
✅ 测试通过：报告生成成功
   Wish: 成为一名能够理解人与技术关系的用户体验研究员...
   Outcome: 能够在工作中将用户需求与技术实现有效对接...
PASSED
```

## ⚠️ 常见问题

### 1. 测试超时

**问题**：测试一直等待，最后超时失败

**原因**：
- Celery Worker 未启动
- Worker 连接的 Redis 地址不正确
- AI API 密钥无效或配额耗尽

**解决方案**：
```bash
# 检查 Worker 是否运行
ps aux | grep celery  # Linux/Mac
Get-Process | Where-Object {$_.Name -like "*celery*"}  # Windows PowerShell

# 检查 Redis 连接
redis-cli ping  # 应返回 PONG

# 检查 Worker 日志
# 在 Worker 终端查看是否有错误信息
```

### 2. Worker 启动失败

**问题**：`celery -A app.core.celery_app worker` 报错

**解决方案**：
```bash
# Windows 用户必须添加 --pool=solo
celery -A app.core.celery_app worker --loglevel=info --pool=solo

# 检查是否在正确的目录
pwd  # 应该在 Backend 目录

# 检查模块导入
python -c "from app.core.celery_app import celery_app; print(celery_app)"
```

### 3. AI 服务错误

**问题**：Worker 处理任务时 AI 调用失败

**解决方案**：
```bash
# 检查 API 密钥
echo $SILICONFLOW_API_KEY

# 测试 API 连接
curl -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  https://api.siliconflow.cn/v1/models
```

### 4. 数据库连接错误

**问题**：测试启动时数据库连接失败

**解决方案**：
```bash
# 确保 PostgreSQL 运行中
pg_isready -h localhost -p 5432

# 检查数据库连接
psql -U futureself -d futureself_db -c "SELECT 1"

# 如果数据库不存在，创建它
createdb -U futureself futureself_test_integration
```

## 🔍 调试技巧

### 1. 查看 Worker 日志

在 Worker 终端中，你会看到任务执行的详细日志：

```
[2025-01-01 12:00:00,000: INFO/MainProcess] Task process_letter[abc-123] received
[2025-01-01 12:00:05,000: INFO/MainProcess] Task process_letter[abc-123] succeeded
```

### 2. 使用 `-s` 参数查看测试输出

```bash
pytest tests/integration/test_letter_e2e.py -v -s
```

这会显示测试中的 `print()` 输出，包括轮询状态等信息。

### 3. 降低超时时间（快速验证）

编辑测试文件，修改 `timeout` 参数：

```python
# 从 60 秒改为 20 秒（快速失败）
wait_for_task_completion(..., timeout=20)
```

### 4. 只运行特定标记的测试

```bash
# 只运行 Celery 相关测试
pytest -m celery -v

# 跳过慢速测试
pytest -m "integration and not slow" -v
```

## 📝 测试标记说明

```python
@pytest.mark.integration  # 集成测试标记
@pytest.mark.celery       # 需要 Celery Worker
@pytest.mark.slow         # 运行时间较长的测试（>30秒）
```

## 🎯 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_USER: futureself
          POSTGRES_PASSWORD: futureself
          POSTGRES_DB: futureself_db
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd Backend
          pip install -r requirements.txt
      
      - name: Start Celery Worker
        run: |
          cd Backend
          celery -A app.core.celery_app worker --loglevel=info &
          sleep 5
      
      - name: Run Integration Tests
        run: |
          cd Backend
          pytest tests/integration -v -m integration
        env:
          DATABASE_URL: postgresql+psycopg2://futureself:futureself@localhost:5432/futureself_db
          REDIS_URL: redis://localhost:6379/0
          SILICONFLOW_API_KEY: ${{ secrets.SILICONFLOW_API_KEY }}
```

## 📚 扩展阅读

- [Celery 文档](https://docs.celeryq.dev/)
- [pytest 集成测试最佳实践](https://docs.pytest.org/en/stable/goodpractices.html)
- [FastAPI 测试指南](https://fastapi.tiangolo.com/tutorial/testing/)

## 🤝 贡献指南

添加新的集成测试时：

1. ✅ 使用 `@pytest.mark.integration` 标记
2. ✅ 如果需要 Worker，添加 `@pytest.mark.celery` 标记
3. ✅ 使用 `wait_for_task_completion()` 辅助函数等待异步任务
4. ✅ 设置合理的超时时间（信件60秒，报告90秒）
5. ✅ 添加清晰的输出信息（使用 `print()`）
6. ✅ 验证完整的业务流程，不只是状态

---

**文档版本**: v1.0  
**最后更新**: 2025-01-15  
**维护者**: 后端开发团队

