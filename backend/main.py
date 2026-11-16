from __future__ import annotations

import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = Path(os.environ.get("SEVASETU_DB", BASE_DIR / "sevasetu.db"))
STAGES = ["document_review", "field_verification", "eligibility_check", "decision"]
STAGE_TITLES = {
    "document_review": "Document review",
    "field_verification": "Field verification",
    "eligibility_check": "Eligibility check",
    "decision": "Decision",
}

SEED_APPLICATIONS = [
    {
        "id": "SG-2026-0418", "applicant_name": "Savita Patil", "farmer_id": "MH-NSK-10284",
        "village": "Pimpalgaon Baswant", "distance_km": 14, "land_acres": 3.5,
        "equipment": "Drip irrigation kit", "quantity": 1, "requested_amount": 42000,
        "submitted_on": "2026-11-12", "current_stage": "document_review", "status": "document_review",
        "days_waiting": 4, "needs_attention": True, "avatar_color": "sage",
        "documents": ["farmer ID", "land record"], "history": [
            {"id": "h-418-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-11-12", "type": "submitted", "to_stage": "document_review"},
        ],
    },
    {
        "id": "SG-2026-0412", "applicant_name": "Ramesh Jadhav", "farmer_id": "MH-NSK-08731",
        "village": "Niphad", "distance_km": 9, "land_acres": 5, "equipment": "Power tiller",
        "quantity": 1, "requested_amount": 68000, "submitted_on": "2026-11-08",
        "current_stage": "field_verification", "status": "field_verification", "days_waiting": 8,
        "needs_attention": True, "avatar_color": "terracotta",
        "documents": ["farmer ID", "land record", "vendor quotation"], "history": [
            {"id": "h-412-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-11-08", "type": "submitted", "to_stage": "document_review"},
            {"id": "h-412-2", "title": "Documents checked", "description": "Required identity and land documents are on file.", "actor": "Anita More", "date": "2026-11-10", "type": "stage", "to_stage": "field_verification"},
        ],
    },
    {
        "id": "SG-2026-0406", "applicant_name": "Meena Shinde", "farmer_id": "MH-NSK-11392",
        "village": "Lasalgaon", "distance_km": 18, "land_acres": 2, "equipment": "Sprayer pump",
        "quantity": 2, "requested_amount": 18500, "submitted_on": "2026-11-06",
        "current_stage": "eligibility_check", "status": "eligibility_check", "days_waiting": 10,
        "needs_attention": True, "avatar_color": "lilac",
        "documents": ["farmer ID", "land record", "vendor quotation"], "history": [
            {"id": "h-406-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-11-06", "type": "submitted", "to_stage": "document_review"},
            {"id": "h-406-2", "title": "Documents checked", "description": "Identity, land record, and quotation checked.", "actor": "Anita More", "date": "2026-11-08", "type": "stage", "to_stage": "field_verification"},
            {"id": "h-406-3", "title": "Field visit recorded", "description": "Applicant and requested equipment verified in person.", "actor": "Anita More", "date": "2026-11-09", "type": "stage", "to_stage": "eligibility_check"},
        ],
    },
    {
        "id": "SG-2026-0398", "applicant_name": "Vijay Pawar", "farmer_id": "MH-NSK-09147",
        "village": "Ozar", "distance_km": 11, "land_acres": 4.25, "equipment": "Seed drill",
        "quantity": 1, "requested_amount": 35000, "submitted_on": "2026-11-03",
        "current_stage": "decision", "status": "decision", "days_waiting": 13,
        "needs_attention": True, "avatar_color": "sky",
        "documents": ["farmer ID", "land record", "vendor quotation", "field visit note"], "history": [
            {"id": "h-398-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-11-03", "type": "submitted", "to_stage": "document_review"},
            {"id": "h-398-2", "title": "Documents checked", "description": "Required records checked against the application.", "actor": "Anita More", "date": "2026-11-05", "type": "stage", "to_stage": "field_verification"},
            {"id": "h-398-3", "title": "Field visit recorded", "description": "Landholding and requested seed drill verified.", "actor": "Anita More", "date": "2026-11-07", "type": "stage", "to_stage": "eligibility_check"},
            {"id": "h-398-4", "title": "Eligibility review completed", "description": "Application is ready for an officer's final decision.", "actor": "Anita More", "date": "2026-11-09", "type": "stage", "to_stage": "decision"},
        ],
    },
    {
        "id": "SG-2026-0391", "applicant_name": "Kavita Gaikwad", "farmer_id": "MH-NSK-07621",
        "village": "Sinnar", "distance_km": 23, "land_acres": 6, "equipment": "Mini tractor",
        "quantity": 1, "requested_amount": 110000, "submitted_on": "2026-11-01",
        "current_stage": "document_review", "status": "returned", "days_waiting": 15,
        "needs_attention": False, "avatar_color": "olive",
        "documents": ["farmer ID", "vendor quotation"],
        "return_reason": "Please provide a current landholding record so the land details can be verified.",
        "history": [
            {"id": "h-391-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-11-01", "type": "submitted", "to_stage": "document_review"},
            {"id": "h-391-2", "title": "Additional information requested", "description": "Please provide a current landholding record so the land details can be verified.", "actor": "Anita More", "date": "2026-11-04", "type": "returned", "to_stage": "document_review"},
        ],
    },
    {
        "id": "SG-2026-0380", "applicant_name": "Ganesh Sonawane", "farmer_id": "MH-NSK-06458",
        "village": "Yeola", "distance_km": 31, "land_acres": 3, "equipment": "Drip irrigation kit",
        "quantity": 1, "requested_amount": 39000, "submitted_on": "2026-10-27",
        "current_stage": "decision", "status": "approved", "days_waiting": 0,
        "needs_attention": False, "avatar_color": "sage",
        "documents": ["farmer ID", "land record", "vendor quotation", "field visit note"],
        "history": [
            {"id": "h-380-1", "title": "Application received", "description": "Farmer equipment grant application submitted.", "actor": "Block office", "date": "2026-10-27", "type": "submitted", "to_stage": "document_review"},
            {"id": "h-380-2", "title": "Documents checked", "description": "Required records checked against the application.", "actor": "Anita More", "date": "2026-10-29", "type": "stage", "to_stage": "field_verification"},
            {"id": "h-380-3", "title": "Field visit recorded", "description": "Landholding and requested equipment verified.", "actor": "Anita More", "date": "2026-10-30", "type": "stage", "to_stage": "eligibility_check"},
            {"id": "h-380-4", "title": "Eligibility review completed", "description": "Required eligibility checks reviewed by the officer.", "actor": "Anita More", "date": "2026-11-01", "type": "stage", "to_stage": "decision"},
            {"id": "h-380-5", "title": "Application approved", "description": "Approved by the reviewing officer after reviewing the case file.", "actor": "Anita More", "date": "2026-11-02", "type": "decision", "to_stage": "decision"},
        ],
    },
]


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialise_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
        )
        if connection.execute("SELECT COUNT(*) FROM applications").fetchone()[0] == 0:
            import json

            connection.executemany(
                "INSERT INTO applications (id, data) VALUES (?, ?)",
                [(app["id"], json.dumps(app)) for app in SEED_APPLICATIONS],
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialise_database()
    yield


app = FastAPI(title="SevaSetu API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_application(application_id: str) -> dict:
    import json

    with connect() as connection:
        row = connection.execute(
            "SELECT data FROM applications WHERE id = ?", (application_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    return json.loads(row["data"])


def save_application(application: dict) -> dict:
    import json

    with connect() as connection:
        connection.execute(
            "INSERT INTO applications (id, data) VALUES (?, ?) "
            "ON CONFLICT(id) DO UPDATE SET data = excluded.data",
            (application["id"], json.dumps(application)),
        )
    return application


def add_history(application: dict, title: str, description: str, event_type: str) -> None:
    application["history"].append(
        {
            "id": str(uuid4()),
            "title": title,
            "description": description,
            "actor": "Anita More",
            "date": date.today().isoformat(),
            "type": event_type,
            "to_stage": application["current_stage"],
        }
    )


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]


class ReturnRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/applications")
def list_applications() -> list[dict]:
    import json

    with connect() as connection:
        rows = connection.execute("SELECT data FROM applications").fetchall()
    return sorted(
        (json.loads(row["data"]) for row in rows),
        key=lambda item: (item["status"] in ("approved", "rejected"), -item["days_waiting"]),
    )


@app.get("/api/applications/{application_id}")
def get_application(application_id: str) -> dict:
    return load_application(application_id)


@app.get("/api/applications/{application_id}/assistance")
def get_assistance(application_id: str) -> dict:
    application = load_application(application_id)
    stage = application["current_stage"]
    checks_by_stage = {
        "document_review": [
            "Match the applicant name and farmer ID across the application and identity record.",
            "Check that the landholding record is current and corresponds to the applicant.",
            "Compare the vendor quotation with the requested equipment and amount.",
        ],
        "field_verification": [
            "Confirm the applicant and land location during the visit.",
            "Check that the requested equipment is suitable for the stated landholding.",
            "Record the visit date, observations, and any documents still outstanding.",
        ],
        "eligibility_check": [
            "Review the current scheme guidelines and applicable eligibility limits.",
            "Check the applicant's existing benefit or grant records as required by policy.",
            "Confirm that documents and field visit findings are consistent before proceeding.",
        ],
        "decision": [
            "Review the complete file, including the field visit note and eligibility checks.",
            "Check the requested amount against the current scheme ceiling.",
            "Record a clear reason for your decision or any information still needed.",
        ],
    }
    documents = set(application["documents"])
    expected = {"farmer ID", "land record", "vendor quotation"}
    missing = expected - documents
    flags = []
    if missing:
        flags.append(f"The file does not list: {', '.join(sorted(missing))}. Verify whether these are required before proceeding.")
    if application["days_waiting"] >= 7 and application["status"] not in ("approved", "rejected"):
        flags.append(f"This application has been waiting {application['days_waiting']} days; consider prioritising it.")
    return {
        "summary": (
            f"For {application['applicant_name']}'s {application['equipment']} request, "
            f"focus on {STAGE_TITLES[stage].lower()} and verify the case file before taking action."
        ),
        "checks": checks_by_stage[stage],
        "flags": flags,
        "disclaimer": "AI-generated checklist only. Verify against scheme rules; you make the decision.",
    }


@app.post("/api/applications/{application_id}/advance")
def advance_application(application_id: str) -> dict:
    application = load_application(application_id)
    if application["status"] == "returned":
        raise HTTPException(status_code=409, detail="Mark the requested information received before resuming review.")
    if application["status"] in ("approved", "rejected"):
        raise HTTPException(status_code=409, detail="A decided application cannot be advanced.")
    stage_index = STAGES.index(application["current_stage"])
    if stage_index >= len(STAGES) - 1:
        raise HTTPException(status_code=409, detail="Record an officer decision at the final review step.")
    next_stage = STAGES[stage_index + 1]
    previous_title = STAGE_TITLES[application["current_stage"]]
    application["current_stage"] = next_stage
    application["status"] = next_stage
    application["needs_attention"] = application["days_waiting"] >= 7
    add_history(
        application,
        f"{previous_title} completed",
        f"Review moved to {STAGE_TITLES[next_stage].lower()}.",
        "stage",
    )
    return save_application(application)


@app.post("/api/applications/{application_id}/decide")
def decide_application(application_id: str, payload: DecisionRequest) -> dict:
    application = load_application(application_id)
    if application["current_stage"] != "decision" or application["status"] in ("returned", "approved", "rejected"):
        raise HTTPException(status_code=409, detail="Only an active application at the decision step can be decided.")
    application["status"] = payload.decision
    application["needs_attention"] = False
    application["days_waiting"] = 0
    label = "approved" if payload.decision == "approved" else "rejected"
    add_history(application, f"Application {label}", f"{label.capitalize()} by the reviewing officer after review.", "decision")
    return save_application(application)


@app.post("/api/applications/{application_id}/return")
def return_application(application_id: str, payload: ReturnRequest) -> dict:
    application = load_application(application_id)
    if application["status"] in ("approved", "rejected"):
        raise HTTPException(status_code=409, detail="A decided application cannot be returned.")
    application["status"] = "returned"
    application["needs_attention"] = False
    application["return_reason"] = payload.reason.strip()
    add_history(application, "Additional information requested", payload.reason.strip(), "returned")
    return save_application(application)


@app.post("/api/applications/{application_id}/resubmit")
def resubmit_application(application_id: str) -> dict:
    application = load_application(application_id)
    if application["status"] != "returned":
        raise HTTPException(status_code=409, detail="Only a returned application can resume review.")
    application["status"] = application["current_stage"]
    application["needs_attention"] = True
    application["return_reason"] = ""
    application["days_waiting"] = 0
    add_history(
        application,
        "Information received",
        "The applicant's information was marked received; review can continue.",
        "resubmitted",
    )
    return save_application(application)
