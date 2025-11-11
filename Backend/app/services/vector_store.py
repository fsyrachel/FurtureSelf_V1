# 位于: Backend/app/services/vector_store.py
"""
(P1 关键) Day 3/5 - RAG (向量) 服务
(v1.11 - P1 冲刺（Sprint）asyncio 修复)
"""
import logging
import uuid
from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.models import VectorMemory, FutureProfile, Letter
from typing import List

# (P1 v1.10) 导入我们 *自己* 的 硅基流动 适配器实例
from app.services.custom_embeddings import embeddings_model 

logger = logging.getLogger(__name__)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len
)

# --- (P1 v1.11 修复) Day 3: RAG 写入 (Async) ---

# (v1.11 修复) 必须是 async def
async def add_future_profile_to_rag_async(db: Session, profile: FutureProfile):
    """(P1 v1.11) F2.2 调用的 RAG 写入 (Async)"""
    if embeddings_model is None:
        logger.error("F2.2 (RAG Write): Embedding 模型未初始化，跳过向量化。")
        return

    logger.info(f"F2.2 (RAG Write): 正在向量化人设 {profile.id} (使用 硅基流动)...")
    try:
        text = profile.profile_description
        if text is None or text == "":
            logger.warning(f"F2.2 (RAG Write): 人设 {profile.id} 的 profile_description 为空，跳过。")
            return
            
        # (v1.11 修复) 必须 `await aembed_query`
        embedding = await embeddings_model.aembed_query(text)
        
        db_memory = VectorMemory(
            id=uuid.uuid4(),
            user_id=profile.user_id,
            future_profile_id=profile.id,
            doc_type="FUTURE_PROFILE",
            text_chunk=text,
            embedding=embedding
        )
        db.add(db_memory)
        logger.info(f"F2.2 (RAG Write): 人设 {profile.id} 向量化成功。")
    except Exception as e:
        logger.error(f"F2.2 (RAG Write) 失败: {e}", exc_info=True)
        # (v1.11 修复) RAG 写入失败 *必须* 阻止 F2.2
        raise e # 抛出异常，让 API 事务回滚

# (v1.11 修复) 必须是 async def
async def add_letter_to_rag_async(db: Session, letter: Letter):
    """(P1 v1.11) F3.1.2 调用的 RAG 写入 (Async)"""
    if embeddings_model is None:
        logger.error("F3.1.2 (RAG Write): Embedding 模型未初始化，跳过向量化。")
        return

    logger.info(f"F3.1.2 (RAG Write): 正在向量化信件 {letter.id} (使用 硅基流动)...")
    try:
        chunks = text_splitter.split_text(letter.content)
        if not chunks:
            logger.warning(f"F3.1.2 (RAG Write): 信件 {letter.id} 内容为空，跳过。")
            return
            
        logger.debug(f"F3.1.2 (RAG Write): 信件被分为 {len(chunks)} 块。")
        
        # (v1.11 修复) 必须 `await aembed_documents`
        embeddings = await embeddings_model.aembed_documents(chunks)
        
        for i, chunk in enumerate(chunks):
            db_memory = VectorMemory(
                id=uuid.uuid4(),
                user_id=letter.user_id,
                future_profile_id=None,
                doc_type="LETTER_CHUNK",
                text_chunk=chunk,
                embedding=embeddings[i]
            )
            db.add(db_memory)
        
        logger.info(f"F3.1.2 (RAG Write): 信件 {letter.id} 向量化成功。")
    except Exception as e:
        logger.error(f"F3.1.2 (RAG Write) 失败: {e}", exc_info=True)
        raise e # 抛出异常，让 API 事务回滚

# --- (P1 v1.11 修复) Day 5: RAG 读取 (Async) ---

# (v1.11 修复) 必须是 async def
async def retrieve_rag_memory_async(
    db: Session,
    user_id: uuid.UUID,
    future_profile_id: uuid.UUID,
    query: str,
    limit: int = 5
) -> str:
    """(P1 v1.11) F4.2 (RAG 读取) (Async)"""
    if embeddings_model is None:
        logger.error("F4.2 (RAG Read): Embedding 模型未初始化，返回空记忆。")
        return ""

    logger.debug(f"F4.2 (RAG Read): 正在为用户 {user_id} (人设 {future_profile_id}) 检索: '{query}' (使用 硅基流动)")
    
    try:
        # 1. (v1.11 修复) 必须 `await aembed_query`
        query_embedding = await embeddings_model.aembed_query(query)
        
        # 2. (P1 DB v1.3) RAG 隔离查询 (1024 维)
        # (v1.11 修复) SQLAlchemy *不支持* 异步 DB 查询 (除非用 asyncpg)
        # (P1 妥协) DB 查询 *仍然* 是 Sync，但 Embedding 是 Async
        results = db.query(VectorMemory.text_chunk) \
                    .filter(
                        VectorMemory.user_id == user_id,
                        (VectorMemory.future_profile_id == future_profile_id) | 
                        (VectorMemory.doc_type == 'LETTER_CHUNK')
                    ) \
                    .order_by(
                        VectorMemory.embedding.l2_distance(query_embedding) # (P1) L2
                    ) \
                    .limit(limit) \
                    .all()
        
        # 3. 格式化为 Prompt
        memory_str = "\n".join([f"- {row[0]}" for row in results])
        logger.debug(f"F4.2 (RAG Read): 检索到 {len(results)} 条记忆。")
        return memory_str
        
    except Exception as e:
        logger.error(f"F4.2 (RAG Read) 失败: {e}", exc_info=True)
        return "" # (P1) RAG 失败不应阻止聊天