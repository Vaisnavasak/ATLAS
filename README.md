# MemoryVerse Project

## Overview

MemoryVerse is a full-stack application with a Python backend and a TypeScript + Vite frontend. It provides user authentication, email-based notifications, and a small AI assistant integration.

## Repository layout

- `backend/` — Python backend services, API entry point, and tests.
  - `main.py` — app entrypoint
  - `auth.py`, `database.py`, `models.py`, `schemas.py` — core modules
  - `email_service.py` — email generation and logs under `backend/logs/mail/`
  - `requirements.txt` — Python dependencies
  - `test_api.py` — backend tests
- `frontend/` — Vite + React/TypeScript frontend

## Getting started

Prerequisites

- Python 3.11+ (or your project's required version)
- Node.js 16+ and npm or yarn

Backend (Windows)

1. Open a terminal and create/activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate
```

2. Install dependencies and run the API:

```powershell
pip install -r backend/requirements.txt
python backend/main.py
```

3. Run backend tests:

```powershell
pip install pytest
pytest backend/test_api.py
```

Frontend

1. Install and run the dev server:

```bash
cd frontend
npm install
npm run dev
```

2. Build for production:

```bash
npm run build
npm run preview
```

## Configuration

- The backend reads runtime configuration from environment variables or a `.env` file (create as needed).
- Example items to set: `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SECRET_KEY`.
- User data for testing is in `backend/users.json`.

## Logs

- Generated email HTML files are saved to `backend/logs/mail/` for inspection.

### NOTE: THIS IS BUILT WITH THE HELP OF GOOGLE ANTIGRAVITY AND WILL RUN ON LOCAL HOST. THIS IS DONE FOR MY LEARNING PURPOSE
