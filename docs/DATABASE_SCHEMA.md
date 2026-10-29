# Database schema

Alembic migrations live in `services/api/migrations`. SQLAlchemy definitions in `app/database.py` are the authoritative implementation. SQLite foreign keys are enabled on connection.

| Table | Purpose |
| --- | --- |
| `workspaces` | Fixed fictional workspace and preferences |
| `dataset_imports` | Import name, category, fingerprint, counts, status, timestamp |
| `business_records` | Workspace, dataset, category, external source ID, source row, validated JSON payload |
| `record_links` | Source record to target record foreign keys, relationship field, workspace |
| `import_previews` | Parsed sheets, validation result, commit state, fingerprint |
| `analysis_runs` | Analysis lifecycle, version, timestamps and failure detail |
| `analytical_findings` | Stable detection key, finding payload, status, owner, current flag and recalculation time |
| `action_tasks` | Workspace-owned action payload and timestamps |
| `audit_logs` | Workspace-owned changes, entity reference, details and timestamp |
| `scenario_runs` | Persisted assumptions and deterministic scenario result |

`business_records` enforces unique `(workspace_id, kind, source_id)`. A record belongs to a persisted import. `record_links` references both source and target records, with uniqueness on `(record_id, field)`. Import validation checks referenced category, workspace, and compatible currency before persistence. Import deletion/rollback must respect dependent records rather than leaving dangling relations.

Categories are clients, projects, contracts, invoices, invoice items, payments, payment allocations, credit notes, timesheets, expenses, and vendors. The API's downloadable templates define actual fields. Payment allocations are separate records: one payment can be allocated to several invoices, and an invoice can receive several payments.

Financial inputs are serialized decimal strings in JSON, then parsed to Decimal for calculations. They are not database `NUMERIC` columns. This limits database-level field constraints and analytical SQL optimization. Full entity tables, users, organizations, memberships, contract rate histories, dedicated evidence/status-history/comment tables, and a reporting ledger are deferred. Audit and finding payloads provide local workflow history but do not constitute a tamper-proof accounting audit trail.
