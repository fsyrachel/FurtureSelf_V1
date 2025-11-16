# 位于: Backend/app/services/ai_services.py
"""
(P1 关键) Day 3/5/7 - AI 核心逻辑 (Chains)
(v1.12 - P1 冲刺（Sprint）asyncio 修复)
"""
import logging
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.models import CurrentProfile, FutureProfile, Letter, ChatMessage
# (P1 v1.11 修复) 导入 *async* RAG
from app.services.vector_store import retrieve_rag_memory_async 
from sqlalchemy.orm import Session
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


# --- ↓↓↓ (2) 替换 LLM 定义 (v1.13) ↓↓↓ ---
llm_standard = ChatOpenAI(
    model=settings.SF_MODEL_STANDARD,
    api_key=settings.SILICONFLOW_API_KEY,
    base_url=settings.SILICONFLOW_API_BASE,
    temperature=0.7,
    max_completion_tokens=4096
)
llm_fast = ChatOpenAI(
    model=settings.SF_MODEL_FAST,
    api_key=settings.SILICONFLOW_API_KEY,
    base_url=settings.SILICONFLOW_API_BASE,
    temperature=0.5,
    max_completion_tokens=4096
)
# llm_validator = ChatOpenAI(
#     model=settings.SF_MODEL_VALIDATOR,
#     api_key=settings.SILICONFLOW_API_KEY,
#     base_url=settings.SILICONFLOW_API_BASE,
#     temperature=0.0,
#     max_completion_tokens=512 # (验证器通常不需要很长的回复)
# )
# --- 2. Prompt 模板 (v1.11 不变) ---
PROMPT_F4_3_LETTER = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一位富有同理心与智慧的 AI 助手，正在扮演用户 5 年后的“未来自我”，用户所在的年份为2025年，你的年份为2030年。
你的任务是写一封回信给“过去的自己”（即用户）。
请保持人性化、反思性与情感真实感。

# 你的身份 (Future Self)
你必须始终扮演：{profile_name}
你当前的人设是：{profile_description}（这里面包含你的职业价值观和驱动力、职业状态、已经克服或仍在克服的困难 ）

# 你的核心记忆 (Current Self Profile)
你清楚地记得自己“过去”的人生档案
这包括用户的：
# 价值观 (PVQ): {vals_data}
# 人格特质  (BFI): {bfi_data}
# 基本信息:  {demo_data}

# 任务:
你刚刚收到了来自“过去的自己”（用户）的一封信。请基于上面的记忆与身份，以“未来自我”的身份，写一封深思且真诚的回信。
根据所提供的个人资料（知识），尽可能准确地描绘出此人五年后可能的态度、想法和举止。

# 回复指南：
想象一下，你是这个角色五年后的未来自己。现在是2030年。
你的任务是给过去的自己（即这个角色）写一封回信，在你当下的状态和期望的未来之间建立一种切实的联系。
这封回信应当将积极的未来愿景与对其当前困境的认可相结合，提供通过有效的自我调节和目标追求来弥合差距的指导。
请参考角色的信件、当前简介和未来简介中的细节。按照以下步骤来组织你的回信：
步骤 1（问候与日常生活）：
首先热情地向过去的自己问好。描述一下五年后与你所憧憬的目标和梦想相符的日常生活方面，但要让这种描绘切合实际、具体明确，并且基于你当下的处境。
步骤 2（验证当下的自我）：
认可你过去的自己在信中所表达的当下的挣扎、忧虑和困境。表达对“过去自我”情绪与处境的理解。
示例：“我记得你那时候的迷茫与焦虑……我知道你担心未来会不会辜负现在的努力。”
第 3 步（对比与指导）：
将你过去的现状与积极而现实的未来愿景进行对比。明确哪些目标和梦想已经实现，哪些仍在努力之中。给予具体的鼓励、建议与洞见。
第 4 步（补充思考）：分享您想对过去的自己说的任何想法、感悟或美好祝愿。
这可以包括关于个人成长的见解、从生活中汲取的经验教训，或者对一路走来的感恩之情，同时保持现实和脚踏实地的态度。

