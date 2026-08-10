"""TaskPilot backend API tests (health, auth, CRUD, sync)."""
import os
import uuid
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = "https://taskpilot-mobile.preview.emergentagent.com"
API = f"{BASE_URL}/api"
API_KEY = "tp_local_dev_key_a91f7"
DEVICE_ID = "test-device"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # cleanup: delete any TEST_ tasks left over
    r = s.get(f"{API}/tasks", params={"deviceId": DEVICE_ID}, headers={"X-API-Key": API_KEY})
    if r.ok:
        for t in r.json():
            if t.get("id", "").startswith("TEST_"):
                s.delete(f"{API}/tasks/{t['id']}", headers={"X-API-Key": API_KEY})


# ---- Health ----
def test_health(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True


# ---- Auth ----
def test_tasks_without_api_key_returns_401(client):
    r = client.get(f"{API}/tasks")
    assert r.status_code == 401


def test_tasks_with_bad_api_key_returns_401(client):
    r = client.get(f"{API}/tasks", headers={"X-API-Key": "wrong"})
    assert r.status_code == 401


def test_tasks_with_correct_key_returns_list(client):
    # unique deviceId ensures empty
    dev = f"TEST_empty_{uuid.uuid4().hex[:6]}"
    r = client.get(f"{API}/tasks", params={"deviceId": dev}, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    assert r.json() == []


# ---- CRUD ----
def _make_task(tid: str, title="TEST_task", list_="personal"):
    now = datetime.utcnow().isoformat()
    return {
        "id": tid,
        "title": title,
        "done": False,
        "list": list_,
        "createdAt": now,
        "deviceId": DEVICE_ID,
    }


def test_put_upserts_task_and_get_returns_it(client):
    tid = f"TEST_{uuid.uuid4().hex[:8]}"
    payload = _make_task(tid, title="TEST_buy_groceries")
    r = client.put(f"{API}/tasks/{tid}", json=payload, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == tid
    assert data["title"] == "TEST_buy_groceries"
    assert data.get("updatedAt")

    # verify persistence via GET
    r = client.get(f"{API}/tasks", params={"deviceId": DEVICE_ID}, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert tid in ids


def test_put_updates_existing_task(client):
    tid = f"TEST_{uuid.uuid4().hex[:8]}"
    p = _make_task(tid, title="TEST_original")
    client.put(f"{API}/tasks/{tid}", json=p, headers={"X-API-Key": API_KEY}).raise_for_status()

    p["title"] = "TEST_updated"
    p["done"] = True
    r = client.put(f"{API}/tasks/{tid}", json=p, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_updated"
    assert r.json()["done"] is True

    r = client.get(f"{API}/tasks", params={"deviceId": DEVICE_ID}, headers={"X-API-Key": API_KEY})
    match = [t for t in r.json() if t["id"] == tid]
    assert match and match[0]["title"] == "TEST_updated" and match[0]["done"] is True


def test_delete_task(client):
    tid = f"TEST_{uuid.uuid4().hex[:8]}"
    p = _make_task(tid, title="TEST_delete_me")
    client.put(f"{API}/tasks/{tid}", json=p, headers={"X-API-Key": API_KEY}).raise_for_status()

    r = client.delete(f"{API}/tasks/{tid}", headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    assert r.json().get("deleted") == tid

    r = client.get(f"{API}/tasks", params={"deviceId": DEVICE_ID}, headers={"X-API-Key": API_KEY})
    ids = [t["id"] for t in r.json()]
    assert tid not in ids


def test_delete_without_key_401(client):
    r = client.delete(f"{API}/tasks/anything")
    assert r.status_code == 401


# ---- Sync ----
def test_bulk_sync_upserts_all(client):
    ids = [f"TEST_{uuid.uuid4().hex[:8]}" for _ in range(3)]
    payload = [_make_task(i, title=f"TEST_bulk_{n}") for n, i in enumerate(ids)]
    r = client.post(f"{API}/sync", json=payload, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200, r.text
    returned = r.json()
    assert len(returned) == 3

    r = client.get(f"{API}/tasks", params={"deviceId": DEVICE_ID}, headers={"X-API-Key": API_KEY})
    got_ids = {t["id"] for t in r.json()}
    assert set(ids).issubset(got_ids)


def test_sync_without_key_401(client):
    r = client.post(f"{API}/sync", json=[])
    assert r.status_code == 401


def test_job_application_fields_persist(client):
    tid = f"TEST_{uuid.uuid4().hex[:8]}"
    p = _make_task(tid, title="TEST_flipkart_BA", list_="job")
    p.update({
        "company": "Flipkart",
        "role": "Business Analyst",
        "stage": "applied",
        "link": "https://example.com",
        "nextActionAt": (datetime.utcnow() + timedelta(days=2)).isoformat(),
    })
    r = client.put(f"{API}/tasks/{tid}", json=p, headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    body = r.json()
    assert body["company"] == "Flipkart"
    assert body["stage"] == "applied"
    assert body["list"] == "job"
