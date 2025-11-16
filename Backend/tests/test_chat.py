import uuid
import pytest
from app.models import (
    ChatMessage,
    CurrentProfile,
    FutureProfile,
    Letter,
    LetterReply,
)


def _prepare_chat_context(db_session, user_id):
    """
    构造一套最小闭环数据：当前人设、未来人设、信件与回信。
    聊天接口依赖这些数据存在。
    """
    current_profile = CurrentProfile(
        id=uuid.uuid4(),
        user_id=user_id,
        demo_data={"age": 26},
        vals_data={"values": ["成长"]},
        bfi_data={"openness": 0.8},
    )
    future_profile = FutureProfile(
        id=uuid.uuid4(),
        user_id=user_id,
        profile_name="测试人设",
        profile_description="用于聊天的未来人设",
    )
    letter = Letter(
        id=uuid.uuid4(),
        user_id=user_id,
        content="这是用户写给未来自我的信件内容。",
        status="REPLIES_READY",
    )
    letter_reply = LetterReply(
        id=uuid.uuid4(),
        letter_id=letter.id,
        future_profile_id=future_profile.id,
        content="AI 回复内容",
        chat_status="NOT_STARTED",
    )

    db_session.add_all([current_profile, future_profile, letter, letter_reply])
    db_session.commit()
    db_session.refresh(future_profile)
    db_session.refresh(letter_reply)
    return future_profile, letter_reply


