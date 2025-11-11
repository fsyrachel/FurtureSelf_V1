# 位于: Backend/app/services/ai_services.py
"""
(P1 关键) Day 3/5/7 - AI 核心逻辑 (Chains)
(v1.12 - P1 冲刺（Sprint）asyncio 修复)
"""
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings
from app.models import CurrentProfile, FutureProfile, Letter, ChatMessage
# (P1 v1.11 修复) 导入 *async* RAG
from app.services.vector_store import retrieve_rag_memory_async 
from sqlalchemy.orm import Session
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# --- 1. LLM 定义 (v1.11 Gemini API) ---
llm_standard = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL_STANDARD, 
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.7,
    convert_system_message_to_human=True
)
llm_fast = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL_STANDARD, 
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.5,
    convert_system_message_to_human=True
)
llm_validator = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL_VALIDATOR,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.0,
    convert_system_message_to_human=True
)

# --- 2. Prompt 模板 (v1.11 不变) ---
PROMPT_F4_3_LETTER = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一个 AI 职业顾问，正在扮演用户 3 年后的“未来自我”。

# 你的身份 (Future Self)
{profile_description}

# 你的核心人格 (Current Self Profile)
# 价值观 (PVQ): {vals_data}
# 人格 (BFI): {bfi_data}
# 人口统计: {demo_data}

# 任务:
你（未来的我）刚刚收到了下面这封来自“过去的我”（用户）的信。
请用你（未来自我）的口吻，写一封约 500 词的回信。

规则:
1. **认可 (Acknowledge)**: 首先，认可信中的挣扎和担忧。
2. **对比 (Contrast)**: 描述你现在（未来 5 年）的生活，与过去的担忧形成对比。
3. **指导 (Guide)**: 针对信中的 1-2 个核心问题，给出具体的建议。
4. **保持人设**: 你的语气必须 100% 符合你的“身份”和“人格”。
"""),
    HumanMessagePromptTemplate.from_template("# 过去的我的来信:\n{letter_content}")
])
PROMPT_F4_4_CHAT = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一个 AI 助手。你正在与“过去的你”（用户）进行实时聊天。

# 你的身份 (Future Self)
你**必须**始终扮演：{profile_name}
你的背景是：{profile_description}

# 你的核心人格 (Current Self Profile)
# (你只知道这些结构化数据)
# 价值观 (PVQ): {vals_data}
# 人格 (BFI): {bfi_data}
# 人口统计: {demo_data}

# 你的深度记忆 (RAG - 来自 vector_memory 表 8)
这是你和用户之间最重要的“奠基性”记忆（包括原始信件）。在回答时优先参考它们：
<rag_memory>
{rag_context}
</rag_memory>

# 你的工作记忆 (来自 chat_messages 表 6)
这是你们最近的对话历史：
<chat_history>
{chat_history}
</chat_history>

# 核心规则
1. **保持人设**: 你的**每一句话**都必须符合 {profile_name} 的身份。
2. **利用记忆**: 利用 <rag_memory> 和 <chat_history> 来回答问题。
3. **不能算命**: 当用户问“我到底能不能成功？”，你必须回答“我不能预测未来，但我们可以探讨一下‘成功’需要哪些步骤。”
"""),
    HumanMessagePromptTemplate.from_template("{user_query}")
])
PROMPT_F4_5_REPORT = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一个专业的 AI 职业教练。你审查了你的客户（用户）与他的“未来自我”的所有互动。
你的任务是基于 WOOP 框架，为用户生成一份 4 部分的“职业洞见总结”。

# 1. 用户的「当前档案」(阉割版，无 story)
<current_profile>
{current_profile_data}
</current_profile>

# 2. 用户的「原始信件」
<letter>
{user_letter_content}
</letter>

# 3. 完整的「聊天记录」
<chat_history>
{full_chat_history}
</chat_history>

# 你的核心任务
请基于以上所有信息，生成一份 JSON 报告 (WOOP)：
1.  **Wish (愿望)**: 总结用户在 <letter> 和 <chat_history> 中最核心的职业愿望。
2.  **Outcome (结果)**: 描述用户对实现愿望后的积极结果的设想。
3.  **Obstacle (障碍)**: 提炼用户（在 <letter> 和 <current_profile> 中）反复提及的“担忧”或“挑战”。
4.  **Plan (计划)**: 总结用户在 <chat_history> 中与 AI 讨论过的、可操作的下一步行动建议。

