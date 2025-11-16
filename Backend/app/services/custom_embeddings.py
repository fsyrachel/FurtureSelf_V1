import logging
import httpx
from typing import List
from langchain_core.embeddings import Embeddings
from app.core.config import settings
import asyncio

logger = logging.getLogger(__name__)

# (P1 v1.10) 硅基流动 API 客户端
siliconflow_client = httpx.AsyncClient(
    base_url=settings.SILICONFLOW_API_BASE,
    headers={
        "Authorization": f"Bearer {settings.SILICONFLOW_API_KEY}",
        "Content-Type": "application/json"
    },
    timeout=30.0
)

class SiliconflowEmbeddings(Embeddings):
    """
    自定义的 LangChain 适配器
    """
    
    async def _call_siliconflow_api(self, input_texts: List[str]) -> List[List[float]]:
        """ 封装的 API 调用 (异步) """
        
        if not settings.SILICONFLOW_API_KEY or "sk-..." in settings.SILICONFLOW_API_KEY:
             logger.error("SILICONFLOW_API_KEY 未在 .env 中正确配置!")
             raise ValueError("Embedding API Key 未配置")
             
        try:
            payload = {
                "model": settings.EMBEDDING_MODEL_NAME, # "BAAI/bge-m3"
                "input": input_texts
            }
            
            response = await siliconflow_client.post("/embeddings", json=payload)
            response.raise_for_status() 
            
            response_json = response.json()
            data = response_json.get("data", [])
            data.sort(key=lambda x: x.get("index", 0))
            embeddings = [item.get("embedding", []) for item in data]
            
            if not embeddings or len(embeddings) != len(input_texts):
                raise ValueError("硅基流动 API 返回的 embedding 数量与输入不匹配")
                
            if len(embeddings[0]) != 1024:
                raise ValueError(f"硅基流动 API 返回了 {len(embeddings[0])} 维, 但 DB (v1.3) 期望 1024 维。")
                
            return embeddings

        except httpx.HTTPStatusError as e:
            logger.error(f"硅基流动 API 错误: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"调用 硅基流动 Embedding API 时失败: {e}", exc_info=True)
            raise

    # 实现 LangChain 的 async 接口
    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        """(P1 v1.12) (Async) - 用于 F2.2 / F3.1.2 (RAG 写入)"""
        logger.debug(f"(RAG Write Async) 正在为 {len(texts)} 个文档块调用 硅基流动...")
        try:
            return await self._call_siliconflow_api(texts)
        except Exception as e:
            logger.error(f"aembed_documents (async) 失败: {e}")
            raise e

    async def aembed_query(self, text: str) -> List[float]:
        """(P1 v1.12) (Async) - 用于 F4.4 (RAG 读取)"""
        logger.debug(f"(RAG Read Async) 正在为 1 个查询调用 硅基流动...")
        try:
            results = await self._call_siliconflow_api([text])
            return results[0]
        except Exception as e:
            logger.error(f"aembed_query (async) 失败: {e}")
            raise e

    # (P1 v1.12) 我们 *废弃* (deprecate) sync 接口
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """(P1 v1.12 已废弃) (Sync)"""
        logger.error("embed_documents (Sync) 已被废弃! 必须使用 aembed_documents。")
        raise RuntimeError("asyncio.run() cannot be called from a running event loop. Use aembed_documents.")

    def embed_query(self, text: str) -> List[float]:
        """(P1 v1.12 已废弃) (Sync)"""
        logger.error("embed_query (Sync) 已被废弃! 必须使用 aembed_query。")
        raise RuntimeError("asyncio.run() cannot be called from a running event loop. Use aembed_query.")

# (P1 v1.10) 实例化 *我们* 的模型
embeddings_model = SiliconflowEmbeddings()