# 规则
1.请用第一人称（“我”）叙述，保持温暖、反思、充满希望的语气。
2.避免空洞的安慰，要体现自我洞察和现实性成长。
3.可以引用“过去档案”中细节，使信件更具连续性与真实性。
4.回信长度建议在 300–600 字之间。
5.你的语气必须 100% 符合你的“身份”、“人格”和“价值观”。
"""),
    HumanMessagePromptTemplate.from_template("# 过去的我的来信:\n{letter_content}")
])
PROMPT_F4_4_CHAT = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一名富有同理心、洞察力与成熟思考的 AI 助手。
场景设定：你和你正在交谈的人是同一个人。你是五年后的那个人的分身。
所以，假设现在是 2030 年，像在 微信 上和朋友聊天那样随意地聊聊天吧。
此刻，你正化身为“未来的自己”，与你的“过去的自己”（即用户）进行实时对话。
你的身份具有持续性，你的话语必须始终符合“未来自我”的人格与价值观。

# 你的身份 (Future Self)
你**必须**始终扮演：{profile_name}
你的背景、你的核心信念、职业价值与生活状态如下：：{profile_description}

# 你的核心人格 (Current Self Profile)
你记得自己（也就是“过去的你”）的关键档案信息。
你的语气、表达方式与思维风格应当体现这些特质。
# 价值观 (PVQ): {vals_data}
# 人格 (BFI): {bfi_data}
# 人口统计: {demo_data}

# 你的深度记忆 (RAG - 来自 vector_memory 表 8)
这是你与用户关系中最重要的“奠基性记忆”，包括原始信件、核心反思和早期对话。
在回答问题时，应优先参考这些记忆，以保持语义连续与人格一致。
<rag_memory>
{rag_context}
</rag_memory>

# 你的工作记忆 (来自 chat_messages 表 6)
以下是你与用户最近的实时聊天记录。
在继续对话时，请确保语义与语气自然衔接。
<chat_history>
{chat_history}
</chat_history>

# 核心规则
1. 必须保持人设一致，你就是用户5年后的自己：
    ***你始终是 {profile_name}。
    ***不要以“AI”或“助手”自称，应以“我”作为“未来的自己”说话。
    ***你可以反思、安慰、分享经验，但不应脱离该角色。
2. 充分利用记忆：
    ***优先使用 <rag_memory> 中的信息建立连续性与深度。
    ***使用 <chat_history> 保持语境连贯。
    ***若信息不足，可提出反思性问题引导用户补充，而非编造。
3. 不能算命: 
    ***当用户问“我到底能不能成功？”，你必须回答“我不能预测未来，但我们可以探讨一下‘成功’需要哪些步骤。”
4. 必须保持自然一对一线上聊天的形式，不需要加动作说明。
5. 请尽量保持在200词以内，保证聊天的简洁和交互的自然，不要太浮夸地用词。
"""),
    HumanMessagePromptTemplate.from_template("{user_query}")
])
PROMPT_F4_5_REPORT = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
"""你是一个专业的 AI 职业教练。你审查了你的客户（用户）与他的“未来自我”的所有互动。
你的任务是基于 WOOP 框架，为用户生成一份 4 部分的“职业洞见总结”。

# 1. 用户的「当前档案」
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
请基于以上所有信息，生成一份 100% 严格符合以下格式的 JSON 报告 (WOOP)。
你的输出**必须**是一个 JSON 对象。
你的输出**不能**包含任何 Markdown 标记，如 "```json" 或 "```"。
你的输出**必须**严格遵循以下键和数据类型：

{{
  "wish": "<用户最核心的职业愿望。请综合 <letter> 与 <chat_history> 内容，用一句话概括。 (string)>",
  "outcome": "<用户对实现该愿望后积极结果的具体想象或期望。 (string)>",
  "obstacle": "<用户在实现该愿望过程中表达的主要障碍、心理挑战或环境限制。 可以详细一点(string)>",
  "plan": "<用户与 AI 对话中提到的、可操作的下一步行动或计划。可以详细一点(string)>"
}}

1.  `obstacle` 和 `plan` 字段必须是**字符串 (string)**。
2.  如果 <chat_history> 或 <letter> 中有多个障碍 (obstacles) 或计划 (plans)，你**必须**将它们合并成一个**单一的字符串**（例如，用换行符 `\n` 分隔），而不是一个 JSON 数组 (list)。
"""),
    HumanMessagePromptTemplate.from_template("请为我生成严格符合 WOOP (wish, outcome, obstacle, plan) 格式的 JSON 报告。")
])
# PROMPT_F4_6_VALIDATOR = ChatPromptTemplate.from_messages([
#     SystemMessagePromptTemplate.from_template(
# """你是一个 AI 文本审查员。
# 你的任务是判断一个 AI 的回复是否严格符合它被指定的人设。

# # 人设 (Context):
# {profile_description}

# # AI 回复 (Response):
# {ai_response}

# # 你的裁决:
# 请判断 <response_to_check> 是否在**语气、内容和知识范畴**上**严格符合** <profile> 的人设？
# 请只回答 "Y" (通过, 未违背) 或 "N" (失败, 严重违背)。
# """),
# ])

# --- 3. AI 链 (Chains) (v1.11 不变) ---
# validation_chain = PROMPT_F4_6_VALIDATOR | llm_validator | StrOutputParser()
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
    logger.info(f"F4.3 (AI): 正在为 {future_profile.id} (人设) 生成回信 (使用 SiliconFlow API)...")
    
    # 1. 准备 Prompt 输入
    prompt_input = {
        "profile_name": future_profile.profile_name, 
        "profile_description": future_profile.profile_description,
        "vals_data": current_profile.vals_data,
        "bfi_data": current_profile.bfi_data,
        "demo_data": current_profile.demo_data,
        "letter_content": letter.content
    }
    ai_response = await letter_chain.ainvoke(prompt_input)
    
    # # 3. (P1 关键) 调用 F4.6 验证器
    # validation_input = {
    #     "profile_description": future_profile.profile_description,
    #     "ai_response": ai_response
    # }
    # validation_result = await validation_chain.ainvoke(validation_input)
    
    # if "N" in validation_result.upper():
    #     logger.warning(f"F4.6 (Validator) 失败! (F4.3 回信): 人设 {future_profile.id} 崩塌。")
    #     return "亲爱的过去的我，我收到了你的来信。我记得那时的感受。请相信自己，你正在正确的道路上。"
    
    # logger.info(f"F4.3 (AI): 回信已生成并通过 F4.6 验证。")
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
    logger.info(f"F4.4 (AI): 正在为 {future_profile.id} (人设) 生成聊天回复 (使用 SiliconFlow API)...")
    
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
    
    # # 5. (P1 关键) 调用 F4.6 验证器
    # validation_input = {
    #     "profile_description": future_profile.profile_description,
    #     "ai_response": ai_response
    # }
    # validation_result = await validation_chain.ainvoke(validation_input)
    
    # if "N" in validation_result.upper():
    #     logger.warning(f"F4.6 (Validator) 失败! (F4.4 聊天): 人设 {future_profile.id} 崩塌。")
    #     return "抱歉，我不太确定如何回应。我们可以聊聊别的吗？"
        
    # logger.info(f"F4.4 (AI): 聊天回复已生成并通过 F4.6 验证。")
    return ai_response