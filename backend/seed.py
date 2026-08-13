import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

# Load frontend env variables for the keys
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env'))

url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
key = os.environ.get("EXPO_PUBLIC_SUPABASE_KEY")

if not url or not key:
    print("Missing Supabase keys!")
    exit(1)

supabase: Client = create_client(url, key)

# Mock Doctors
mock_doctors = [
    {
        "name": "Dr. Aris Thorne",
        "phone": "+1234567890",
        "verification_status": "VERIFIED"
    },
    {
        "name": "Dr. Sarah Chen",
        "phone": "+1987654321",
        "verification_status": "VERIFIED"
    },
    {
        "name": "Dr. James Miller",
        "phone": "+1555123456",
        "verification_status": "VERIFIED"
    }
]

def seed():
    print("Seeding database with doctors...")
    
    for doc in mock_doctors:
        # 1. Insert Doctor (using a random UUID for user_id since we don't have real auth users yet)
        user_id = str(uuid.uuid4())
        doc_resp = supabase.table('doctors').insert({
            'user_id': user_id,
            'name': doc['name'],
            'phone': doc['phone'],
            'verification_status': doc['verification_status']
        }).execute()
        
        doctor_id = doc_resp.data[0]['id']
        
        # 2. Insert Presence
        supabase.table('doctor_presence').insert({
            'doctor_id': doctor_id,
            'status': 'AVAILABLE',
            'latitude': 26.4499, # Dummy coordinate (Kanpur)
            'longitude': 80.3319
        }).execute()
        
        # 3. Insert Speciality
        supabase.table('doctor_specialities').insert({
            'doctor_id': doctor_id,
            'speciality': 'General Medicine' if 'James' in doc['name'] else 'Pulmonology'
        }).execute()

    print("Seed complete! Added 3 verified doctors to the database.")

if __name__ == "__main__":
    seed()
