import pytest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
from service.sos_service import resolve_sos

@patch("service.sos_service.supabase")
def test_resolve_sos_data_vanishing(mock_supabase):
    # Mocking the first select query which verifies worker ID
    mock_select = MagicMock()
    mock_select_execute = MagicMock()
    mock_select_execute.data = [{"created_by_worker_id": "test-worker-123"}]
    mock_select.execute.return_value = mock_select_execute
    
    mock_supabase.table.return_value.select.return_value.eq.return_value = mock_select

    # Mocking the update query which actually performs the redaction
    mock_update = MagicMock()
    mock_update_execute = MagicMock()
    mock_update_execute.data = [{"id": "sos-test-001", "status": "RESOLVED"}]
    mock_update.execute.return_value = mock_update_execute
    
    # We need to capture what update() was called with to verify the REDACTION logic
    mock_supabase.table.return_value.update.return_value.eq.return_value = mock_update

    result = resolve_sos("sos-test-001", "test-worker-123")
    
    assert result == True
    
    # Verify the update method was called with the correct REDACTED dictionary
    # The first call is to sos_requests, the second is to sos_assignments
    update_call_args = mock_supabase.table.return_value.update.call_args_list[0][0][0]
    
    assert update_call_args["status"] == "RESOLVED"
    assert update_call_args["case_description"] == "[REDACTED FOR PRIVACY]"
    assert update_call_args["latitude"] is None
    assert update_call_args["longitude"] is None
    assert update_call_args["patient_id"] is None
    
@patch("service.sos_service.supabase")
def test_resolve_sos_unauthorized_worker(mock_supabase):
    # Mocking the first select query for a DIFFERENT worker ID
    mock_select = MagicMock()
    mock_select_execute = MagicMock()
    mock_select_execute.data = [{"created_by_worker_id": "different-worker"}]
    mock_select.execute.return_value = mock_select_execute
    
    mock_supabase.table.return_value.select.return_value.eq.return_value = mock_select

    # Attempt to resolve using unauthorized worker
    result = resolve_sos("sos-test-001", "test-worker-123")
    
    assert result == False
