"""
app.py
======
Unified AI Microservice for the AI-Powered Smart Civic Complaint Management System.

This FastAPI application combines four independent AI components into a single
service that the Node.js/Express backend calls when a citizen submits a complaint:

    1. Department Detection   (department_model.py)  -> which civic department should handle this?
    2. Priority Scoring        (priority_model.py)     -> how urgent is this complaint? (0.0 - 1.0)
    3. Location Extraction     (location_extrator.py)  -> where is the issue located?
    4. Title Generation        (title_generator.py)    -> a short human-readable title

Run:
    pip install -r requirements.txt
    python app.py
    # or
    uvicorn app:app --host 0.0.0.0 --port 5001 --reload
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai_service")

# ─────────────────────────────────────────────
# Internal AI modules
# ─────────────────────────────────────────────
# department_model.py trains/loads its own classifier at import time and
# exposes the trained pipeline as the module-level `model` object.
import department_model as department_module

# priority_model.py exposes the PriorityDetector class. The detector loads a
# saved model from disk automatically if one exists, otherwise it must be
# trained explicitly.
from priority_model import PriorityDetector

# location_extrator.py exposes a LocationExtractor class with an
# `extract(text: str) -> Optional[str]` method.
from location_extrator import LocationExtractor

# title_generator.py exposes a TitleGenerator class with a
# `generate(text: str) -> str` method.
from title_generator import TitleGenerator


# ─────────────────────────────────────────────
# Initialize AI components (loaded once at startup, reused across requests)
# ─────────────────────────────────────────────
logger.info("Initializing AI components...")

# Department detector model is already trained/loaded as a side effect of
# importing department_model (see build_model() call in that file).
department_classifier = department_module.model

# Priority detector: load existing model, or train a fresh one if missing.
priority_detector = PriorityDetector()
if priority_detector.pipeline is None:
    logger.warning("No saved priority model found — training a new one now.")
    priority_detector.train()
    priority_detector.save()

location_extractor = LocationExtractor()
title_generator = TitleGenerator()

logger.info("All AI components initialized successfully.")


# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(
    title="Smart Civic Complaint AI Service",
    description="Unified AI microservice for department detection, priority "
                 "scoring, location extraction, and title generation.",
    version="1.0.0",
)

# Allow the Node/Express backend (and local dev frontend) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────
class ComplaintRequest(BaseModel):
    description: str = Field(..., min_length=1, description="Raw complaint text submitted by the citizen.")


class AnalyzeResponse(BaseModel):
    department: str
    priority_score: float
    priority_label: str
    location: Optional[str] = None
    title: str


class DepartmentResponse(BaseModel):
    department: str


class PriorityResponse(BaseModel):
    priority_score: float
    priority_label: str


class LocationResponse(BaseModel):
    location: Optional[str] = None


class TitleResponse(BaseModel):
    title: str


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def score_to_label(score: float) -> str:
    """Convert a continuous priority score in [0.0, 1.0] into a discrete badge label."""
    if score >= 0.75:
        return "Critical"
    if score >= 0.5:
        return "High"
    if score >= 0.25:
        return "Medium"
    return "Low"


def detect_department(text: str) -> str:
    prediction = department_classifier.predict([text])[0]
    return str(prediction)


def detect_priority(text: str) -> float:
    return priority_detector.predict(text)


def detect_location(text: str) -> Optional[str]:
    return location_extractor.extract(text)


def generate_title(text: str) -> str:
    return title_generator.generate(text)


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    """Basic health check endpoint."""
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_complaint(req: ComplaintRequest):
    """
    Run the full AI pipeline on a single complaint:
    department detection, priority scoring, location extraction, and title generation.
    This is the primary endpoint the Express backend should call on complaint creation.
    """
    text = req.description.strip()
    if not text:
        raise HTTPException(status_code=400, detail="description must not be empty.")

    try:
        department = detect_department(text)
        priority_score = detect_priority(text)
        location = detect_location(text)
        title = generate_title(text)
    except Exception as exc:  # pragma: no cover - safety net for production
        logger.exception("Failed to analyze complaint")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}") from exc

    result = AnalyzeResponse(
        department=department,
        priority_score=priority_score,
        priority_label=score_to_label(priority_score),
        location=location,
        title=title,
    )
    logger.info("Analyzed complaint -> %s", result.model_dump())
    return result


@app.post("/detect-department", response_model=DepartmentResponse)
def detect_department_endpoint(req: ComplaintRequest):
    """Standalone department detection endpoint."""
    return DepartmentResponse(department=detect_department(req.description.strip()))


@app.post("/detect-priority", response_model=PriorityResponse)
def detect_priority_endpoint(req: ComplaintRequest):
    """Standalone priority scoring endpoint."""
    score = detect_priority(req.description.strip())
    return PriorityResponse(priority_score=score, priority_label=score_to_label(score))


@app.post("/extract-location", response_model=LocationResponse)
def extract_location_endpoint(req: ComplaintRequest):
    """Standalone location extraction endpoint."""
    return LocationResponse(location=detect_location(req.description.strip()))


@app.post("/generate-title", response_model=TitleResponse)
def generate_title_endpoint(req: ComplaintRequest):
    """Standalone title generation endpoint."""
    return TitleResponse(title=generate_title(req.description.strip()))


@app.get("/departments")
def list_departments():
    """Returns all departments the department classifier knows about."""
    return {"departments": list(department_classifier.classes_)}


@app.post("/retrain-department")
def retrain_department():
    """Retrain the department classifier (e.g. after updating its CSV dataset)."""
    department_module.model = department_module.build_model()
    global department_classifier
    department_classifier = department_module.model
    return {"status": "department model retrained"}


@app.post("/retrain-priority")
def retrain_priority():
    """Retrain the priority regressor (e.g. after updating its training data)."""
    priority_detector.train()
    priority_detector.save()
    return {"status": "priority model retrained"}


# ─────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=False)