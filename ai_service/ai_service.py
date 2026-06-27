"""
Department Detection Microservice
Supports training from a CSV file OR built-in data as fallback.

CSV format expected (any of these column name combos):
  - text/complaint/description/narrative  → complaint column
  - label/department/category/product     → department column

Place your CSV as:  E:\Projects\comAi\ai_service\complaints.csv

Install: pip install scikit-learn fastapi uvicorn joblib numpy pandas
Run:     python ai_service.py
"""

import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

CSV_PATH   = "complaints.csv"   # your kaggle / custom CSV file
MODEL_PATH = "department_model.pkl"

# Column name aliases — script auto-detects these
TEXT_COLS  = ["text", "complaint", "description", "narrative",
              "consumer_complaint_narrative", "complaint_text", "issue"]
LABEL_COLS = ["label", "department", "category", "product",
              "department_name", "class", "type"]

# Map external CSV labels → your department names
# Edit this if your CSV uses different names
LABEL_MAP = {
    # financial dataset labels → your civic departments
    "credit card":              "General",
    "mortgage":                 "General",
    "bank account":             "General",
    "debt collection":          "General",
    "credit reporting":         "General",
    # add your own mappings here if needed
}

# ─────────────────────────────────────────────
# BUILT-IN FALLBACK TRAINING DATA
# ─────────────────────────────────────────────

BUILTIN_DATA = [
    # Electricity
    ("electricity problem in my house", "Electricity"),
    ("electric issue at home", "Electricity"),
    ("power problem in my house", "Electricity"),
    ("no electricity in my house", "Electricity"),
    ("electricity not coming", "Electricity"),
    ("power cut in my area", "Electricity"),
    ("power outage since morning", "Electricity"),
    ("no power supply", "Electricity"),
    ("current is not there", "Electricity"),
    ("light is not coming", "Electricity"),
    ("no current in our street", "Electricity"),
    ("street light not working", "Electricity"),
    ("electric pole is broken", "Electricity"),
    ("live wire on the road", "Electricity"),
    ("transformer making noise", "Electricity"),
    ("electricity cut for 2 days", "Electricity"),
    ("power fluctuation", "Electricity"),
    ("meter reading incorrect", "Electricity"),
    ("short circuit near home", "Electricity"),
    ("street lamp flickering", "Electricity"),
    ("electric shock from switchboard", "Electricity"),
    ("underground cable exposed", "Electricity"),
    ("light pole fell on road", "Electricity"),
    ("wires hanging dangerously", "Electricity"),
    ("fuse blown in colony", "Electricity"),
    ("no electricity for 3 hours", "Electricity"),
    ("voltage problem at home", "Electricity"),
    ("lights not working in building", "Electricity"),
    ("power supply fluctuating", "Electricity"),
    ("no light in area at night", "Electricity"),
    ("power failure in colony", "Electricity"),
    ("electric connection problem", "Electricity"),
    ("electricity disruption", "Electricity"),

    # Police
    ("fight on the street", "Police"),
    ("someone attacked me", "Police"),
    ("robbery at my house", "Police"),
    ("theft in our area", "Police"),
    ("chain snatching near market", "Police"),
    ("drunk person nuisance", "Police"),
    ("violence at night", "Police"),
    ("illegal gambling nearby", "Police"),
    ("car was broken into", "Police"),
    ("stalking complaint", "Police"),
    ("bike stolen", "Police"),
    ("eve teasing on road", "Police"),
    ("domestic violence complaint", "Police"),
    ("someone threatening family", "Police"),
    ("public disorder", "Police"),
    ("murder happened nearby", "Police"),
    ("assault complaint", "Police"),
    ("suspicious person roaming", "Police"),
    ("drug dealing in area", "Police"),
    ("harassment by neighbor", "Police"),
    ("vandalism in street", "Police"),
    ("molestation complaint", "Police"),
    ("extortion threat", "Police"),

    # Municipal
    ("garbage not collected", "Municipal"),
    ("drain is blocked", "Municipal"),
    ("sewage overflow on street", "Municipal"),
    ("garbage bin is full", "Municipal"),
    ("waste dumped illegally", "Municipal"),
    ("street is very dirty", "Municipal"),
    ("open drain causing issues", "Municipal"),
    ("garbage truck not coming", "Municipal"),
    ("sweeper not cleaning", "Municipal"),
    ("dead animal not removed", "Municipal"),
    ("construction waste on road", "Municipal"),
    ("no dustbin in area", "Municipal"),
    ("public toilet is dirty", "Municipal"),
    ("drainage flooding road", "Municipal"),
    ("waste burning near houses", "Municipal"),
    ("sanitation problem", "Municipal"),
    ("manhole open dangerous", "Municipal"),
    ("sewage line choked", "Municipal"),
    ("litter everywhere", "Municipal"),
    ("garbage heap near school", "Municipal"),

    # Water Supply
    ("no water supply today", "Water Supply"),
    ("water pipe burst", "Water Supply"),
    ("dirty water from tap", "Water Supply"),
    ("water tank not filled", "Water Supply"),
    ("no water pressure", "Water Supply"),
    ("pipeline leaking", "Water Supply"),
    ("borewell not working", "Water Supply"),
    ("water contamination", "Water Supply"),
    ("water meter broken", "Water Supply"),
    ("water supply irregular", "Water Supply"),
    ("tap water smells bad", "Water Supply"),
    ("water pipeline broken", "Water Supply"),
    ("no drinking water available", "Water Supply"),
    ("water problem at home", "Water Supply"),
    ("tap is dry no water", "Water Supply"),
    ("water not coming from tap", "Water Supply"),
    ("water shortage in area", "Water Supply"),
    ("muddy water from tap", "Water Supply"),
    ("water supply stopped", "Water Supply"),
    ("water tanker not arrived", "Water Supply"),

    # Traffic
    ("traffic signal not working", "Traffic"),
    ("traffic jam on main road", "Traffic"),
    ("pothole causing accidents", "Traffic"),
    ("road divider is broken", "Traffic"),
    ("no speed breaker near school", "Traffic"),
    ("wrong side driving", "Traffic"),
    ("road marking faded", "Traffic"),
    ("illegal parking blocking road", "Traffic"),
    ("no traffic police at crossing", "Traffic"),
    ("footpath broken", "Traffic"),
    ("flyover lights not working", "Traffic"),
    ("missing road signboard", "Traffic"),
    ("bus stop damaged", "Traffic"),
    ("road needs repair", "Traffic"),
    ("pothole on highway", "Traffic"),
    ("traffic light broken", "Traffic"),
    ("signal not changing", "Traffic"),
    ("road damage due to rain", "Traffic"),
    ("construction blocking traffic", "Traffic"),
    ("road is dangerous potholes", "Traffic"),

    # General
    ("general complaint", "General"),
    ("need help with civic issue", "General"),
    ("public nuisance", "General"),
    ("miscellaneous complaint", "General"),
    ("other issue", "General"),
    ("something wrong in my area", "General"),
]