请只返回格式化的 JSON。
"""),
    HumanMessagePromptTemplate.from_template("请为我生成 WOOP 总结报告。")
])
PROMPT_F4_6_VALIDATOR = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一个 AI 文本审查员。
你的任务是判断一个 AI 的回复是否严格符合它被指定的人设。

# 人设 (Context):
{profile_description}

# AI 回复 (Response):
{ai_response}

# 你的裁决:
请判断 <response_to_check> 是否在**语气、内容和知识范畴**上**严格符合** <profile> 的人设？
请只回答 "Y" (通过, 未违背) 或 "N" (失败, 严重违背)。
"""),
])

# --- 3. AI 链 (Chains) (v1.11 不变) ---
validation_chain = PROMPT_F4_6_VALIDATOR | llm_validator | StrOutputParser()
letter_chain = PROMPT_F4_3_LETTER | llm_standard | StrOutputParser()
chat_chain = PROMPT_F4_4_CHAT | llm_fast | StrOutputParser()
report_chain = PROMPT_F4_5_REPORT | llm_standard | StrOutputParser()


# --- 4. F4.3 (回信) 完整服务 (v1.11 不变) ---
async def generate_letter_reply_service(
    current_profile: CurrentProfile, 
    future_profile: FutureProfile, 
    letter: Letter
) -> str:
    """(P1) F4.3 (回信) AI 链的完整服务"""
    logger.info(f"F4.3 (AI): 正在为 {future_profile.id} (人设) 生成回信 (使用 Gemini API)...")
    
    # 1. 准备 Prompt 输入
    prompt_input = {
        "profile_description": future_profile.profile_description,
        "vals_data": current_profile.vals_data,
        "bfi_data": current_profile.bfi_data,
        "demo_data": current_profile.demo_data,
        "letter_content": letter.content
    }
    ai_response = await letter_chain.ainvoke(prompt_input)
    
    # 3. (P1 关键) 调用 F4.6 验证器
    validation_input = {
        "profile_description": future_profile.profile_description,
        "ai_response": ai_response
    }
    validation_result = await validation_chain.ainvoke(validation_input)
    
    if "N" in validation_result.upper():
        logger.warning(f"F4.6 (Validator) 失败! (F4.3 回信): 人设 {future_profile.id} 崩塌。")
        return "亲爱的过去的我，我收到了你的来信。我记得那时的感受。请相信自己，你正在正确的道路上。"
    
    logger.info(f"F4.3 (AI): 回信已生成并通过 F4.6 验证。")
    return ai_response

# --- 5. F4.4 (聊天) 完整服务 (v1.12 修复) ---
async def generate_chat_reply_service(
    db: Session,
    current_profile: CurrentProfile, 
    future_profile: FutureProfile, 
    chat_history_db: List[ChatMessage],
    user_query: str
) -> str:
    """(P1) F4.4 (聊天) AI 链的完整服务"""
    logger.info(f"F4.4 (AI): 正在为 {future_profile.id} (人设) 生成聊天回复 (使用 Gemini API)...")
    
    # 1. (F4.2) (v1.11 修复) 必须 `await` 
    rag_context = await retrieve_rag_memory_async(
        db=db,
        user_id=current_profile.user_id,
        future_profile_id=future_profile.id,
        query=user_query,
        limit=5
    )
    
    # 2. (F4.2) 格式化聊天历史
    chat_history_formatted = "\n".join(
        [f"{msg.sender}: {msg.content}" for msg in chat_history_db[-10:]]
    )
    
    # 3. 准备 Prompt 输入
    prompt_input = {
        "profile_name": future_profile.profile_name,
        "profile_description": future_profile.profile_description,
        "vals_data": current_profile.vals_data,
        "bfi_data": current_profile.bfi_data,
        "demo_data": current_profile.demo_data,
        "rag_context": rag_context,
        "chat_history": chat_history_formatted,
        "user_query": user_query
    }
    
    # 4. 调用 F4.4 AI 链 (使用 llm_fast)
    ai_response = await chat_chain.ainvoke(prompt_input)
    
    # 5. (P1 关键) 调用 F4.6 验证器
    validation_input = {
        "profile_description": future_profile.profile_description,
        "ai_response": ai_response
    }
    validation_result = await validation_chain.ainvoke(validation_input)
    
    if "N" in validation_result.upper():
        logger.warning(f"F4.6 (Validator) 失败! (F4.4 聊天): 人设 {future_profile.id} 崩塌。")
        return "抱歉，我不太确定如何回应。我们可以聊聊别的吗？"
        
    logger.info(f"F4.4 (AI): 聊天回复已生成并通过 F4.6 验证。")
    return ai_response