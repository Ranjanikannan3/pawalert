import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference.predict import AnimalClassifier

app = FastAPI(
    title="PawAlert AI Microservice",
    description="FastAPI service for Animal Classification (Dog, Cat, Cattle)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Classifier
MODEL_PATH = os.getenv("MODEL_PATH", "./models/animal_classifier.pth")
classifier = AnimalClassifier(model_path=MODEL_PATH)

@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "PawAlert AI Microservice",
        "model_loaded": classifier.is_loaded,
        "classes": ["Dog", "Cat", "Cattle"],
    }

@app.get("/model-info")
def model_info():
    return {
        "architecture": "MobileNetV2 Transfer Learning",
        "input_resolution": "224x224 RGB",
        "classes": ["Dog", "Cat", "Cattle"],
        "confidence_threshold": 0.70,
        "is_custom_weights_loaded": classifier.is_loaded,
    }

@app.post("/predict")
async def predict_animal(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        result = classifier.predict(content, filename=file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/fingerprint")
async def get_image_fingerprint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        fp = classifier.fingerprint(content)
        return {"fingerprint": fp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fingerprint error: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
