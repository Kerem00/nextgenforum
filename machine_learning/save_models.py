"""
Train and save ML models for comment moderation.

Usage (from the project root):
    python -m posts_service.train_models

This script replicates the training logic from machine_learning/ml_training.ipynb
and saves the resulting models to posts_service/ml_models/.
"""

import os
import sys
import time

import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.metrics import accuracy_score, f1_score


def train_and_save():
    # ── Paths ──────────────────────────────────────────────────────────────
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    ml_dir = os.path.join(base_dir)
    out_dir = os.path.join(project_root, "posts_service", "ml_models")
    os.makedirs(out_dir, exist_ok=True)

    # ── 1. Load datasets ───────────────────────────────────────────────────
    print("Loading training datasets...")
    train_texts = pd.read_csv(os.path.join(ml_dir, "training_datasets", "train_text.csv"))
    train_labels = pd.read_csv(os.path.join(ml_dir, "training_datasets", "train_labels.csv"))
    train_df = pd.merge(train_texts, train_labels, on="id")

    print("Loading testing datasets...")
    test_texts = pd.read_csv(os.path.join(ml_dir, "testing_datasets", "test_text.csv"))
    test_labels = pd.read_csv(os.path.join(ml_dir, "testing_datasets", "test_labels.csv"))
    test_df = pd.merge(test_texts, test_labels, on="id")

    print(f"Train size: {len(train_df)}, Test size: {len(test_df)}")

    X_train = train_df["text"].fillna("")
    X_test = test_df["text"].fillna("")
    y_train = train_df["label"]
    y_test = test_df["label"]

    # ── 2. TF-IDF and FeatureUnion ─────────────────────────────────────────
    print("Creating vectorizers...")
    word_vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=3,
        sublinear_tf=True,
        strip_accents="unicode",
    )

    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 4),
        min_df=3,
        sublinear_tf=True,
        strip_accents="unicode",
    )

    feature_union = FeatureUnion([
        ("word_tfidf", word_vectorizer),
        ("char_tfidf", char_vectorizer),
    ])

    feature_selector = SelectKBest(score_func=chi2, k=25000)

    # ── 3. Train Logistic Regression Pipeline ──────────────────────────────
    print("Training Logistic Regression Pipeline...")
    lr_pipeline = Pipeline([
        ("features", feature_union),
        ("selector", feature_selector),
        ("classifier", LogisticRegression(max_iter=1000)),
    ])

    start = time.time()
    lr_pipeline.fit(X_train, y_train)
    lr_train_time = time.time() - start

    lr_preds = lr_pipeline.predict(X_test)
    lr_acc = accuracy_score(y_test, lr_preds)
    lr_f1 = f1_score(y_test, lr_preds, average="macro")
    print(f"LR Train Time: {lr_train_time:.2f}s")
    print(f"LR Accuracy: {lr_acc:.4f}, F1 (Macro): {lr_f1:.4f}")

    lr_path = os.path.join(out_dir, "lr_pipeline.joblib")
    joblib.dump(lr_pipeline, lr_path)
    print(f"Saved Logistic Regression pipeline → {lr_path}")

    # ── 4. Train FastText ──────────────────────────────────────────────────
    try:
        import fasttext

        print("Training FastText...")
        ft_train_file = os.path.join(ml_dir, "training_datasets", "train_fasttext.txt")
        start = time.time()
        ft_model = fasttext.train_supervised(
            input=ft_train_file,
            epoch=25,
            lr=0.1,
            wordNgrams=2,
            verbose=2,
        )
        ft_train_time = time.time() - start

        # Evaluate
        ft_raw_preds = ft_model.predict(X_test.str.replace("\n", " ").tolist())
        ft_preds = [
            int(float(label[0].replace("__label__", "")))
            for label in ft_raw_preds[0]
        ]
        ft_acc = accuracy_score(y_test, ft_preds)
        ft_f1 = f1_score(y_test, ft_preds, average="macro")
        print(f"FT Train Time: {ft_train_time:.2f}s")
        print(f"FT Accuracy: {ft_acc:.4f}, F1 (Macro): {ft_f1:.4f}")

        ft_path = os.path.join(out_dir, "ft_model.bin")
        ft_model.save_model(ft_path)
        print(f"Saved FastText model → {ft_path}")
    except ImportError:
        print("WARNING: fasttext package not installed — skipping FastText training.")
    except Exception as e:
        print(f"WARNING: FastText training failed: {e}")

    print("\nDone! Models saved to:", out_dir)


if __name__ == "__main__":
    train_and_save()
