# Feature status and known limitations

This is a local analytical MVP, not a complete implementation of every item in the master specification. Use the running application and OpenAPI contract to inspect supported operations.

| Area | Implemented scope | Limits / deferred work |
| --- | --- | --- |
| Demo | Reproducible Northstar source data and automatic first-start seeding | One fixed fictional workspace; no real accounts |
| Data pipeline | CSV/XLSX previews, sheet selection, mapping, validation, row errors, transactional imports, fingerprints, templates, rollback controls | ISO dates; no locale inference; dependencies must be imported first |
| Storage | SQLAlchemy/Alembic, workspace ownership, source lineage and foreign-key record links | Category payload JSON instead of dedicated business entity tables |
| Finance | Decimal revenue/cost metrics, separate invoiced/recognized/cash views, receivables/aging, allocations, credits/refunds/reversals, hourly unbilled estimates | Two-decimal supported currencies only; no FX or full accounting ledger |
| Profitability | Recorded expenses plus timesheet labor, project/client grouping, contribution margin | No verified net profit or configurable overhead allocation; coverage matters |
| Investigations | Deterministic candidates, source evidence, status/owner workflow and recalculation | Candidates are not proven errors; no fraud inference |
| Statistics | Explainable median/MAD expense rules and period trends | No calibrated probabilities, advanced ML, seasonal forecasting or causal diagnosis |
| Scenarios | Explicit arithmetic assumptions and baseline/projected comparison | Hypothetical only; no validated forecasting model |
| Analyst | Approved rule-based questions over actual selected data | Gemini/provider integration and unrestricted conversational analysis deferred |
| Workflow | Persistent tasks, notes/status changes and manually recorded outcomes | No verified recovery inferred from candidate exposure; no real user assignment |
| Reports | Eight report selectors, CSV/XLSX/PDF, calculated PDF trend chart, scope/coverage/methodology | Shared report layout; PDF detail capped at 150 rows; case selector exports findings collection; scheduling deferred |
| UI | Responsive dashboard/navigation, charts, source exploration, filters and evidence | Full WCAG certification and exhaustive device/browser testing not claimed |
| Security | Fixed demo boundary, startup mode restriction, import validation | Authentication, RBAC, production tenant authorization and compliance controls deferred |
| Operations | Local development commands, migrations, locked dependencies and container definitions | No cloud deployment, production availability, durable job queue, or measured scaling claim |

Data accuracy depends on ledger completeness and mapping quality. The application does not independently certify revenue recognition, contracts, recoverability, or cost allocation. Review findings against original source systems before taking financial action.
