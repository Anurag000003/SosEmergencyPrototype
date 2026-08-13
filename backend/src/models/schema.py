from pydantic import BaseModel, Field
from typing import Optional

class SOSCreateRequest(BaseModel):
    patient_id: Optional[str] = None
    case_description: str
    severity: str = "MEDIUM" # LOW, MEDIUM, HIGH, CRITICAL
    required_speciality: Optional[str] = None
    latitude: float
    longitude: float
    location_accuracy: float = 0.0
    assigned_doctor_id: Optional[str] = None

class SOSResponse(BaseModel):
    sos_id: str
    status: str
    message: str

class DoctorPresenceRequest(BaseModel):
    status: str # AVAILABLE, BUSY, OFFLINE, ON_BREAK
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DoctorNoteRequest(BaseModel):
    notes: str
