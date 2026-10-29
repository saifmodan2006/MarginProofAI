# Architecture

Dashboard reads recompute the selected period and currency, then materialize any newly observed finding as an analytical cache entry. This gives period-specific findings durable evidence and workflow IDs without changing source financial records. The main analysis run marks its current all-history candidates separately; investigation notes and status survive recalculation. Reports use the same calculated views.

`apps/web` is a React 19 / TypeScript Vite application using TanStack Query, Lucide icons, and ECharts. Its same-origin `/api` requests are proxied to FastAPI in development; the local container uses nginx for this proxy and static assets.

`services/api/app` owns the API, validated import pipeline, SQLAlchemy persistence, fictional seed data, deterministic analytics, and export generation. Alembic owns schema creation and evolution. The frontend renders backend calculation results rather than generating financial totals.

The default database is root-level SQLite `marginproof.db`. Records are workspace scoped; source identifiers are unique within a category and workspace. Parsed category fields live in JSON payloads and source relations are represented by foreign-key `record_links`. This is a pragmatic source-record store, not a complete normalized accounting ledger. See [schema](DATABASE_SCHEMA.md).

Analysis reads a selected reporting period, as-of date, and currency. Python Decimal functions return serializable monetary strings; the browser converts values only for display and chart coordinates. Findings contain source references and rule explanations. Durable investigation state and action records remain separate from calculated data.

The approved question engine selects predefined analytical operations. It needs no provider key and executes no LLM-generated SQL. Gemini and a general provider abstraction are deferred.

The process runs synchronous analyses for small local datasets. Persisted analysis run metadata is not a durable distributed task queue. There is no worker service, cache tier, scheduler, or production concurrency guarantee. Additional infrastructure should follow measured demand and production security work.
