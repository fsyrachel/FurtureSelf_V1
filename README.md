## FutureSelf 项目说明

这是一个包含 **后端 (Backend, FastAPI)** 和 **前端 (frontend, React + Vite)** 的全栈项目。本说明帮助新开发者在 **Windows** 和 **macOS** 上快速完成本地开发环境的配置与运行。

> 建议按顺序先启动 Backend（含 Postgres + Redis），再启动 frontend。

---

## 一、环境准备

- **通用必备**
  - **Git**: 用于克隆仓库  
  - **Docker Desktop**: 用于启动 Postgres + Redis  

- **后端 (Python)**
  - Python **3.8+**
  - 推荐使用 `venv` 虚拟环境


- **前端 (Node.js)**  
  - 需要 Node.js **18+**（推荐），安装后会自动包含 `npm`
  - 安装步骤：
    - **Windows**：
      1. 打开 `https://nodejs.org`
      2. 下载 **LTS 版本** 的 Windows 安装包（`.msi`）
      3. 按默认选项安装（一路“下一步”）
      4. 安装完成后，打开 PowerShell 执行：
        
         node -v
         npm -v
                  能看到版本号说明安装成功
    - **macOS**：
      - 方式一：官网安装包  
        1. 打开 `https://nodejs.org`  
        2. 下载 macOS 的 **LTS 安装包**（`.pkg`），按提示安装  
      - 方式二：Homebrew  
       
        brew install node
        node -v
        npm -v
                能看到版本号说明安装成功
---

## 二、克隆项目

```bash
git clone <your-repository-url>
cd FurtureSelf_V1
```

目录结构简要说明：
- `Backend/`：FastAPI 后端 + Celery 任务 + Postgres / Redis 配置  
- `frontend/`：React + Vite 前端  

---

## 三、启动后端 (Backend)

### 1. 启动数据库和 Redis（Docker）

在项目根目录或 `Backend/` 目录下执行：

```bash
cd Backend
docker-compose up -d
```

这会启动：
- Postgres（带 pgvector 扩展）
- Redis

### 2. 创建并激活 Python 虚拟环境

仍在 `Backend/` 目录：

#### Windows (PowerShell)
```bash
python -m venv venv
venv\Scripts\activate
```

#### macOS / Linux (bash/zsh)
```bash
python -m venv venv
source venv/bin/activate
```

### 3. 安装后端依赖

```bash
pip install -e .
```

> 这条命令会基于 `setup.py` / `requirements.txt` 安装所有依赖。

### 4. 启动 FastAPI 服务

```bash
uvicorn app.main:app --reload
```

启动成功后，后端 API 默认地址：
- `http://127.0.0.1:8000`
- Swagger 文档：`http://127.0.0.1:8000/docs`

---

## 四、启动前端 (frontend)

### 1. 安装依赖

在项目根目录执行：

```bash
cd frontend
npm install
```

### 2. 配置前端 API 地址（如有需要）

如果前端通过环境变量配置后端地址（例如使用 `.env` 或 `VITE_API_BASE_URL`），请在 `frontend/` 下创建或修改：

```bash
# 示例：frontend/.env.local
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

> 如果前端代码中已经写死了 `http://localhost:8000/api/v1`，本地开发可不改。

### 3. 启动前端开发服务器

```bash
npm run dev
```

启动成功后，前端默认访问地址通常是：
- `http://127.0.0.1:5173`

---

## 五、常见问题排查

- **端口冲突**
  - 后端默认使用 `8000` 端口，前端使用 `5173`，Postgres 使用 `5432`，Redis 使用 `6379`。如端口已被占用，请先关闭对应服务或修改配置。

- **Docker 无法启动或拉取镜像慢**
  - Windows 确保 Docker Desktop 正常运行；
  - macOS 需安装并启动 Docker Desktop；
  - 如镜像拉取慢，可配置镜像加速源。

- **数据库连接失败**
  - 确认 `docker-compose up -d` 已启动并运行；
  - 可使用 `docker-compose ps` 查看容器状态。

---