def test_chat_success_flow(client, db_session, test_user, monkeypatch):
    """
    场景：AI 正常返回，接口应保存用户与 AI 的消息，并将 chat_status 更新为 COMPLETED。
    """
    future_profile, letter_reply = _prepare_chat_context(db_session, test_user.id)

    async def fake_generate_chat_reply_service(**kwargs):
        return "这是 AI 的测试回复"

    monkeypatch.setattr(
        "app.api.v1.endpoints.chat.generate_chat_reply_service",
        fake_generate_chat_reply_service,
    )

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "你好，未来的我"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["sender"] == "AGENT"
    assert data["content"] == "这是 AI 的测试回复"

    messages = (
        db_session.query(ChatMessage)
        .filter(ChatMessage.future_profile_id == future_profile.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    assert len(messages) == 2
    assert messages[0].sender == "USER"
    assert messages[1].sender == "AGENT"

    db_session.refresh(letter_reply)
    assert letter_reply.chat_status == "COMPLETED"


def test_chat_ai_failure_rolls_back(client, db_session, test_user, monkeypatch):
    """
    场景：AI 服务异常，接口应返回 500，且不保存用户消息，不增加聊天计数。
    """
    future_profile, letter_reply = _prepare_chat_context(db_session, test_user.id)

    async def fake_generate_chat_reply_service(**kwargs):
        raise RuntimeError("LLM 服务不可用")

    monkeypatch.setattr(
        "app.api.v1.endpoints.chat.generate_chat_reply_service",
        fake_generate_chat_reply_service,
    )

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "测试消息"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "LLM_ERROR"

    message_count = (
        db_session.query(ChatMessage)
        .filter(ChatMessage.future_profile_id == future_profile.id)
        .count()
    )
    assert message_count == 0

    db_session.refresh(letter_reply)
    assert letter_reply.chat_status == "NOT_STARTED"


def test_get_chat_history_returns_messages(client, db_session, test_user):
    """
    场景：历史接口应返回已有的聊天记录。
    """
    future_profile, _ = _prepare_chat_context(db_session, test_user.id)

    user_msg = ChatMessage(
        id=uuid.uuid4(),
        future_profile_id=future_profile.id,
        user_id=test_user.id,
        sender="USER",
        content="历史用户消息",
    )
    agent_msg = ChatMessage(
        id=uuid.uuid4(),
        future_profile_id=future_profile.id,
        user_id=test_user.id,
        sender="AGENT",
        content="历史 AI 回复",
    )
    db_session.add_all([user_msg, agent_msg])
    db_session.commit()

    response = client.get(f"/api/v1/chat/{future_profile.id}/history")

    assert response.status_code == 200
    history = response.json()
    assert len(history) == 2
    assert history[0]["sender"] == "USER"
    assert history[1]["sender"] == "AGENT"


def test_chat_message_limit_enforced(client, db_session, test_user, monkeypatch):
    """
    场景：用户已发送 5 条消息，再次发送应直接返回 403，且不会调用 AI。
    """
    future_profile, _ = _prepare_chat_context(db_session, test_user.id)

    for _ in range(5):
        db_session.add(
            ChatMessage(
                id=uuid.uuid4(),
                future_profile_id=future_profile.id,
                user_id=test_user.id,
                sender="USER",
                content="历史消息",
            )
        )
    db_session.commit()

    async def unexpected_ai_call(**kwargs):
        pytest.fail("AI 服务在达到消息上限后不应该被调用")

    monkeypatch.setattr(
        "app.api.v1.endpoints.chat.generate_chat_reply_service",
        unexpected_ai_call,
    )

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "这是一条超出限制的消息"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "MESSAGE_LIMIT_EXCEEDED"

    # 验证没有新增消息
    total_messages = (
        db_session.query(ChatMessage)
        .filter(ChatMessage.future_profile_id == future_profile.id)
        .count()
    )
    assert total_messages == 5


def test_chat_missing_current_profile_returns_404(client, db_session, test_user):
    """
    场景：缺少当前档案数据时，接口应返回 404 并回滚消息。
    """
    future_profile = FutureProfile(
        id=uuid.uuid4(),
        user_id=test_user.id,
        profile_name="未来人设",
        profile_description="描述",
    )
    db_session.add(future_profile)
    db_session.commit()

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "没有当前档案"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile data incomplete."

    message_count = (
        db_session.query(ChatMessage)
        .filter(ChatMessage.future_profile_id == future_profile.id)
        .count()
    )
    assert message_count == 0


def test_chat_missing_future_profile_returns_404(client, db_session, test_user):
    """
    场景：FutureProfile 不存在时，接口应返回 404，并且不会写入消息。
    """
    current_profile = CurrentProfile(
        id=uuid.uuid4(),
        user_id=test_user.id,
        demo_data={"age": 26},
        vals_data={"values": ["成长"]},
        bfi_data={"openness": 0.8},
    )
    db_session.add(current_profile)
    db_session.commit()

    missing_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/chat/{missing_id}/send",
        json={"content": "未来人设不存在"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Profile data incomplete."

    message_count = (
        db_session.query(ChatMessage)
        .filter(ChatMessage.future_profile_id == missing_id)
        .count()
    )
    assert message_count == 0


def test_chat_reaching_limit_and_triggers_report_flow(client, db_session, test_user, monkeypatch):
    """
    场景：发送第 5 条消息后仍返回 200，第 6 条受到限制，并可继续触发报告生成。
    """
    future_profile, _ = _prepare_chat_context(db_session, test_user.id)

    async def fake_generate_chat_reply_service(**kwargs):
        return "AI stub"

    monkeypatch.setattr(
        "app.api.v1.endpoints.chat.generate_chat_reply_service",
        fake_generate_chat_reply_service,
    )

    for idx in range(5):
        response = client.post(
            f"/api/v1/chat/{future_profile.id}/send",
            json={"content": f"第{idx + 1}条消息"},
        )
        assert response.status_code == 200

    # 第 6 条消息受到限制
    response_limit = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "第六条消息"},
    )
    assert response_limit.status_code == 403
    assert response_limit.json()["detail"] == "MESSAGE_LIMIT_EXCEEDED"

    user_msg_count = (
        db_session.query(ChatMessage)
        .filter(
            ChatMessage.future_profile_id == future_profile.id,
            ChatMessage.user_id == test_user.id,
            ChatMessage.sender == "USER",
        )
        .count()
    )
    assert user_msg_count == 5

    task_called = {"called": False}

    def fake_generate_report_delay(*args, **kwargs):
        task_called["called"] = True

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        fake_generate_report_delay,
    )

    report_response = client.post("/api/v1/report/generate")
    assert report_response.status_code == 202
    assert task_called["called"] is True


def test_chat_rejects_content_too_short(client, db_session, test_user):
    """
    场景：聊天内容少于 1 字符时（空字符串），应触发 Pydantic 校验返回 422。
    """
    future_profile, _ = _prepare_chat_context(db_session, test_user.id)

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": ""},
    )
    assert response.status_code == 422


def test_chat_rejects_content_too_long(client, db_session, test_user):
    """
    场景：聊天内容超过 1000 字符时，应触发 Pydantic 校验返回 422。
    """
    future_profile, _ = _prepare_chat_context(db_session, test_user.id)

    response = client.post(
        f"/api/v1/chat/{future_profile.id}/send",
        json={"content": "字" * 1001},
    )
    assert response.status_code == 422