# ─────────────────────────────────────────────
# CSV LOADER
# ─────────────────────────────────────────────

def find_column(df, candidates):
    """Find the first matching column name (case-insensitive)."""
    df_cols_lower = {c.lower(): c for c in df.columns}
    for name in candidates:
        if name.lower() in df_cols_lower:
            return df_cols_lower[name.lower()]
    return None


def load_csv(path):
    """
    Load a CSV and return (texts, labels) lists.
    Auto-detects text and label columns.
    """
    print(f"\n📂 Loading CSV: {path}")
    df = pd.read_csv(path)
    print(f"   Rows: {len(df)}  |  Columns: {list(df.columns)}")

    text_col  = find_column(df, TEXT_COLS)
    label_col = find_column(df, LABEL_COLS)

    if not text_col:
        raise ValueError(
            f"❌ Could not find a text column. Columns in CSV: {list(df.columns)}\n"
            f"   Rename your text column to one of: {TEXT_COLS}"
        )
    if not label_col:
        raise ValueError(
            f"❌ Could not find a label column. Columns in CSV: {list(df.columns)}\n"
            f"   Rename your label column to one of: {LABEL_COLS}"
        )

    print(f"   ✅ Text column  : '{text_col}'")
    print(f"   ✅ Label column : '{label_col}'")

    df = df[[text_col, label_col]].dropna()
    df.columns = ["text", "label"]

    # Apply label mapping if defined
    df["label"] = df["label"].apply(
        lambda x: LABEL_MAP.get(str(x).lower().strip(), str(x).strip())
    )

    texts  = df["text"].astype(str).tolist()
    labels = df["label"].astype(str).tolist()

    print(f"   Departments found: {sorted(set(labels))}")
    print(f"   Total samples    : {len(texts)}")
    return texts, labels

# ─────────────────────────────────────────────
# TRAIN MODEL
# ─────────────────────────────────────────────

def train_model(texts, labels, source_name):
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            token_pattern=r"(?u)\b\w+\b"
        )),
        ("clf", LinearSVC(C=0.5, max_iter=3000))
    ])

    # Train/test split for evaluation
    if len(set(labels)) > 1 and len(texts) > 20:
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)
        print(f"\n📊 Evaluation on test split:")
        print(classification_report(y_test, preds))
    else:
        pipeline.fit(texts, labels)

    joblib.dump(pipeline, MODEL_PATH)
    print(f"✅ Model trained from {source_name} ({len(texts)} samples) and saved.")
    return pipeline


def build_model():
    """Load CSV if available, else use built-in data."""
    if os.path.exists(CSV_PATH):
        try:
            texts, labels = load_csv(CSV_PATH)
            return train_model(texts, labels, source_name=CSV_PATH)
        except Exception as e:
            print(f"⚠️  CSV load failed: {e}")
            print("   Falling back to built-in training data...")

    # Fallback
    texts  = [d[0] for d in BUILTIN_DATA]
    labels = [d[1] for d in BUILTIN_DATA]
    return train_model(texts, labels, source_name="built-in data")


# ─────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────

print("⚙️  Starting Department Detection AI...")
model = build_model()

# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────

app = FastAPI(title="Department Detection AI")


class ComplaintRequest(BaseModel):
    description: str


@app.post("/detect")
def detect_department(req: ComplaintRequest):
    prediction = model.predict([req.description])[0]
    print(f"📝 '{req.description}' → {prediction}")
    return {"departments": [prediction]}


@app.post("/retrain")
def retrain():
    """Call this endpoint to retrain after updating the CSV."""
    global model
    model = build_model()
    return {"status": "retrained"}


@app.get("/departments")
def list_departments():
    """Returns all departments the model knows."""
    return {"departments": list(model.classes_)}


@app.get("/health")
def health():
    return {"status": "ok"}


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)