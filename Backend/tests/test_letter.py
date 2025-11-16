import uuid
import pytest

from app.models import Letter, FutureProfile, LetterReply

VALID_LETTER_CONTENT = (
    "亲爱的未来的我：这是第一封测试信件，用于验证单元测试是否通过，"
    "请耐心等待回信。这段内容用于满足最小长度限制，我们会继续跟踪任务执行情况并保持积极态度，"
    "同时也会在需要时进行必要的重试。"
)


@pytest.fixture()
def stub_letter_dependencies(monkeypatch):
    """
    替换掉向量写入与 Celery 调度，避免测试依赖外部服务。
    """

    async def fake_add_letter_to_rag_async(db, letter):
        return None

    task_calls = {"called": False, "args": None, "kwargs": None}

    def fake_process_letter_delay(*args, **kwargs):
        task_calls["called"] = True
        task_calls["args"] = args
        task_calls["kwargs"] = kwargs

    monkeypatch.setattr(
        "app.api.v1.endpoints.letter.add_letter_to_rag_async",
        fake_add_letter_to_rag_async,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.letter.process_letter.delay",
        fake_process_letter_delay,
    )

    return task_calls


def test_submit_letter_creates_pending_letter(
    client,
    db_session,
    test_user,
    stub_letter_dependencies,
):
    """
    场景：首次提交信件，应创建一条 PENDING 状态的信件，并成功调度 Celery 任务。
    """
    payload = {
        "content": VALID_LETTER_CONTENT,
    }

    response = client.post("/api/v1/letters/submit", json=payload)

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "SUBMITTED"
    assert stub_letter_dependencies["called"] is True

    letters = db_session.query(Letter).filter(Letter.user_id == test_user.id).all()
    assert len(letters) == 1
    assert letters[0].status == "PENDING"
    assert letters[0].content == payload["content"]


def test_submit_letter_rejects_when_ready(client, db_session, test_user):
    """
    场景：信件已成功生成回信，再次提交应返回 400。
    """
    ready_letter = Letter(
        id=uuid.uuid4(),
        user_id=test_user.id,
        content=VALID_LETTER_CONTENT,
        status="REPLIES_READY",
    )
    db_session.add(ready_letter)
    db_session.commit()

    response = client.post("/api/v1/letters/submit", json={"content": VALID_LETTER_CONTENT})

    assert response.status_code == 400
    assert response.json()["detail"] == "LETTER_ALREADY_SUBMITTED"


def test_resubmit_failed_letter_resets_status_and_requeues(
    client,
    db_session,
    test_user,
    stub_letter_dependencies,
):
    """
    场景：信件处理失败后，用户重新提交应重置为 PENDING 并重新推送任务。
    """
    failing_letter = Letter(
        id=uuid.uuid4(),
        user_id=test_user.id,
        content="之前失败的信件内容。",
        status="FAILED",
    )
    db_session.add(failing_letter)
    db_session.commit()

    new_payload = {"content": VALID_LETTER_CONTENT}
    response = client.post("/api/v1/letters/submit", json=new_payload)

    assert response.status_code == 202
    db_session.refresh(failing_letter)
    assert failing_letter.status == "PENDING"
    assert failing_letter.content == new_payload["content"]
    assert stub_letter_dependencies["called"] is True


def test_submit_letter_rolls_back_when_rag_fails(client, db_session, test_user, monkeypatch):
    """
    场景：向量写入失败时应回滚事务并返回 500，且不触发 Celery。
    """
    async def failing_add_letter_to_rag_async(db, letter):
        raise RuntimeError("RAG failure")

    task_calls = {"called": False}

    monkeypatch.setattr(
        "app.api.v1.endpoints.letter.add_letter_to_rag_async",
        failing_add_letter_to_rag_async,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.letter.process_letter.delay",
        lambda *args, **kwargs: task_calls.__setitem__("called", True),
    )

    response = client.post("/api/v1/letters/submit", json={"content": VALID_LETTER_CONTENT})

    assert response.status_code == 500
    assert task_calls["called"] is False
    letter_count = db_session.query(Letter).filter(Letter.user_id == test_user.id).count()
    assert letter_count == 0


def test_submit_letter_handles_db_exception(
    client,
    db_session,
    test_user,
    stub_letter_dependencies,
    monkeypatch,
):
    """
    场景：数据库提交失败时应返回 500，并确保事务回滚。
    """
    original_commit = db_session.commit

    def failing_commit():
        raise RuntimeError("commit failed")

    monkeypatch.setattr(db_session, "commit", failing_commit)

    response = client.post("/api/v1/letters/submit", json={"content": VALID_LETTER_CONTENT})

    assert response.status_code == 500
    assert stub_letter_dependencies["called"] is False

    # 恢复 commit 以便后续断言
    monkeypatch.setattr(db_session, "commit", original_commit)
    db_session.rollback()

    letter_count = db_session.query(Letter).filter(Letter.user_id == test_user.id).count()
    assert letter_count == 0


