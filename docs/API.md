# API contracts

The FastAPI OpenAPI schema at <http://127.0.0.1:8000/openapi.json> and interactive <http://127.0.0.1:8000/docs> are the authoritative endpoint and request/response reference for the running build. All application API routes use `/api/v1`.

The default workspace is `northstar-demo`. A different `X-Workspace-ID` request header is rejected. This is a local demo guard, not authentication or authorization. No `/auth` workflow or permission model is implemented.

The API supports health, workspace/settings access, import preview/validation/commit and history, source-record browsing, dashboard analytics, analysis runs, findings with evidence and status updates, actions, scenarios, approved analyst questions, and report downloads. Downloadable category templates define accepted field names and required values; do not infer fields from a sample spreadsheet.

Use multipart form data for file upload, JSON for mapping/workflow/scenario requests, and query parameters `start`, `end` (ISO dates), and `currency` on scoped analytical endpoints. The API uses the selected end date as its receivables as-of date. Financial values in JSON are decimal strings; `null` margins mean undefined, not zero. Do not parse response amounts into binary floats for downstream authoritative financial calculations.

| Method | Path after `/api/v1` | Operation |
| --- | --- | --- |
| GET | `/health`, `/workspaces` | Read local mode/health and fictional workspace |
| GET | `/dashboard` | Scoped calculated metrics, chart series, coverage and methodology |
| GET / POST | `/analysis-runs` | Read recent run metadata / synchronously recalculate |
| GET | `/findings` | Current persisted findings; optional status/category filters |
| PATCH | `/findings/{id}` | Set status; optional owner and note |
| GET | `/evidence/{id}` | Finding details and change history |
| GET | `/datasets` | Import history and counts |
| POST | `/imports/preview` | Multipart `file` → preview ID, sheets, columns and sample rows |
| GET | `/imports/preview/{id}?sheet=...` | Selected sheet preview |
| POST | `/imports/validate` | `preview_id`, `kind`, optional `sheet`, canonical-field-to-column `mapping` |
| POST | `/imports/commit` | `validation_id` → persist accepted rows |
| DELETE | `/datasets/{id}` | Roll back selected import if source dependencies permit |
| GET | `/templates`, `/templates/{kind}` | Field catalog / CSV or XLSX template (`format`) |
| GET | `/records/{kind}` | `search`, `offset`, `limit` (1–500) source-record browser |
| GET / POST | `/actions` | List / create tasks |
| PATCH | `/actions/{id}` | Update a task with validated fields |
| POST | `/scenarios` | Rate/cost change, unbilled reduction and payment-delay assumptions |
| POST | `/analyst` | Supported `question` routed to approved financial operations |
| GET / PATCH | `/settings` | Read / edit allowed workspace preferences |
| GET | `/reports/{type}` | `format=csv`, `xlsx`, or `pdf`; scoped report download |

Report types are `business`, `revenue`, `expenses`, `profitability`, `aging`, `findings`, `executive`, and `case`. `case` currently exports the finding collection rather than a separately selected individual case. PDF detail is limited to 150 rows; use CSV/XLSX for full detail. Generated reports contain coverage, scope and limitations. PDF includes a calculated revenue/expense chart.

Example health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
```

Import lifecycle: upload a file → inspect sheets/columns → select category and mapping → validate rows → review rejection/flag counts → explicitly commit accepted rows → run analysis. A successful preview does not persist accepted business records. Duplicate source IDs and missing references are validation errors, not implicit upserts. Fingerprints prevent duplicate import replay. Rollback is a workflow operation, not arbitrary database file manipulation.

Finding recalculation uses stable candidate identities while preserving investigation state. A status update is a human workflow decision and does not change the source ledger. Action outcomes are manually entered assertions requiring evidence. Reports use selected calculation scope; downloading a report does not publish or email it.

Expect validation errors for malformed dates, unsupported categories/currencies, invalid amounts/mappings, and allocation conflicts. Missing resources, duplicate imports and dependent deletions are errors rather than silently ignored actions. Clients should display API detail and allow correction. Analysis is local synchronous work with persisted run metadata, not a production background-job guarantee.
