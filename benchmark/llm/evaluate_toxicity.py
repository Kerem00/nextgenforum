import pandas as pd
import requests
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from tqdm import tqdm
import os

# Configuration
LIMIT = 10000
MODEL_NAME = "gemma3:12b"
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OUTPUT_CSV = f"predictions_{LIMIT}.csv"

def evaluate_toxicity(text):
    prompt = f"""Evaluate whether the following tweet is toxic or not.
Toxic tweets include hate speech, harassment, severe profanity, or threatening language.
Output strictly in JSON format: {{"toxic": 1}} if the text is toxic, or {{"toxic": 0}} if it is not toxic.

Tweet:
{text}
"""
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "format": "json",
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        result_text = data.get("response", "").strip()
        
        # Parse JSON
        result_json = json.loads(result_text)
        return int(result_json.get("toxic", 0))
    except Exception as e:
        print(f"Error evaluating text: {e}")
        return None  # Return None if there's an error

def main():
    print("Loading datasets...")
    # Load and merge data
    df_labels = pd.read_csv("test_labels.csv")
    df_text = pd.read_csv("test_text.csv")
    
    df = pd.merge(df_labels, df_text, on="id").head(LIMIT)
    
    # We will accumulate predictions
    predictions = []
    
    print(f"Evaluating {LIMIT} tweets using {MODEL_NAME}...")
    for idx, row in tqdm(df.iterrows(), total=len(df)):
        text = str(row['text'])
        pred = evaluate_toxicity(text)
        predictions.append(pred)

    df['predicted_toxic'] = predictions
    
    # Drop rows where prediction failed
    df_clean = df.dropna(subset=['predicted_toxic']).copy()
    
    # Actual labels might be float like 1.0 or 0.0, convert to int
    y_true = df_clean['label'].astype(int)
    y_pred = df_clean['predicted_toxic'].astype(int)
    
    print("\nSaving predictions to CSV...")
    df_clean.to_csv(OUTPUT_CSV, index=False)
    
    if len(y_true) == 0:
        print("No valid predictions were made.")
        return

    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    print("\n--- Results ---")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    
    # Plotting
    print("\nGenerating plots...")
    
    # 1. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Non-Toxic', 'Toxic'], yticklabels=['Non-Toxic', 'Toxic'])
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title(f'Confusion Matrix (Gemma3:12b, limit={LIMIT})')
    plt.tight_layout()
    plt.savefig('confusion_matrix.png')
    plt.close()
    
    # 2. Metrics Bar Chart
    metrics_names = ['Accuracy', 'Precision', 'Recall', 'F1 Score']
    metrics_values = [accuracy, precision, recall, f1]
    
    plt.figure(figsize=(8, 5))
    sns.barplot(x=metrics_names, y=metrics_values, palette='viridis')
    plt.ylim(0, 1.1)
    for i, v in enumerate(metrics_values):
        plt.text(i, v + 0.02, f'{v:.2f}', ha='center', fontweight='bold')
    plt.title(f'Evaluation Metrics (Gemma3:12b, limit={LIMIT})')
    plt.ylabel('Score')
    plt.tight_layout()
    plt.savefig('metrics_bar_chart.png')
    plt.close()

    print("Plots saved: 'confusion_matrix.png', 'metrics_bar_chart.png'")

if __name__ == "__main__":
    main()
