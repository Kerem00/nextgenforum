import os
import joblib
from .config import ACTIVE_MODEL, LR_MODEL_PATH, FASTTEXT_MODEL_PATH
from .sanitizer import ml_preprocess
_lr_pipeline = None
_ft_model = None

def get_lr_pipeline():
    global _lr_pipeline
    if _lr_pipeline is None:
        _lr_pipeline = joblib.load(LR_MODEL_PATH)
    return _lr_pipeline

def get_ft_model():
    global _ft_model
    if _ft_model is None:
        try:
            import fasttext
            import numpy as np
            
            # Monkeypatch _FastText.predict to fix NumPy 2.x ValueError
            def patched_predict(self, text, k=1, threshold=0.0, on_unicode_error="strict"):
                def check(entry):
                    if entry.find("\n") != -1:
                        raise ValueError("predict processes one line at a time (remove '\\n')")
                    entry += "\n"
                    return entry

                if type(text) == list:
                    text = [check(entry) for entry in text]
                    all_labels, all_probs = self.f.multilinePredict(text, k, threshold, on_unicode_error)
                    return all_labels, all_probs
                else:
                    text = check(text)
                    predictions = self.f.predict(text, k, threshold, on_unicode_error)
                    if predictions:
                        probs, labels = zip(*predictions)
                    else:
                        probs, labels = ([], ())

                    return labels, np.asarray(probs)

            fasttext.FastText._FastText.predict = patched_predict
            
        except ImportError:
            raise ImportError("FastText package is not installed. Please install it to use the 'fasttext' active model.")
        _ft_model = fasttext.load_model(FASTTEXT_MODEL_PATH)
    return _ft_model

def ml_mod(text: str) -> tuple[bool, float]:
    if ACTIVE_MODEL == "off":
        return False, 0.0

    if ACTIVE_MODEL == "fasttext":
        model = get_ft_model()
        text_clean = ml_preprocess(text, "fasttext")
        labels, probs = model.predict(text_clean)
        
        is_toxic = (labels[0] == '__label__1.0')
        confidence = float(probs[0])
        
        return is_toxic, confidence
    else:
        pipeline = get_lr_pipeline()
        text_clean = ml_preprocess(text, "featureunion")
        prediction = pipeline.predict([text_clean])[0]
        proba = pipeline.predict_proba([text_clean])[0]
        
        is_toxic = bool(prediction == 1.0)
        confidence = float(max(proba))
        
        return is_toxic, confidence
