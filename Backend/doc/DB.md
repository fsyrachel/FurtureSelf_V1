# 数据库架构设计 

- **文档目的**: (v1.3) **P1 架构的最终数据库设计**。

- **架构**: (P1) **PostgreSQL (All-in-One)** + `pgvector` 扩展。

- **版本**: v1.3 

---

## 1. 核心架构决策 (v1.3)

1.  **数据库选型 (P1)**: **PostgreSQL + `pgvector` (All-in-One)**。
    * **理由**: 这是实现 P1 架构（关系型 + 语义 RAG）的最轻量方案。

2.  **数据加密 (P1)**: 所有 PII (姓名、年龄、信件、聊天、问卷) 字段在存入数据库前，**必须**在后端 API (FastAPI) 层面进行加密。

3.  **JSONB 存储 (P1)**: 我们将**广泛**使用 `JSONB` 字段来存储 P1 新问卷的结构化数据（`F2.1 DEMO, PVQ, BFI`）。

4.  **状态管理 (P1)**: `letter_replies` (表 5) **必须**包含 `chat_status` 字段，用于管理"5 条消息闭环"的状态。

5.  **"同步合成"**:
    * **P1 架构 (v1.10)** 没有 `(人格合成器)` 异步 Worker。
    * **变更**: `future_profiles` (表 3) **必须**新增 `future_values`, `future_vision`, `future_obstacles` 三个字段来存储 F2.2 问卷的原始数据。
    * `POST /api/v1/profile/future` 接口**必须**在**同步**（API 层面）将这 3 个字段**拼接 (concatenate)** 成一个字符串，并存入 `profile_description` 字段。
    * P1 的 AI 链 (F4.3, F4.4) 就可以**继续**从 `profile_description` 读取人设，**无需**感知这个变更。

---

## 2. P1 数据库表结构 (Schema v1.3)

### 表 1: `users` (用户表)

* **用途**: 存储核心用户，管理 P1 流程状态。

| 字段名 | 类型 | 约束 | 备注 (FRD v1.11) |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | (F1.1) 匿名登录 ID (`anonymous_user_id`) |
| `status` | `String` | `NOT NULL`, `Default: 'ONBOARDING'` | (F1.1) `ONBOARDING` -> `ACTIVE` |
| `created_at` | `Timestamp` | `Default: NOW()` | |
| `updated_at` | `Timestamp` | `Default: NOW()` | |

### 表 2: `current_profiles` (当前档案)

* **用途**: 结构化存储 F2.1 的 4 部分新问卷。

| 字段名 | 类型 | 约束 | 备注 (FRD v1.11) |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `user_id` | `UUID` | **Foreign Key** (users.id) | `1:1` 关系 |
| **`demo_data`** | `JSONB` | `(加密)` | 存储"1. 基本信息" (姓名, 年龄, 状态...) |
| **`vals_data`** | `JSONB` | `(加密)` | 存储"2. 价值观 (PVQ)" (10个 Likert 键值对) |
| **`bfi_data`** | `JSONB` | `(加密)` | 存储"3. 人格特质 (BFI)" (10个 Likert 键值对) ||
| `created_at` | `Timestamp` | `Default: NOW()` | |
| `updated_at` | `Timestamp` | `Default: NOW()` | |

### 表 3: `future_profiles` (未来档案)

* **用途**: 存储 F2.2 的原始问卷和"同步合成"的人设。

| 字段名 | 类型 | 约束 | 备注 (FRD v1.11) |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `user_id` | `UUID` | **Foreign Key** (users.id) | `1:N` 关系 |
| `profile_name` | `String` | `NOT NULL`, `(加密)` | F2.2 表单: "UX 研究员" |
| **`future_values`** | `TEXT` | `(加密)` | (v1.3 新) F2.2 表单: "模块一 (价值观)" |
| **`future_vision`** | `TEXT` | `(加密)` | (v1.3 新) F2.2 表单: "模块二 (愿景)" |
| **`future_obstacles`** | `TEXT` | `(加密)` | (v1.3 新) F2.2 表单: "模块三 (障碍)" |
| **`profile_description`** | `TEXT` | `(加密)` | **(V1 核心)** 由 API (F2.2) **同步拼接** (Values + Vision + Obstacles) 而成。**P1 AI (F4.x) 只读这个字段**。 |
| `created_at` | `Timestamp` | `Default: NOW()` | |
| `updated_at` | `Timestamp` | `Default: NOW()` | |

