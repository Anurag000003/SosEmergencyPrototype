import random
from datetime import datetime



DISEASE_TIPS = {
    "Diabetes": [
        "Check your blood sugar every morning",
        "Never skip meals — hypoglycemia is dangerous",
        "Wear shoes always — even indoors — to protect feet",
        "Check your feet daily for any cuts or wounds",
    ],
    "Hypertension": [
        "Check BP every morning before eating",
        "Avoid anger and stress — they spike BP immediately",
        "Reduce salt to less than 5g per day",
        "Take medicines at the same time every day",
    ],
    "Asthma": [
        "Keep your inhaler with you at all times",
        "Avoid dust, smoke, and strong perfumes",
        "Do breathing exercises every morning",
        "Know your asthma triggers and avoid them",
    ],
    "Heart Disease": [
        "Never ignore chest pain — go to hospital immediately",
        "Take all medicines exactly as prescribed",
        "Avoid lifting heavy weights",
        "Sleep on your left side to reduce heart strain",
    ],
    "Dengue": [
        "Check platelet count daily during dengue",
        "Drink papaya leaf juice to boost platelets",
        "Watch for bleeding from gums or nose — go to hospital immediately",
        "Avoid aspirin or ibuprofen — use only paracetamol",
    ],
}

EMERGENCY_CONDITIONS = [
    "Severe Bleeding", 
    "Deep Laceration", 
    "3rd Degree Burn", 
    "Compound Fracture", 
    "Trauma",
    "Severe Head Injury"
]

def is_critical_emergency(disease):
    return any(disease.lower() in ec.lower() or ec.lower() in disease.lower() for ec in EMERGENCY_CONDITIONS)

def get_disease_tips(disease):
    if is_critical_emergency(disease):
        return ["CRITICAL TRAUMA: HOSPITAL REFERRAL REQUIRED", "DO NOT ATTEMPT TO TREAT INDEPENDENTLY", "Disptach immediate SOS/Ambulance"]
    return DISEASE_TIPS.get(disease, [])

def get_preventive_tips(disease):
    if is_critical_emergency(disease):
        return "CRITICAL TRAUMA: Seek immediate hospital care."
    preventive = {
        "Malaria": "Use mosquito nets while sleeping. Apply mosquito repellent. Remove stagnant water near your home.",
        "Dengue": "Use mosquito repellent. Wear full sleeves. Remove stagnant water from flower pots and coolers.",
        "COVID-19": "Wash hands frequently. Wear mask in crowded places. Maintain distance from sick people.",
        "Typhoid": "Drink only boiled or filtered water. Eat freshly cooked food. Wash hands before eating.",
        "Cholera": "Drink only safe water. Wash hands with soap. Avoid street food during outbreaks.",
        "Tuberculosis": "Ventilate your home. Cover mouth while coughing. Complete the full course of treatment.",
    }
    return preventive.get(disease, "Maintain good hygiene, eat balanced diet, exercise regularly, and visit doctor for regular checkups.")