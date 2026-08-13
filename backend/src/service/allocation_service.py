import asyncio
import os
from supabase import create_client, Client
from datetime import datetime, timezone
import sys

# Ensure backend root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utility.distance import calculate_distance
from utility.scoring import calculate_allocation_score
from db.database import supabase

async def allocate_doctor_background_task(sos_id: str, latitude: float, longitude: float, required_speciality: str):
    """
    Background worker that runs the allocation engine.
    Finds eligible doctors, scores them, and assigns them in waves (Ring-based allocation).
    """
    if not supabase:
        print("Supabase client not initialized. Cannot run allocation engine.")
        return

    print(f"[Allocation Engine] Starting allocation for SOS: {sos_id}")
    
    # 1. Fetch eligible doctors
    # Criteria: Verified, Available, and recently seen (heartbeat < 90s)
    # Since we can't easily do a complex time check in simple supabase REST query without an RPC,
    # we'll fetch doctors who are VERIFIED, and then filter their presence in memory for the MVP.
    doctors_resp = supabase.table('doctors').select(
        'id, name, verification_status, doctor_presence(status, latitude, longitude, last_seen), doctor_specialities(speciality)'
    ).eq('verification_status', 'VERIFIED').execute()
    
    doctors = doctors_resp.data
    candidates = []

    now = datetime.now(timezone.utc)

    for doc in doctors:
        presence = doc.get('doctor_presence')
        # If doctor has no presence record or is not available, skip
        if not presence or isinstance(presence, list) and len(presence) == 0:
            continue
            
        presence_data = presence[0] if isinstance(presence, list) else presence
        
        if presence_data.get('status') != 'AVAILABLE':
            continue
            
        # Check heartbeat (last_seen)
        last_seen_str = presence_data.get('last_seen')
        if last_seen_str:
            # Simple fallback parsing
            try:
                last_seen_dt = datetime.fromisoformat(last_seen_str.replace('Z', '+00:00'))
                diff_seconds = (now - last_seen_dt).total_seconds()
                if diff_seconds > 120: # 120 seconds for safety margin
                    continue # Treat as OFFLINE
            except Exception as e:
                print(f"Error parsing date {last_seen_str}: {e}")
                pass
        
        # Get active workload (count of ACTIVE assignments)
        assignments_resp = supabase.table('sos_assignments').select('id', count='exact').eq('doctor_id', doc['id']).eq('status', 'ACTIVE').execute()
        active_count = assignments_resp.count if assignments_resp.count else 0
        
        # Exceeds workload limit
        if active_count >= 3:
            continue

        doc_lat = presence_data.get('latitude')
        doc_lon = presence_data.get('longitude')
        dist = calculate_distance(latitude, longitude, doc_lat, doc_lon)
        
        specs = [s['speciality'] for s in doc.get('doctor_specialities', [])]
        
        total_score, spec_match = calculate_allocation_score(
            distance_km=dist,
            doctor_specialities=specs,
            required_speciality=required_speciality,
            doctor_status='AVAILABLE',
            active_sos_count=active_count
        )

        candidates.append({
            "doctor_id": doc['id'],
            "score": total_score,
            "distance_km": dist,
            "speciality_match": spec_match,
            "name": doc['name']
        })

    # Sort candidates by score descending
    candidates.sort(key=lambda x: x['score'], reverse=True)
    print(f"[Allocation Engine] Found {len(candidates)} eligible candidates.")

    # Save candidates to database
    for c in candidates:
        supabase.table('sos_candidates').insert({
            'sos_id': sos_id,
            'doctor_id': c['doctor_id'],
            'score': c['score'],
            'distance_km': c['distance_km'],
            'speciality_match': c['speciality_match']
        }).execute()

    # Wave 1: Top 3
    wave1 = candidates[:3]
    if not wave1:
        print("[Allocation Engine] ESCALATED: No eligible doctors found.")
        supabase.table('sos_requests').update({'status': 'ESCALATED'}).eq('id', sos_id).execute()
        return

    await trigger_notification_wave(sos_id, wave1)
    
    # Wait 15 seconds for acceptance
    await asyncio.sleep(15)
    
    if check_if_assigned(sos_id): return
    
    # Wave 2: Next 5
    wave2 = candidates[3:8]
    if wave2:
        print("[Allocation Engine] Starting Wave 2...")
        await trigger_notification_wave(sos_id, wave2)
        await asyncio.sleep(20)
        
    if check_if_assigned(sos_id): return
    
    # Escalation
    print(f"[Allocation Engine] ESCALATED: No doctor accepted SOS {sos_id}")
    supabase.table('sos_requests').update({'status': 'ESCALATED'}).eq('id', sos_id).execute()


async def trigger_notification_wave(sos_id: str, wave_candidates: list):
    for c in wave_candidates:
        doc_id = c['doctor_id']
        print(f"-> Notifying Doctor {c['name']} (Score: {c['score']})")
        # Update status to SENT
        supabase.table('sos_candidates').update({'notification_status': 'SENT'}).eq('sos_id', sos_id).eq('doctor_id', doc_id).execute()
        # TODO: Implement actual FCM Push Notification logic here in Phase 3

def check_if_assigned(sos_id: str) -> bool:
    resp = supabase.table('sos_requests').select('status').eq('id', sos_id).execute()
    if resp.data and len(resp.data) > 0:
        return resp.data[0]['status'] == 'ASSIGNED'
    return False
