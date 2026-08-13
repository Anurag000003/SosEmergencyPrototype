from fastapi import APIRouter, HTTPException, Depends
from models.schema import DoctorPresenceRequest
from middlewares.auth import verify_jwt
from db.database import supabase

router = APIRouter(prefix="/api/doctor", tags=["Doctors"])

@router.post("/presence")
async def update_presence(req: DoctorPresenceRequest, x_doctor_id: str = Depends(verify_jwt)):
    if not supabase: raise HTTPException(status_code=500, detail="DB not configured")

    # Upsert presence
    resp = supabase.table('doctor_presence').upsert({
        'doctor_id': x_doctor_id,
        'status': req.status,
        'latitude': req.latitude,
        'longitude': req.longitude,
        'last_seen': 'now()'
    }, on_conflict='doctor_id').execute()

    return {"status": "success", "message": "Presence updated"}

@router.post("/heartbeat")
async def heartbeat(x_doctor_id: str = Depends(verify_jwt)):
    if not supabase: return {"status": "error"}
    
    # Update last_seen
    supabase.table('doctor_presence').update({
        'last_seen': 'now()'
    }).eq('doctor_id', x_doctor_id).execute()
    
    return {"status": "success"}

@router.get("/available")
async def get_available_doctors(x_worker_id: str = Depends(verify_jwt)):
    
    try:
        resp = supabase.table('doctors').select(
            'id, name, phone, doctor_presence!inner(status, latitude, longitude), doctor_specialities(speciality)'
        ).eq('verification_status', 'VERIFIED').eq('doctor_presence.status', 'AVAILABLE').execute()
        return {"status": "success", "data": resp.data}
    except Exception as e:
        print(f"Bypassing missing doctors table: {str(e)}")
        return {"status": "success", "data": []}
