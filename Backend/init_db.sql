-- 1. 启用必要的扩展
-- 启用 pgvector 用于向量存储和相似性搜索
CREATE EXTENSION IF NOT EXISTS vector;
-- 启用 uuid-ossp 以使用 gen_random_uuid() 函数生成 UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建一个触发器函数，用于自动更新 updated_at 字段
-- SQLAlchemy 中的 onupdate=func.now() 对应于数据库中的 BEFORE UPDATE 触发器
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建表
---
-- 表 1: users
-- 存储核心用户的信息
---
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'ONBOARDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为 users 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 2: current_profiles
-- 存储用户当前状态的画像数据 (一对一
CREATE TABLE IF NOT EXISTS current_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    demo_data JSON,
    vals_data JSON,
    bfi_data JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 为 current_profiles 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_current_profiles
BEFORE UPDATE ON current_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 3: future_profiles
-- 存储用户创建的未来自我画像 (一个用户可以有多个
CREATE TABLE IF NOT EXISTS future_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    profile_name VARCHAR(255) NOT NULL,
    future_values TEXT,
    future_vision TEXT,
    future_obstacles TEXT,
    profile_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 为 future_profiles 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_future_profiles
BEFORE UPDATE ON future_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 4: letters
-- 存储用户写给未来自我的信 (一个用户可以写多封
CREATE TABLE IF NOT EXISTS letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 为 letters 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_letters
BEFORE UPDATE ON letters
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 5: letter_replies
-- 存储未来自我对信件的回复 (一封信可以有多个回复，一个回复对应一个未来画像
CREATE TABLE IF NOT EXISTS letter_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter_id UUID NOT NULL,
    future_profile_id UUID NOT NULL,
    content TEXT NOT NULL,
    chat_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_letter
        FOREIGN KEY(letter_id) 
        REFERENCES letters(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_future_profile
        FOREIGN KEY(future_profile_id) 
        REFERENCES future_profiles(id)
        ON DELETE CASCADE
);

-- 为 letter_replies 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_letter_replies
BEFORE UPDATE ON letter_replies
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 6: chat_messages
-- 存储用户与未来自我的聊天记录
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    future_profile_id UUID NOT NULL,
    user_id UUID NOT NULL,
    sender VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_future_profile
        FOREIGN KEY(future_profile_id) 
        REFERENCES future_profiles(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 为 chat_messages 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_chat_messages
BEFORE UPDATE ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 7: reports
-- 存储为用户生成的报告
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'GENERATING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 为 reports 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_reports
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

---
-- 表 8: vector_memory
-- 存储所有可被检索的文本块及其向量
CREATE TABLE IF NOT EXISTS vector_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    future_profile_id UUID, -- 可以为 NULL，表示是用户通用记忆，而不是特定未来画像的记忆
    doc_type VARCHAR(50) NOT NULL,
    text_chunk TEXT,
    embedding VECTOR(1024), -- 假设向量维度为 1024
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_future_profile
        FOREIGN KEY(future_profile_id) 
        REFERENCES future_profiles(id)
        ON DELETE CASCADE
);

-- 为 vector_memory 表附加 updated_at 触发器
CREATE TRIGGER set_timestamp_vector_memory
BEFORE UPDATE ON vector_memory
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();