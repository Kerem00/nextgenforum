import os

# ==================================
# CONFIGURATION FOR THE POST SERVICE
# ==================================

# ── ML Moderation ────────────────────────────────────────────────────────────

# Which model to use for comment moderation
# Options: "logistic_regression" or "fasttext"
ACTIVE_MODEL = "logistic_regression"

# Confidence threshold (0.0 to 1.0)
# If confidence >= threshold → auto-act based on prediction
# If confidence <  threshold → flag for manual review
CONFIDENCE_THRESHOLD = 0.70

# Paths to pre-trained model files (relative to project root)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LR_MODEL_PATH = os.path.join(_BASE_DIR, "ml_models", "lr_pipeline.joblib")
FASTTEXT_MODEL_PATH = os.path.join(_BASE_DIR, "ml_models", "ft_model.bin")
