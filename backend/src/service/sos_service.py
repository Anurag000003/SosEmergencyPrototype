from db.database import supabase

def accept_sos(sos_id: str, doctor_id: str) -> bool:
    """
    Atomic acceptance of an SOS by a doctor.
    Returns True if successful, False if already assigned or expired.
    """
    if not supabase: return False

    # Check if SOS is still OPEN or ALLOCATING
    resp = supabase.table('sos_requests').select('status, created_by_worker_id').eq('id', sos_id).execute()
    if not resp.data or resp.data[0]['status'] not in ['OPEN', 'ALLOCATING']:
        return False
        
    # Attempt atomic-like update by ensuring status hasn't changed.
    # Supabase/PostgREST doesn't support complex WHERE clauses in update via simple SDK natively without RPC, 
    # but we can filter by the current statuses.
    update_resp = supabase.table('sos_requests').update({
        'status': 'ASSIGNED',
        'assigned_doctor_id': doctor_id
    }).eq('id', sos_id).in_('status', ['OPEN', 'ALLOCATING']).execute()

    if update_resp.data and len(update_resp.data) > 0:
        # We successfully grabbed it
        worker_id = update_resp.data[0]['created_by_worker_id']
        
        # Log Assignment
        supabase.table('sos_assignments').insert({
            'sos_id': sos_id,
            'doctor_id': doctor_id,
            'worker_id': worker_id
        }).execute()
        
        # Update Candidate Record
        supabase.table('sos_candidates').update({
            'response': 'ACCEPTED',
            'responded_at': 'now()'
        }).eq('sos_id', sos_id).eq('doctor_id', doctor_id).execute()
        
        return True
        
    return False

def decline_sos(sos_id: str, doctor_id: str):
    """
    Doctor declines the SOS.
    """
    if not supabase: return
    supabase.table('sos_candidates').update({
        'response': 'DECLINED',
        'responded_at': 'now()'
    }).eq('sos_id', sos_id).eq('doctor_id', doctor_id).execute()

def add_doctor_response(sos_id: str, doctor_id: str, notes: str) -> bool:
    if not supabase: return False
    
    resp = supabase.table('sos_requests').select('assigned_doctor_id, case_description').eq('id', sos_id).execute()
    if not resp.data or resp.data[0]['assigned_doctor_id'] != doctor_id:
        return False
        
    current_desc = resp.data[0]['case_description'] or ""
    new_desc = current_desc + f"\n\n[Doctor's Notes]: {notes}"
    
    update_resp = supabase.table('sos_requests').update({
        'case_description': new_desc
    }).eq('id', sos_id).execute()
    
    return len(update_resp.data) > 0

def resolve_sos(sos_id: str, x_worker_id: str) -> bool:
    """
    Resolves the SOS and enforces privacy by stripping GPS coordinates and sensitive case data.
    """
    if not supabase: return False
    
    # Verify worker owns the SOS
    resp = supabase.table('sos_requests').select('created_by_worker_id').eq('id', sos_id).execute()
    if not resp.data or resp.data[0]['created_by_worker_id'] != x_worker_id:
        return False
        
    update_resp = supabase.table('sos_requests').update({
        'status': 'RESOLVED',
        'latitude': None,
        'longitude': None,
        'location_accuracy': None,
        'case_description': '[REDACTED FOR PRIVACY]',
        'patient_id': None
    }).eq('id', sos_id).execute()
    
    # Update assignments
    supabase.table('sos_assignments').update({
        'status': 'COMPLETED',
        'released_at': 'now()'
    }).eq('sos_id', sos_id).eq('status', 'ACTIVE').execute()
    
    return len(update_resp.data) > 0
