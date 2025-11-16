import pytest


def _valid_current_profile_payload():
    return {
        "demo_data": {
            "name": "张三",
            "age": 25,
            "gender": "男",
            "status": "学生",
            "field": "计算机",
            "interests": "阅读",
            "location": "上海",
            "future_location": "深圳",
        },
        "vals_data": {"value1": 3.0},
        "bfi_data": {"trait1": 4.0},
    }


def _valid_future_profile_payload():
    text_block = "这是用于满足最小长度要求的内容。" * 2
    return {
        "profiles": [
            {
                "profile_name": "未来愿景一",
                "future_values": text_block,
                "future_vision": text_block,
                "future_obstacles": text_block,
            }
        ]
    }


@pytest.fixture()
def stub_future_profile_rag(monkeypatch):
    calls = {"count": 0}

    async def fake_add_future_profile_to_rag_async(db, profile):
        calls["count"] += 1

    monkeypatch.setattr(
        "app.api.v1.endpoints.user.add_future_profile_to_rag_async",
        fake_add_future_profile_to_rag_async,
    )

    return calls


def test_create_current_profile_requires_fields(client):
    """
    场景：缺少必填字段时应返回 422。
    """
    response = client.post("/api/v1/profile/current", json={})
    assert response.status_code == 422


def test_create_current_profile_rejects_age_out_of_range(client):
    """
    场景：年龄字段低于下限，应返回 422。
    """
    payload = _valid_current_profile_payload()
    payload["demo_data"]["age"] = 15

    response = client.post("/api/v1/profile/current", json=payload)
    assert response.status_code == 422


def test_create_current_profile_rejects_name_too_long(client):
    """
    场景：姓名超过50字符，应返回 422。
    """
    payload = _valid_current_profile_payload()
    payload["demo_data"]["name"] = "张" * 51  # 51个字符

    response = client.post("/api/v1/profile/current", json=payload)
    assert response.status_code == 422


def test_create_current_profile_prevents_duplicates(client):
    """
    场景：重复提交当前档案应返回 400。
    """
    payload = _valid_current_profile_payload()

    first_response = client.post("/api/v1/profile/current", json=payload)
    assert first_response.status_code == 200

    second_response = client.post("/api/v1/profile/current", json=payload)
    assert second_response.status_code == 400
    assert second_response.json()["detail"] == "PROFILE_ALREADY_EXISTS"


def test_create_future_profile_validation(client, stub_future_profile_rag):
    """
    场景：缺少必要字段时应返回 422。
    """
    invalid_payload = {"profiles": [{}]}
    response = client.post("/api/v1/profile/future", json=invalid_payload)
    assert response.status_code == 422
    assert stub_future_profile_rag["count"] == 0


def test_create_future_profile_rejects_empty_array(client):
    """
    场景：档案数组为空时应返回 422。
    """
    response = client.post("/api/v1/profile/future", json={"profiles": []})
    assert response.status_code == 422


def test_create_future_profile_rejects_name_too_long(client):
    """
    场景：档案名称超过100字符，应返回 422。
    """
    text_block = "充足长度" * 6
    payload = {
        "profiles": [
            {
                "profile_name": "档" * 101,  # 101个字符
                "future_values": text_block,
                "future_vision": text_block,
                "future_obstacles": text_block,
            }
        ]
    }

    response = client.post("/api/v1/profile/future", json=payload)
    assert response.status_code == 422


def test_create_future_profile_prevents_duplicates(client, stub_future_profile_rag):
    """
    场景：同一用户再次提交未来档案应返回 400。
    """
    payload = _valid_future_profile_payload()

    first_response = client.post("/api/v1/profile/future", json=payload)
    assert first_response.status_code == 200
    assert stub_future_profile_rag["count"] == 1

    second_response = client.post("/api/v1/profile/future", json=payload)
    assert second_response.status_code == 400
    assert second_response.json()["detail"] == "FUTURE_PROFILES_ALREADY_EXIST"


def test_create_future_profile_rejects_more_than_three(client):
    """
    场景：超过 3 个未来档案应触发 422 验证错误。
    """
    text_block = "充足长度" * 6
    payload = {
        "profiles": [
            {
                "profile_name": f"档案{i}",
                "future_values": text_block,
                "future_vision": text_block,
                "future_obstacles": text_block,
            }
            for i in range(4)
        ]
    }

    response = client.post("/api/v1/profile/future", json=payload)
    assert response.status_code == 422


def test_create_future_profile_rejects_text_too_short(client):
    """
    场景：档案字段长度低于下限，应返回 422。
    """
    payload = {
        "profiles": [
            {
                "profile_name": "短描述",
                "future_values": "太短",
                "future_vision": "足够长的内容作为占位" * 2,
                "future_obstacles": "足够长的内容作为占位" * 2,
            }
        ]
    }

    response = client.post("/api/v1/profile/future", json=payload)
    assert response.status_code == 422

