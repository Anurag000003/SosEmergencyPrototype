-- Doctor Allocation Engine Schema for Supabase PostgreSQL

-- 1. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users
    name TEXT NOT NULL,
    phone TEXT,
    verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED')),
    clinic_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. DOCTOR_SCHEDULES
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true
);

-- 3. DOCTOR_PRESENCE
CREATE TABLE IF NOT EXISTS public.doctor_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE', 'ON_BREAK')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. DOCTOR_SPECIALITIES
CREATE TABLE IF NOT EXISTS public.doctor_specialities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    speciality TEXT NOT NULL
);

-- 5. SOS_REQUESTS
CREATE TABLE IF NOT EXISTS public.sos_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_worker_id UUID NOT NULL, -- references auth.users
    patient_id TEXT,
    clinic_id UUID,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_accuracy DOUBLE PRECISION,
    location_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    case_description TEXT,
    severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    required_speciality TEXT,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ALLOCATING', 'ASSIGNED', 'RESOLVED', 'CANCELLED', 'ESCALATED')),
    assigned_doctor_id UUID REFERENCES public.doctors(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. SOS_CANDIDATES
CREATE TABLE IF NOT EXISTS public.sos_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.sos_requests(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    distance_km DOUBLE PRECISION NOT NULL,
    speciality_match INTEGER NOT NULL,
    notification_status TEXT DEFAULT 'PENDING' CHECK (notification_status IN ('PENDING', 'SENT', 'DELIVERED')),
    response TEXT DEFAULT 'NONE' CHECK (response IN ('NONE', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    notified_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(sos_id, doctor_id)
);

-- 7. SOS_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.sos_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID REFERENCES public.sos_requests(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id),
    worker_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'TRANSFERRED'))
);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctor_presence_updated_at BEFORE UPDATE ON public.doctor_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sos_requests_updated_at BEFORE UPDATE ON public.sos_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
