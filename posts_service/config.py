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

# ── AI Assist (Ollama) ───────────────────────────────────────────────────────
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma3:12b"
AUTOMOD_USERNAME = "Automated Moderator"

# ── Categories ───────────────────────────────────────────────────────────────

CATEGORIES = [
    { "id": "general", "label": "General", "icon": "message-square", "description": "General discussions about anything" },
    { "id": "video games", "label": "Video Games", "icon": "gamepad", "description": "Gaming news, reviews and tips" },
    { "id": "cooking", "label": "Cooking", "icon": "utensils", "description": "Recipes, techniques and food talk" },
    { "id": "technology", "label": "Technology", "icon": "monitor", "description": "Tech news and software development" },
    { "id": "sports", "label": "Sports", "icon": "trophy", "description": "Sports scores, teams and events" },
    { "id": "science", "label": "Science", "icon": "flask", "description": "Research, discoveries and curiosity" },
    { "id": "off-topic", "label": "Off Topic", "icon": "hash", "description": "Random and fun conversations" }
]
