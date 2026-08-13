import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import os
import shutil
import uuid
import urllib.request
import urllib.parse
import json
from image_recognizer import ImageRecognizer
from diet_plan import get_diet_plan
from health_tips import get_disease_tips, get_preventive_tips, is_critical_emergency

from api import sos, doctors

app = FastAPI()

app.include_router(sos.router)
app.include_router(doctors.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXECUTION_PATH = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(EXECUTION_PATH, exist_ok=True)
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/verify")
async def verify_image(
    algorithm: str = Form("MobileNetV2"),
    images: List[UploadFile] = File(...)
):
    # Unique temp directory for this request to avoid race conditions
    req_temp_dir = os.path.join(TEMP_DIR, str(uuid.uuid4()))
    os.makedirs(req_temp_dir, exist_ok=True)

    try:
        # Save all uploaded files
        for file in images:
            file_path = os.path.join(req_temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        # Initialize Image Recognizer with the selected algorithm
        try:
            recognizer = ImageRecognizer(EXECUTION_PATH, algorithm)
        except Exception as e:
            return {"error": f"Could not load {algorithm} model. Check if {algorithm} .pth file exists in models folder. Error: {str(e)}"}

        # Get extensions of uploaded images
        extensions = set([f.filename.split('.')[-1].lower() for f in images])
        if 'jpg' in extensions and 'jpeg' not in extensions:
            extensions.add('jpeg')

        predictions = recognizer.predict(
            images_path=req_temp_dir,
            image_extensions=list(extensions),
            n=5
        )
        
        diet_plan = None
        tips = None
        is_emergency = False
        if predictions and len(predictions) > 0:
            # Extract top label based on ImageAI's varied return formats
            preds_list = predictions[0].get('predictions', predictions) if isinstance(predictions[0], dict) else predictions
            if preds_list and isinstance(preds_list, list) and len(preds_list) > 0:
                top_label = preds_list[0].get('label') if isinstance(preds_list[0], dict) else None
                if top_label:
                    is_emergency = is_critical_emergency(top_label)
                    diet_plan = get_diet_plan(top_label)
                    tips = get_disease_tips(top_label)
                    if not tips:
                        tips = [get_preventive_tips(top_label)]

        return {
            "predictions": predictions, 
            "algorithm": algorithm,
            "diet_plan": diet_plan,
            "tips": tips,
            "is_emergency": is_emergency
        }
        
    except Exception as e:
        return {"error": str(e)}
    finally:
        # Clean up
        if os.path.exists(req_temp_dir):
            shutil.rmtree(req_temp_dir)

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/verify-video")
async def verify_video(
    algorithm: str = Form("TinyYOLOv3"),
    video: UploadFile = File(...)
):
    from video_object_detector import VideoObjectDetector
    
    req_temp_dir = os.path.join(TEMP_DIR, str(uuid.uuid4()))
    os.makedirs(req_temp_dir, exist_ok=True)
    
    try:
        # Save uploaded video
        file_path = os.path.join(req_temp_dir, video.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        # Initialize detector
        detector = VideoObjectDetector(
            execution_path=EXECUTION_PATH,
            model=algorithm,
            frames_per_second=30, # default fallback, ImageAI will try to detect actual
            videos_path=req_temp_dir,
            input_video_name=video.filename
        )
        
        # Detector runs automatically in __init__ in the provided script!
        # Once initialized, it creates self.df with the results
        
        if hasattr(detector, 'df') and detector.df is not None:
            # Extract unique objects and max probabilities
            df = detector.df.dropna()
            summary = df.groupby('objects')['probability'].max().to_dict()
            
            predictions = [{"label": k, "probability": round(v * 100, 2)} for k, v in summary.items()]
            return {"predictions": predictions, "algorithm": algorithm}
        else:
            return {"error": "No objects detected or processing failed."}
            
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(req_temp_dir):
            shutil.rmtree(req_temp_dir)



import asyncio

@app.post("/api/verify-job-card")
async def verify_job_card(
    image: UploadFile = File(...)
):
    try:
        # Simulate processing time (e.g. OCR or Vision API call)
        await asyncio.sleep(2)
        
        # Mock extracted data
        return {
            "status": "success",
            "extracted_data": {
                "role": "Certified Health Worker",
                "id": f"HW-{uuid.uuid4().hex[:6].upper()}"
            }
        }
    except Exception as e:
        return {"error": str(e)}

class SMSRequest(BaseModel):
    phone: str
    message: str
    imageUrl: str = ""
    description: str = ""

import ssl

@app.post("/api/send-sms")
async def send_sms(req: SMSRequest):
    try:
        sms_text = f"SOS Alert: {req.message}"
        if req.description and req.description != req.message:
            sms_text += f"\nDesc: {req.description}"
        if req.imageUrl:
            sms_text += f"\nVerify Image: {req.imageUrl}"

        data = urllib.parse.urlencode({
            'phone': req.phone,
            'message': sms_text,
            'key': '30c539b35fba66fbe74f4ea1846bb5a6d51b2d3NRQZP4FfIUVCmJQTJ9SmUEGhW'
        }).encode('utf-8')
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        request = urllib.request.Request('https://textbelt.com/text', data=data)
        response = urllib.request.urlopen(request, context=ctx)
        res_data = json.loads(response.read().decode('utf-8'))
        print("=== TEXTBELT RESPONSE ===", res_data)
        return res_data
    except Exception as e:
        print("=== TEXTBELT ERROR ===", str(e))
        return {"success": False, "error": str(e)}

import requests

class PredictSkinRequest(BaseModel):
    image_base64: str

@app.post("/api/predict-skin")
async def predict_skin(req: PredictSkinRequest):
    try:
        import base64
        import tempfile
        
        img_data = base64.b64decode(req.image_base64)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp:
            temp.write(img_data)
            temp_path = temp.name
            
        with open(temp_path, "rb") as f:
            files = {"file": ("skin.jpg", f, "image/jpeg")}
            response = requests.post("http://localhost:8080/predict", files=files)
            
        os.remove(temp_path)
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"SkinAI backend error: {response.text}", "status_code": response.status_code}
    except requests.exceptions.ConnectionError:
        return {"error": "Could not connect to SkinAI backend. Make sure it is running on port 8080."}
    except Exception as e:
        return {"error": str(e)}
