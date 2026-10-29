# Executed verification — 29 October 2026

This is evidence for the local MVP, not a production-readiness assessment.

| Check | Result |
| --- | --- |
| Python analytics and isolated API integration suite | 57 passed |
| Frontend Vitest suite | 4 passed |
| Playwright Chromium workflows | 3 passed |
| TypeScript strict configuration and production Vite build | Passed |
| Ruff backend lint | Passed |
| npm dependency audit | Zero reported vulnerabilities |
| Fresh SQLite migration upgrade, downgrade, upgrade | Passed |
| Docker Compose configuration | Validated; images and startup not tested because Docker Desktop engine was unavailable |
| PDF export | Downloaded, parsed and rendered for visual inspection |

The three browser tests cover the full CSV import/mapping/validation/persistence workflow, analysis, evidence/status/owner/note updates, actions, scenarios, rule-based analyst, PDF download, currency/date filters, empty views, offline API recovery, theme switching, mobile navigation and document-width checks at 320/768/1440 pixels, plus automated WCAG audits on Overview and Data workspace. Additional automated contrast audits covered both screens in both themes. This does not certify WCAG compliance or broad browser/device support.

Screenshots: [Desktop overview](overview-desktop.png), [320px overview](overview-mobile.png). Rendered report inspection found readable text and charts without overlapping or clipped elements; reports use a shared analytical layout.

Python 3.12.10, Node 24.21.0, Windows 11; SQLite local storage. The Python test run emits an upstream Starlette deprecation warning for its httpx TestClient adapter.

`scripts/benchmark.py` records a single repeatable in-process measurement in [benchmark.json](benchmark.json): 2,358 source records, 0.735 seconds analysis; 10,000 CSV rows, 0.7762 seconds parsing/validation. Python allocation peaks were 580,371 and 8,514,258 bytes respectively. These are not process RSS measurements. Database commit, HTTP latency, PostgreSQL, parallel users, production authentication, durable worker recovery, penetration testing and production container behavior were not benchmarked or verified.

Production blockers and deferred capabilities remain in [FEATURE_STATUS.md](FEATURE_STATUS.md) and [SECURITY.md](SECURITY.md). No external deployment or real financial action was performed.
