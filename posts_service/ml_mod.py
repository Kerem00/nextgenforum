import os
import joblib

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "ml_models", "lr_pipeline.joblib")
pipeline = joblib.load(MODEL_PATH)

def ml_mod(text: str) -> tuple[bool, float]:
    prediction = pipeline.predict([text])[0]
    proba = pipeline.predict_proba([text])[0]
    
    is_toxic = bool(prediction == 1.0)
    confidence = float(max(proba))
    
    return is_toxic, confidence
