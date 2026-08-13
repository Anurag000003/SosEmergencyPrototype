def calculate_allocation_score(
    distance_km: float,
    doctor_specialities: list,
    required_speciality: str,
    doctor_status: str,
    active_sos_count: int
) -> tuple[int, int]:
    """
    Calculates the allocation score for a doctor.
    Returns a tuple of (total_score, speciality_match_score).
    """
    total = 0
    
    # 1. Speciality Match (Max 50)
    speciality_score = 0
    if not required_speciality:
        speciality_score = 15 # General doctor if none required
    elif required_speciality.lower() in [s.lower() for s in doctor_specialities]:
        speciality_score = 50
    else:
        # TODO: Implement related speciality mapping (e.g. Cardiology -> Internal Medicine = 30)
        # For now, just grant 15 for general mismatch, or 0.
        speciality_score = 15 
    
    total += speciality_score

    # 2. Availability (Max 20)
    if doctor_status == 'AVAILABLE':
        total += 20
        
    # 3. Distance (Max 20)
    if distance_km <= 2:
        total += 20
    elif distance_km <= 5:
        total += 15
    elif distance_km <= 10:
        total += 10
    elif distance_km <= 20:
        total += 5
    else:
        total += 0

    # 4. Workload (Max 10)
    if active_sos_count == 0:
        total += 10
    elif active_sos_count == 1:
        total += 7
    elif active_sos_count == 2:
        total += 3
    else:
        total += 0

    return total, speciality_score
