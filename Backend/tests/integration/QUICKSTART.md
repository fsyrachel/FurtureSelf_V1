# 🚀 快速开始 - 5分钟运行第一个集成测试

## 最简步骤

### Windows 用户

```powershell
# 1. 确保在 Backend 目录
cd D:\Project\FurtureSelf_V1\Backend

# 2. 启动 Redis（如果未运行）
docker-compose up redis -d

# 3. 启动 PostgreSQL（如果未运行）
docker-compose up postgres -d

# 4. 打开新终端，启动 Celery Worker
celery -A app.core.celery_app worker --loglevel=info --pool=solo

# 5. 在原终端运行测试（首次运行会自动创建测试数据库）
pytest tests/integration/test_letter_e2e.py::test_letter_submission_full_workflow -v -s
```

### Linux/Mac 用户

```bash
# 1. 确保在 Backend 目录
cd /path/to/FurtureSelf_V1/Backend

# 2. 启动 Redis（如果未运行）
docker-compose up redis -d

# 3. 启动 PostgreSQL（如果未运行）
docker-compose up postgres -d

# 4. 打开新终端，启动 Celery Worker
celery -A app.core.celery_app worker --loglevel=info

# 5. 在原终端运行测试（首次运行会自动创建测试数据库）
pytest tests/integration/test_letter_e2e.py::test_letter_submission_full_workflow -v -s
```

## 期望输出

```
tests/integration/test_letter_e2e.py::test_letter_submission_full_workflow 

📝 创建集成测试数据库: futureself_test_integration
✅ 数据库 futureself_test_integration 创建成功
📝 启用 PostgreSQL 扩展...
✅ 扩展启用成功

⏳ 等待 Celery Worker 处理信件...
✅ 测试通过：生成了 3 封回信

PASSED [100%]

========================= 1 passed in 15.23s =========================
```

> 注意：首次运行时会看到数据库创建信息，后续运行不会再显示

## 故障排除

### ❌ 测试超时
**原因**: Worker 未启动  
**解决**: 检查第3步，确保 Worker 终端显示 "ready" 状态

### ❌ Redis 连接失败
**原因**: Redis 未运行  
**解决**: 运行 `docker-compose up redis -d` 或 `redis-server`

### ❌ AI 服务错误
**原因**: API 密钥无效  
**解决**: 检查 `.env` 文件中的 `SILICONFLOW_API_KEY`

## 下一步

✅ 运行所有集成测试：
```bash
pytest tests/integration -v
```

✅ 查看完整文档：
```bash
cat tests/integration/README.md
```

✅ 使用自动化脚本：
```bash
# Windows
.\tests\integration\run_integration_tests.ps1

# Linux/Mac
bash tests/integration/run_integration_tests.sh
```

