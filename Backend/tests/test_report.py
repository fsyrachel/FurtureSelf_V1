import uuid

from app.models import Report


def test_trigger_report_generation_creates_task(client, db_session, test_user, monkeypatch):
    """
    场景：首次触发报告生成，应创建 GENERATING 状态的记录，并推送 Celery 任务。
    """
    task_called = {"called": False, "args": None, "kwargs": None}

    def fake_generate_report_delay(*args, **kwargs):
        task_called["called"] = True
        task_called["args"] = args
        task_called["kwargs"] = kwargs

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        fake_generate_report_delay,
    )

    response = client.post("/api/v1/report/generate")

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "GENERATING"
    assert task_called["called"] is True

    reports = db_session.query(Report).filter(Report.user_id == test_user.id).all()
    assert len(reports) == 1
    assert reports[0].status == "GENERATING"


def test_trigger_report_generation_when_ready_returns_error(client, db_session, test_user):
    """
    场景：报告已生成，再次触发应得到 400 错误，防止重复生成。
    """
    ready_report = Report(
        id=uuid.uuid4(),
        user_id=test_user.id,
        status="READY",
        content='{"wish": "A", "outcome": "B", "obstacle": "[]", "plan": "[]"}',
    )
    db_session.add(ready_report)
    db_session.commit()

    response = client.post("/api/v1/report/generate")

    assert response.status_code == 400
    assert response.json()["detail"] == "REPORT_ALREADY_GENERATED"


def test_report_status_includes_failed_state(client, db_session, test_user):
    """
    场景：任务失败时，轮询接口应返回 FAILED 状态，供前端刷新或手动重试。
    """
    failed_report = Report(
        id=uuid.uuid4(),
        user_id=test_user.id,
        status="FAILED",
        content="报告生成失败",
    )
    db_session.add(failed_report)
    db_session.commit()

    response = client.get("/api/v1/report/status")

    assert response.status_code == 200
    assert response.json()["status"] == "FAILED"


def test_report_status_returns_ready(client, db_session, test_user):
    """
    场景：报告生成成功后，轮询接口应返回 READY 状态。
    """
    ready_report = Report(
        id=uuid.uuid4(),
        user_id=test_user.id,
        status="READY",
        content='{"wish":"A","outcome":"B","obstacle":"[]","plan":"[]"}',
    )
    db_session.add(ready_report)
    db_session.commit()

    response = client.get("/api/v1/report/status")

    assert response.status_code == 200
    assert response.json()["status"] == "READY"


def test_trigger_report_generation_reuses_existing_generating_report(client, db_session, test_user, monkeypatch):
    """
    场景：已有 GENERATING 状态的报告时，再次触发应返回同一记录且保持 GENERATING。
    """
    report = Report(id=uuid.uuid4(), user_id=test_user.id, status="GENERATING")
    db_session.add(report)
    db_session.commit()

    calls = {"called": False}

    def fake_generate_report_delay(*args, **kwargs):
        calls["called"] = True

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        fake_generate_report_delay,
    )

    response = client.post("/api/v1/report/generate")

    assert response.status_code == 202
    data = response.json()
    assert data["report_id"] == str(report.id)
    assert calls["called"] is True

    db_session.refresh(report)
    assert report.status == "GENERATING"


def test_trigger_report_generation_resets_failed_report(client, db_session, test_user, monkeypatch):
    """
    场景：报告状态为 FAILED 时重试，应重置为 GENERATING 并重新推送任务。
    """
    report = Report(id=uuid.uuid4(), user_id=test_user.id, status="FAILED")
    db_session.add(report)
    db_session.commit()

    calls = {"called": False}

    def fake_generate_report_delay(*args, **kwargs):
        calls["called"] = True

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        fake_generate_report_delay,
    )

    response = client.post("/api/v1/report/generate")

    assert response.status_code == 202
    assert calls["called"] is True

    db_session.refresh(report)
    assert report.status == "GENERATING"


def test_get_latest_report_returns_ready_content(client, db_session, test_user):
    """
    场景：报告状态为 READY 时，接口应返回解析后的 WOOP 内容。
    """
    report = Report(
        id=uuid.uuid4(),
        user_id=test_user.id,
        status="READY",
        content='{"wish":"A","outcome":"B","obstacle":[],"plan":[]}',
    )
    db_session.add(report)
    db_session.commit()

    response = client.get("/api/v1/report/latest")

    assert response.status_code == 200
    data = response.json()
    assert data["report_id"] == str(report.id)
    assert data["content"]["wish"] == "A"
    assert data["content"]["obstacle"] == "[]"


def test_get_latest_report_returns_404_when_not_ready(client, db_session, test_user):
    """
    场景：报告尚未生成完成时，应返回 404。
    """
    report = Report(
        id=uuid.uuid4(),
        user_id=test_user.id,
        status="GENERATING",
    )
    db_session.add(report)
    db_session.commit()

    response = client.get("/api/v1/report/latest")

    assert response.status_code == 404
    assert response.json()["detail"] == "REPORT_NOT_READY"


def test_report_status_returns_404_when_missing(client):
    """
    场景：用户尚未创建报告时轮询状态，应返回 404。
    """
    response = client.get("/api/v1/report/status")
    assert response.status_code == 404
    assert response.json()["detail"] == "REPORT_NOT_FOUND"


def test_trigger_report_generation_handles_celery_failure(client, db_session, test_user, monkeypatch):
    """
    场景：Celery 推送失败时，接口仍返回 202，并完成状态准备。
    """
    def failing_generate_report_delay(*args, **kwargs):
        raise RuntimeError("celery unavailable")

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        failing_generate_report_delay,
    )

    response = client.post("/api/v1/report/generate")

    assert response.status_code == 202
    report_record = db_session.query(Report).filter(Report.user_id == test_user.id).first()
    assert report_record is not None
    assert report_record.status == "GENERATING"


def test_trigger_report_generation_concurrent_calls_idempotent(client, db_session, test_user, monkeypatch):
    """
    场景：并发多次触发报告生成时，应保持幂等性，只创建一条 GENERATING 记录。
    """
    call_count = {"count": 0}

    def fake_generate_report_delay(*args, **kwargs):
        call_count["count"] += 1

    monkeypatch.setattr(
        "app.api.v1.endpoints.report.generate_report.delay",
        fake_generate_report_delay,
    )

    # 模拟并发调用（在同一用户下连续多次触发）
    responses = []
    for _ in range(3):
        response = client.post("/api/v1/report/generate")
        responses.append(response)

    # 所有响应都应该是 202 或 400（已生成）
    assert all(r.status_code in [202, 400] for r in responses)

    # 数据库中应只有一条 GENERATING 或 READY 的记录
    reports = db_session.query(Report).filter(Report.user_id == test_user.id).all()
    assert len(reports) == 1
    assert reports[0].status in ["GENERATING", "READY"]

    # Celery 任务应至少被调用一次（可能多次，因为不同时机可能触发）
    assert call_count["count"] >= 1