### 表 4: `letters` (用户写给未来自我的信)

* **用途**: 存储用户写给未来自我的信件，为 AI 回信提供基础。

| 字段名 | 类型 | 约束 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `user_id` | `UUID` | **Foreign Key** (users.id), `ON DELETE CASCADE` | |
| `content` | `TEXT` | `NOT NULL` | 建议加密后存储 |
| `status` | `String` | `NOT NULL`, `Default: 'PENDING'` | 另有 `REPLIES_READY` |
| `created_at` | `Timestamp` | `Default: NOW()` | |

### 表 5: `letter_replies` (AI 回信)

* **用途**: 存储 AI 针对信件生成的回信，与聊天闭环状态有关。

| 字段名 | 类型 | 约束 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `letter_id` | `UUID` | **Foreign Key** (letters.id), `ON DELETE CASCADE` | |
| `future_profile_id` | `UUID` | **Foreign Key** (future_profiles.id), `ON DELETE CASCADE` | |
| `content` | `TEXT` | `NOT NULL` | AI 回信原文 |
| `chat_status` | `String` | `NOT NULL`, `Default: 'NOT_STARTED'` | `NOT_STARTED`, `COMPLETED` |
| `created_at` | `Timestamp` | `Default: NOW()` | |

### 表 6: `chat_messages` (未来自我聊天记录)

* **用途**: 记录用户与未来自我的对话，支撑 5 条消息闭环。

| 字段名 | 类型 | 约束 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `future_profile_id` | `UUID` | **Foreign Key** (future_profiles.id), `ON DELETE CASCADE` | |
| `user_id` | `UUID` | **Foreign Key** (users.id), `ON DELETE CASCADE` | |
| `sender` | `String` | `NOT NULL` | `USER` 或 `AGENT` |
| `content` | `TEXT` | `NOT NULL` | 聊天内容，建议加密 |
| `created_at` | `Timestamp` | `Default: NOW()` | |

### 表 7: `reports` (WOOP/总结报告)

* **用途**: 存储针对用户生成的总结报告。

| 字段名 | 类型 | 约束 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `user_id` | `UUID` | **Foreign Key** (users.id), `ON DELETE CASCADE` | |
| `content` | `TEXT` | `NULLABLE` | WOOP 报告（JSON/Markdown），建议加密 |
| `status` | `String` | `NOT NULL`, `Default: 'GENERATING'` | 另有 `READY` |
| `created_at` | `Timestamp` | `Default: NOW()` | |

### 表 8: `vector_memory` (向量记忆，pgvector)

* **用途**: 存储向量化的文本片段，用于语义检索与 RAG。

| 字段名 | 类型 | 约束 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **Primary Key** | |
| `user_id` | `UUID` | **Foreign Key** (users.id), `ON DELETE CASCADE` | |
| `future_profile_id` | `UUID` | **Foreign Key** (future_profiles.id), `ON DELETE CASCADE`, `NULLABLE` | `NULL` 表示共享记忆 |
| `doc_type` | `String` | `NOT NULL` | `FUTURE_PROFILE`, `LETTER_CHUNK` 等 |
| `source_doc_id` | `UUID` | `NOT NULL` | 指向原文档 ID |
| `text_chunk` | `TEXT` | `NOT NULL` | 文本块原文，建议加密 |
| `embedding` | `vector(1536)` | `NOT NULL` | OpenAI `text-embedding-3-small` 维度 |
| `created_at` | `Timestamp` | `Default: NOW()` | |

---

## 3. 数据示例 

### current_profiles 示例

