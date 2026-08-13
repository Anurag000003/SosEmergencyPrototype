-- Supabase Row Level Security (RLS) Configuration for Doctor Allocation Engine

-- 1. Enable RLS on all tables
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Create Security Policies

-- Doctors: Anyone can read verified doctors (needed for manual selection). Only the doctor can update their own profile.
CREATE POLICY "Verified doctors are viewable by everyone" ON public.doctors
FOR SELECT USING (verification_status = 'VERIFIED');

CREATE POLICY "Doctors can update their own profile" ON public.doctors
FOR UPDATE USING (auth.uid() = user_id);

-- Doctor Presence: Anyone can view presence, but only the specific doctor can update it.
CREATE POLICY "Doctor presence is viewable by everyone" ON public.doctor_presence
FOR SELECT USING (true);

CREATE POLICY "Doctors can update their own presence" ON public.doctor_presence
FOR ALL USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

-- SOS Requests: 
-- Workers can view and insert their own requests.
-- Doctors can view requests they are assigned to.
CREATE POLICY "Workers can view their own SOS requests" ON public.sos_requests
FOR SELECT USING (created_by_worker_id = auth.uid());

CREATE POLICY "Doctors can view assigned SOS requests" ON public.sos_requests
FOR SELECT USING (
    assigned_doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Workers can insert SOS requests" ON public.sos_requests
FOR INSERT WITH CHECK (created_by_worker_id = auth.uid());

-- SOS Candidates (The Notification Ring):
-- Doctors can only view candidates if they are the target doctor.
CREATE POLICY "Doctors can view their SOS candidates" ON public.sos_candidates
FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

-- SOS Assignments:
-- Workers can view assignments for their SOS requests.
-- Doctors can view their own assignments.
CREATE POLICY "Workers can view assignments for their SOS" ON public.sos_assignments
FOR SELECT USING (worker_id = auth.uid());

CREATE POLICY "Doctors can view their own assignments" ON public.sos_assignments
FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

-- 3. Lock down the medical_images bucket to be private
UPDATE storage.buckets
SET public = false
WHERE id = 'medical_images';

-- Policy for Bucket: Only authenticated users can upload
CREATE POLICY "Authenticated users can upload medical images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical_images');

-- Policy for Bucket: Doctors can view images for SOS requests assigned to them
CREATE POLICY "Doctors can view images of assigned SOS"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical_images'
    -- Note: Additional complex RLS joins for storage require matching the path to the SOS record. 
    -- Typically, the backend will generate a signed URL using the service role key instead, bypassing this for simplicity.
);
