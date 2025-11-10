-- (P1 关键) 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- (DB v1.3) 表 1: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'ONBOARDING', -- (v1.11) 默认 ONBOARDING
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 2: current_profiles (v1.3 新问卷版)
CREATE TABLE IF NOT EXISTS current_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    demo_data JSONB, -- (v1.3) F2.1 Demo
    vals_data JSONB, -- (v1.3) F2.1 PVQ
    bfi_data JSONB,  -- (v1.3) F2.1 BFI
    story_data JSONB, -- (v1.3) F2.1 Story
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 3: future_profiles (v1.3 新问卷版)
CREATE TABLE IF NOT EXISTS future_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL, -- (F2.2) 职业名称
    future_values TEXT, -- (v1.3) F2.2 模块1
    future_vision TEXT, -- (v1.3) F2.2 模块2
    future_obstacles TEXT, -- (v1.3) F2.2 模块3
    profile_description TEXT, -- (v1.3) API 同步拼接产物 (AI 读取)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 4: letters
CREATE TABLE IF NOT EXISTS letters (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- (F3.1.2) 信件原文
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- (F6.6) PENDING, REPLIES_READY
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 5: letter_replies
CREATE TABLE IF NOT EXISTS letter_replies (
    id UUID PRIMARY KEY,
    letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    future_profile_id UUID NOT NULL REFERENCES future_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- (F4.3) AI 回信
    chat_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- (F3.1.3) NOT_STARTED, COMPLETED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 6: chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    future_profile_id UUID NOT NULL REFERENCES future_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL, -- 'USER' or 'AGENT'
    content TEXT NOT NULL, -- (F3.2.2) 聊天原文
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (DB v1.3) 表 7: reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT, -- (F4.5) WOOP 报告
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATING', -- (F5.3) GENERATING, READY
    created_at TIMESTAMTz DEFAULT NOW()
);

-- (DB v1.3) 表 8: vector_memory
CREATE TABLE IF NOT EXISTS vector_memory (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    future_profile_id UUID REFERENCES future_profiles(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- 'FUTURE_PROFILE' or 'LETTER_CHUNK'
    text_chunk TEXT, -- (P1) 被向量化的文本块
    embedding vector(768) NOT NULL, -- (P1) 768 维, 对应 text-embedding-ada-002
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (P1) 为 RAG 创建索引 (可选, 但推荐)
CREATE INDEX IF NOT EXISTS idx_vector_memory_embedding
ON vector_memory
USING hnsw (embedding vector_cosine_ops);