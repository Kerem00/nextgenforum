"""
Comment moderation module.

Runs an ML model (Logistic Regression or FastText) on incoming comment text
and returns a toxicity prediction with a confidence score.
"""

import logging
from typing import Tuple

import joblib

from .sanitizer import sanitize_text
from .config import (
    ACTIVE_MODEL,
    CONFIDENCE_THRESHOLD,
    LR_MODEL_PATH,
    FASTTEXT_MODEL_PATH,
)

logger = logging.getLogger(__name__)

# ── Global model cache (loaded lazily on first call) ────────────────────────
_lr_pipeline = None
_ft_model = None


def _load_lr_model():
    """Load (and cache) the Logistic Regression sklearn pipeline."""
    global _lr_pipeline
    if _lr_pipeline is None:
        logger.info("Loading Logistic Regression pipeline from %s", LR_MODEL_PATH)
        _lr_pipeline = joblib.load(LR_MODEL_PATH)
    return _lr_pipeline


def _load_ft_model():
    """Load (and cache) the FastText model."""
    global _ft_model
    if _ft_model is None:
        import fasttext  # deferred import so it's optional

        logger.info("Loading FastText model from %s", FASTTEXT_MODEL_PATH)
        _ft_model = fasttext.load_model(FASTTEXT_MODEL_PATH)
    return _ft_model


# ── Public API ──────────────────────────────────────────────────────────────


def comment_mod(text: str) -> Tuple[bool, float]:
    """
    Run the configured ML model on *text* and determine whether it is toxic.

    Returns
    -------
    (is_toxic, confidence) : tuple[bool, float]
        * is_toxic  – True when the model predicts label **1** (toxic).
        * confidence – a float in [0, 1] representing the model's confidence
          in its prediction.
    """
    if ACTIVE_MODEL == "logistic_regression":
        return _predict_lr(text)
    elif ACTIVE_MODEL == "fasttext":
        return _predict_ft(text)
    else:
        raise ValueError(f"Unknown ACTIVE_MODEL in config: {ACTIVE_MODEL!r}")


# ── Internal predictors ────────────────────────────────────────────────────


def _predict_lr(text: str) -> Tuple[bool, float]:
    """Predict using the Logistic Regression pipeline (FeatureUnion + Chi² + LR)."""
    sanitized = sanitize_text(text, "featureunion")
    pipeline = _load_lr_model()

    prediction = pipeline.predict([sanitized])[0]  # 0 or 1
    probabilities = pipeline.predict_proba([sanitized])[0]  # [prob_0, prob_1]
    confidence = float(max(probabilities))
    is_toxic = int(prediction) == 1

    logger.info(
        "LR prediction: is_toxic=%s  confidence=%.4f  text=%r",
        is_toxic,
        confidence,
        text[:80],
    )
    return is_toxic, confidence


def _predict_ft(text: str) -> Tuple[bool, float]:
    """Predict using the FastText model."""
    sanitized = sanitize_text(text, "fasttext")
    model = _load_ft_model()

    labels, probs = model.predict(sanitized.replace("\n", " "))
    label = int(float(labels[0].replace("__label__", "")))
    confidence = float(probs[0])
    is_toxic = label == 1

    logger.info(
        "FT prediction: is_toxic=%s  confidence=%.4f  text=%r",
        is_toxic,
        confidence,
        text[:80],
    )
    return is_toxic, confidence
