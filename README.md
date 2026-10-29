# MarginProof AI

[![Verify local analytical MVP](https://github.com/saifmodan2006/MarginProofAI/actions/workflows/ci.yml/badge.svg)](https://github.com/saifmodan2006/MarginProofAI/actions/workflows/ci.yml)

**Find the Money Hidden in Your Business Data.**

A local financial investigation application with a React/TypeScript interface, FastAPI, SQLite persistence, deterministic Python analytics, source evidence, and a fictional Northstar Digital Studio dataset. Financial results come from imported records, not an LLM.

**Development-only demo.** The only workspace is `northstar-demo`. There is no authentication, user management, or role enforcement. Do not expose this application publicly or upload private business records. Production startup is deliberately disabled.

## Run locally (Windows PowerShell)

Requires Python 3.12 and Node.js 22 LTS. Run from the repository root:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.txt
npm ci
$env:APP_MODE = 'demo'
.\.venv\Scripts\python.exe -m alembic -c services/api/alembic.ini upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000
```

In a second terminal at the repository root:

```powershell
npm --prefix apps/web run dev -- --host 127.0.0.1 --port 5173
```

Open <http://127.0.0.1:5173>. Migrations create `marginproof.db`; first API startup seeds fictional records. No account, payment, or API key is needed. API documentation is at <http://127.0.0.1:8000/docs>.

Alternatively, `docker compose up --build` exposes the same demo at <http://127.0.0.1:5173>. See [setup](docs/SETUP.md) and [local container guide](docs/DEPLOYMENT.md).

## What to try

1. Explore revenue, costs, receivables, project margins, and source-backed findings.
2. Open an investigation and inspect the records behind its calculation.
3. Download a data template, upload CSV/XLSX, select a sheet, map columns, validate, and explicitly commit accepted rows.
4. Recalculate analysis, update a finding, create an action, and run a hypothetical scenario.
5. Ask the deterministic analyst a supported question and export CSV, XLSX, or PDF.

Amounts use Decimal and one selected currency at a time. Supported currencies are USD, EUR, GBP, INR, CAD, and AUD with two decimal places; there is no exchange-rate conversion. Revenue recognition is the imported recognition date, not an independently verified accounting policy. Potential discrepancies are candidates for review, never proven losses or fraud.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest services/api/tests -q
.\.venv\Scripts\python.exe -m ruff check services/api
npm --prefix apps/web run build
npm --prefix apps/web test
npx playwright install chromium
npm run test:browser
```

See [executed verification results](docs/VERIFICATION.md), [testing](docs/TESTING.md), and [measured benchmark](docs/benchmark.json) for scope and limits. Browser tests require both local servers running.

The private root npm workspace provides `npm run dev`, `npm run build`, `npm run test:web`, `npm run typecheck`, and `npm run test:browser`. The Python backend remains independently installable. A checked-in root lockfile pins both web and browser-QA packages.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) and [implementation plan](docs/PLAN.md)
- [Database schema](docs/DATABASE_SCHEMA.md) and [API contracts](docs/API.md)
- [Analytics methodology](docs/ANALYTICS_METHODOLOGY.md)
- [Fictional demo expected results](docs/DEMO_EXPECTED_RESULTS.md)
- [Security boundaries](docs/SECURITY.md)
- [Feature status and known limitations](docs/FEATURE_STATUS.md)
- [Setup](docs/SETUP.md), [testing](docs/TESTING.md), and [deployment preparation](docs/DEPLOYMENT.md)

The storage design uses validated category payloads in `business_records` with relational `record_links`; it does not implement the full per-entity normalized accounting schema requested for a commercial SaaS. Authentication, organizations, memberships, RBAC, configurable allocation policies, advanced forecasting, and Gemini integration remain deferred. This is a useful local analytical milestone, not production SaaS.
