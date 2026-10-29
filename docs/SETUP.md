# Local setup

Use fictional data only. The API accepts the fixed `northstar-demo` workspace; this is a development environment without account security.

## Windows PowerShell

Install Python 3.12 and Node.js 22 LTS. In `C:\Marginproof_AI`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
npm ci
$env:APP_MODE = 'demo'
.\.venv\Scripts\python.exe -m alembic -c services/api/alembic.ini upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

Open a second PowerShell terminal in the same directory:

```powershell
npm --prefix apps/web run dev -- --host 127.0.0.1 --port 5173
```

Visit <http://127.0.0.1:5173>. Stop each server with Ctrl+C. `scripts/start-local.ps1` performs migrations and starts both servers in hidden child processes, writing logs in `data/logs` and a process-ID file for `scripts/stop-local.ps1`. Dependency installation is intentionally explicit.

## macOS/Linux equivalent

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r services/api/requirements.txt
npm ci
export APP_MODE=demo
.venv/bin/python -m alembic -c services/api/alembic.ini upgrade head
.venv/bin/python -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

Run the same npm dev command in another terminal. Always run migration and API commands from the repository root so the default SQLite URL refers to the same file.

## Configuration and storage

`.env.example` lists defaults. Shell commands use environment variables; they do **not** automatically read `.env`. Set variables in your shell or use the Docker Compose environment configuration. The API requires `APP_MODE=demo`; any production mode fails at startup. Default `DATABASE_URL` is `sqlite:///./marginproof.db`.

No standalone database server is needed. Alembic creates tables; the API lifespan seeds Northstar only when its workspace is absent. Existing data survives restarts. Do not edit seed IDs to simulate tenant isolation. To start afresh, stop processes and move the database to a backup path, then rerun migration/startup. Do not remove a database that contains records you need.

Templates are available in the Data Workspace. Use UTF-8 CSV or XLSX; ISO dates `YYYY-MM-DD`; money with at most two decimals. Import referenced categories before dependents: clients/vendors, projects, contracts, invoices/payments/timesheets, then invoice items/payment allocations/credits/expenses as their references require. Validation does not silently discard errors: inspect rejected rows and explicitly choose whether to commit accepted rows.

If the UI cannot reach the API, check <http://127.0.0.1:8000/api/v1/health>, terminal logs, port conflicts, and the Vite proxy. If startup reports missing tables, run migrations with the same working directory and `DATABASE_URL` used by the API. No Gemini key is required.