```json
{
  "id": "uuid-xxx",
  "user_id": "uuid-user",
  "demo_data": {
    "name": "张三",
    "age": 25,
    "gender": "男"，
    "status": "研究生",
    "field": "计算机科学",
    "interests": ["AI", "UX"],
    "location": "上海",
    "future_location": "新加坡"
  },
  "vals_data": {
    "self_direction": 5,
    "stimulation": 4,
    "hedonism": 4,
    "achievement": 5,
    "power": 2,
    "security": 5,
    "conformity": 3,
    "tradition": 2,
    "benevolence": 4,
    "universalism": 5
  },
  "bfi_data": {
    "extraversion": 4.5,
    "agreeableness": 3.5,
    "conscientiousness": 5.0,
    "neuroticism": 2.0,
    "openness": 4.0
  },
}
```

### future_profiles 示例 (v1.3)

```json
{
  "id": "uuid-yyy",
  "user_id": "uuid-user",
  "profile_name": "UX研究员",
  "future_values": "我希望我的工作能够真正帮助到他人，让产品更加人性化...",
  "future_vision": "我理想的状态是在一家注重用户体验的科技公司工作...",
  "future_obstacles": "我担心我的技术背景不够扎实...",
  "profile_description": "# 价值观 (Values)\n我希望我的工作能够真正帮助到他人，让产品更加人性化...\n\n# 愿景 (Vision)\n我理想的状态是在一家注重用户体验的科技公司工作...\n\n# 障碍 (Obstacles)\n我担心我的技术背景不够扎实..."
}
```

### letters 示例

```json
{
  "id": "2f591cf9-3f81-4b23-9b9c-09cfdbc050d8",
  "user_id": "07c9f816-3c48-4ec0-b255-8ce7fa53331d",
  "content": "亲爱的未来的我，希望你已经……",
  "status": "PENDING",
  "created_at": "2025-11-10T08:15:32+00:00"
}
```

### letter_replies 示例

```json
{
  "id": "cfa569cd-1340-4a37-9b63-a6bf65d0f4b2",
  "letter_id": "2f591cf9-3f81-4b23-9b9c-09cfdbc050d8",
  "future_profile_id": "f6d4bc69-6ae3-4e6c-93e9-97dc86fded6e",
  "content": "嗨，我是未来的你……",
  "chat_status": "NOT_STARTED",
  "created_at": "2025-11-10T08:17:05+00:00"
}
```

### chat_messages 示例

```json
{
  "id": "6744b1ce-92fb-4d61-9412-373dcc0e6e61",
  "future_profile_id": "f6d4bc69-6ae3-4e6c-93e9-97dc86fded6e",
  "user_id": "07c9f816-3c48-4ec0-b255-8ce7fa53331d",
  "sender": "USER",
  "content": "现在的我对未来职业很迷茫，你有什么建议吗？",
  "created_at": "2025-11-10T08:20:11+00:00"
}
```

### reports 示例

```json
{
  "id": "c947857f-ae07-4c2a-9f4d-c38fd4f89b8e",
  "user_id": "07c9f816-3c48-4ec0-b255-8ce7fa53331d",
  "content": null,
  "status": "GENERATING",
  "created_at": "2025-11-10T08:45:56+00:00"
}
```

### vector_memory 示例

```json
{
  "id": "019dd5dc-1d99-455a-bb55-9f17ae3c13c8",
  "user_id": "07c9f816-3c48-4ec0-b255-8ce7fa53331d",
  "future_profile_id": "f6d4bc69-6ae3-4e6c-93e9-97dc86fded6e",
  "doc_type": "FUTURE_PROFILE",
  "source_doc_id": "f6d4bc69-6ae3-4e6c-93e9-97dc86fded6e",
  "text_chunk": "价值观: 我希望自己的工作能帮助到他人……",
  "embedding": "[0.0123, -0.0456, ..., 0.0789]",
  "created_at": "2025-11-10T08:46:22+00:00"
}
```

## 相关文档

- [功能需求文档 (FRD v1.11)](./FRD_v1.11.md)
- [API 接口文档 (API v1.5)](./API_v1.5.md)
- [技术架构文档 (Tech v1.5)](./TECH_ARCHITECTURE_v1.5.md)

---

**文档版本**: v1.3  
**最后更新**: 2025-11-10  
**维护者**: 开发团队

