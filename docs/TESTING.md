# Testing and verification

Run from the repository root after installing the locked dependencies:

```powershell
.\.venv\Scripts\python.exe -m pytest services/api/tests -q
.\.venv\Scripts\python.exe -m ruff check services/api
npm --prefix apps/web run build
npm --prefix apps/web test
npx playwright install chromium
npm run test:browser
```

The frontend build includes TypeScript checks. Tests under `services/api/tests` are the source of truth for financial fixtures and exact expected results. Tests should cover signed invoice balances, multiple/partial payments, credits, refunds/reversals, allocation conflicts, precision, zero revenue, currency isolation, hourly versus fixed-price work, duplicates, missing data, import validation, idempotency, and API state transitions. Do not interpret a test for a rejected non-demo workspace as proof of production authorization.

For manual browser acceptance:

1. Load the fictional workspace and verify all charts have units and real backend values.
2. Download a CSV/XLSX template; preview, map and validate a new upload; inspect row errors and commit accepted rows.
3. Re-run analysis, open evidence, follow its source record, and change a finding status.
4. Create/update an action and confirm persistence after refresh.
5. Change period/currency filters, run a scenario, and ask a supported analyst question.
6. Download CSV/XLSX/PDF; confirm totals, period, currency, sources, limitations and formula-safe text.
7. Check empty results, API unavailable state, keyboard focus, reduced motion and 320px mobile layout.

Automated browser/accessibility audits, broad browser compatibility, load benchmarks, and a production security assessment must be reported separately from unit tests and builds. No benchmark or memory budget is claimed without a measured environment and dataset. Docker configuration alone does not establish that container startup was tested.

Run-specific verification results belong in the final delivery notes. This document provides reproducible commands and test scope, not a blanket assertion that every requested quality gate has passed.
