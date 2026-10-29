# Local containers and production preparation

The supplied Docker setup is for a **local fictional demo only**. No external deployment is authorized or performed. The lack of authentication makes public hosting unsafe.

Install Docker Engine with Compose or Docker Desktop, then run from the repository root:

```powershell
docker compose up --build
```

Open <http://127.0.0.1:5173>. Compose builds the Python API and the Vite frontend, serves static files through nginx, and proxies `/api` to the API. The API is accessible only on the internal Compose network. The sole host binding is loopback port 5173. SQLite lives in the named `marginproof_data` volume. API startup first runs Alembic then seeds the demo through its lifespan.

```powershell
docker compose logs -f
docker compose down
```

`down` preserves the named database volume. Do not use `down -v` unless you intend to erase all local container records. Back up the volume before upgrading a schema or resetting data. A health endpoint checks service availability, not the correctness/completeness of financial source data.

For a local frontend artifact without containers:

```powershell
npm --prefix apps/web run build
```

Vite outputs `apps/web/dist`; it still needs an API proxy. Dockerfiles produce runnable artifacts but are not a production readiness claim. Base images require periodic security review; no verified image digest or vulnerability scan is claimed.

Before considering any free/low-cost host, complete [security prerequisites](SECURITY.md), replace the demo identity boundary, validate PostgreSQL migrations/constraints, introduce durable analysis workers if needed, configure managed secrets/TLS/backups/observability, test restore and tenant isolation, measure capacity, and obtain explicit deployment authorization. No host account, paid API, purchased domain, or cloud database is required for the local demo.
