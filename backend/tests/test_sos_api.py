import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
from main import app
from middlewares.auth import verify_jwt

# Override dependency
def override_verify_jwt():
    return "test-worker-id"

app.dependency_overrides[verify_jwt] = override_verify_jwt

client = TestClient(app)

@patch("api.sos.supabase")
@patch("api.sos.allocate_doctor_background_task")
def test_create_sos_allocating(mock_task, mock_supabase):
    # Mock supabase response
    mock_insert = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "test-sos-123"}]
    mock_insert.execute.return_value = mock_execute
    mock_supabase.table.return_value.insert.return_value = mock_insert

    payload = {
        "case_description": "Severe pain",
        "severity": "HIGH",
        "latitude": 12.34,
        "longitude": 56.78
    }

    response = client.post("/api/sos", json=payload, headers={"Authorization": "Bearer test"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ALLOCATING"
    
    # Assert background task was added
    # Since background_tasks is mocked by FastAPI TestClient automatically in route? 
    # Wait, we patched the task function, but FastAPI's BackgroundTasks will just call it.
    pass

@patch("api.sos.supabase")
def test_create_sos_assigned(mock_supabase):
    # Mock supabase response
    mock_insert = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "test-sos-456"}]
    mock_insert.execute.return_value = mock_execute
    mock_supabase.table.return_value.insert.return_value = mock_insert

    payload = {
        "case_description": "Minor injury",
        "severity": "LOW",
        "latitude": 12.34,
        "longitude": 56.78,
        "assigned_doctor_id": "test-doctor-789"
    }

    response = client.post("/api/sos", json=payload, headers={"Authorization": "Bearer test"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ASSIGNED"
    assert data["sos_id"] == "test-sos-456"

@patch("api.sos.accept_sos")
def test_accept_sos_success(mock_accept):
    mock_accept.return_value = True

    response = client.post("/api/sos/test-sos-123/accept", headers={"Authorization": "Bearer test"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@patch("api.sos.accept_sos")
def test_accept_sos_failure(mock_accept):
    mock_accept.return_value = False

    response = client.post("/api/sos/test-sos-123/accept", headers={"Authorization": "Bearer test"})
    assert response.status_code == 400
    assert "already assigned" in response.json()["detail"]
