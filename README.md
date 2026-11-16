# SevaSetu

A calm, mobile-friendly application review workspace for field officers handling farmer equipment grant requests. The demonstration uses a fictional block-office queue so the stages and amounts are examples, not official scheme rules.

## What it does

- Prioritises a case queue by waiting time, with search and stage filters.
- Moves cases through document review, field verification, eligibility review, and a human decision.
- Provides stage-specific, rule-based AI review checklists with missing-document and delay flags. Guidance is advisory; it does not determine eligibility or make decisions.
- Lets an officer approve, reject, or return a case with a reason; records each action in case history.
- Persists cases and changes in a local SQLite database.
- Adapts the dashboard and application detail panel to mobile screens.

## Run locally

Requirements: Python 3.10+ and Node.js 18+.

Start the API in one terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Start the React application in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). The API is available at `http://localhost:8000`; its interactive API documentation is at `http://localhost:8000/docs`.

Optional environment settings:

- `VITE_API_URL` sets the API origin for the frontend (defaults to `http://localhost:8000`).
- `CORS_ORIGINS` is a comma-separated list of permitted browser origins.
- `SEVASETU_DB` sets a custom SQLite database file path.

## Service and safeguards

The sample service is a fictional farmer equipment grant, chosen to demonstrate a realistic extension-office review pattern: application and document review, a field visit, eligibility checks against the current scheme circular, and a documented officer decision. Actual required documents, grant caps, and eligibility rules vary by scheme and must be checked against the applicable government order. Sample cases are fictional and must not be used to make real benefit decisions.

AI assistance is a transparent, local checklist based on the current stage and fields in the case file. It is not a trained model, does not verify documents, determine eligibility, rank entitlement, or take an action. Every transition, return request, and final decision requires an explicit officer action and is added to the application history.