@pytest.mark.parametrize(
    "status, expected_content",
    [
        ("PENDING", None),
        ("REPLIES_READY", None),
        ("FAILED", "失败信件内容，需要前端回填。"),
    ],
)
def test_get_letter_status_handles_all_states(client, db_session, test_user, status, expected_content):
    """
    场景：轮询接口在不同状态下返回正确的内容与状态。
    """
    letter = Letter(
        id=uuid.uuid4(),
        user_id=test_user.id,
        content=expected_content or VALID_LETTER_CONTENT,
        status=status,
    )
    db_session.add(letter)
    db_session.commit()

    response = client.get("/api/v1/letters/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == status
    assert data["content"] == expected_content


def test_get_letter_status_returns_404_when_missing(client):
    """
    场景：用户尚未提交信件时轮询状态，应返回 404。
    """
    response = client.get("/api/v1/letters/status")
    assert response.status_code == 404
    assert response.json()["detail"] == "LETTER_NOT_FOUND"


def test_get_inbox_latest_returns_latest_letter(client, db_session, test_user):
    """
    场景：收信箱接口应返回最新信件及回信摘要。
    """
    letter = Letter(
        id=uuid.uuid4(),
        user_id=test_user.id,
        content=VALID_LETTER_CONTENT,
        status="REPLIES_READY",
    )
    future_profile = FutureProfile(
        id=uuid.uuid4(),
        user_id=test_user.id,
        profile_name="未来产品经理",
        profile_description="描述",
    )
    reply = LetterReply(
        id=uuid.uuid4(),
        letter_id=letter.id,
        future_profile_id=future_profile.id,
        content="回信内容",
        chat_status="NOT_STARTED",
    )

    db_session.add_all([letter, future_profile, reply])
    db_session.commit()

    response = client.get("/api/v1/letters/inbox/latest")

    assert response.status_code == 200
    data = response.json()
    assert uuid.UUID(data["letter_id"]) == letter.id
    assert len(data["replies"]) == 1
    assert data["replies"][0]["future_profile_id"] == str(future_profile.id)
    assert data["replies"][0]["chat_status"] == "NOT_STARTED"


def test_get_letter_reply_returns_content(client, db_session, test_user):
    """
    场景：读取单个回信应返回完整内容。
    """
    future_profile = FutureProfile(
        id=uuid.uuid4(),
        user_id=test_user.id,
        profile_name="未来设计师",
        profile_description="描述",
    )
    letter = Letter(
        id=uuid.uuid4(),
        user_id=test_user.id,
        content=VALID_LETTER_CONTENT,
        status="REPLIES_READY",
    )
    reply = LetterReply(
        id=uuid.uuid4(),
        letter_id=letter.id,
        future_profile_id=future_profile.id,
        content="详细回信内容",
        chat_status="NOT_STARTED",
    )

    db_session.add_all([future_profile, letter, reply])
    db_session.commit()

    response = client.get(f"/api/v1/letters/reply/{reply.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["reply_id"] == str(reply.id)
    assert data["content"] == reply.content


def test_get_letter_reply_returns_404_when_missing(client):
    """
    场景：回信不存在时应返回 404。
    """
    response = client.get(f"/api/v1/letters/reply/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "REPLY_NOT_FOUND"


def test_submit_letter_rejects_content_too_short(client):
    """
    场景：信件内容少于 50 字符时，应触发 Pydantic 校验返回 422。
    """
    payload = {"content": "太短的内容"}
    response = client.post("/api/v1/letters/submit", json=payload)
    assert response.status_code == 422


def test_submit_letter_rejects_content_too_long(client):
    """
    场景：信件内容超过 5000 字符时，应触发 Pydantic 校验返回 422。
    """
    payload = {"content": "内" * 5001}
    response = client.post("/api/v1/letters/submit", json=payload)
    assert response.status_code == 422


def test_get_inbox_latest_returns_404_when_empty(client):
    """
    场景：用户尚未有任何 REPLIES_READY 状态的信件时，收信箱应返回 404。
    """
    response = client.get("/api/v1/letters/inbox/latest")
    assert response.status_code == 404
    assert response.json()["detail"] == "NO_READY_LETTER"
