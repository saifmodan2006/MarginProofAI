# Security boundary

This application is **development-only**. It has no passwords, sessions, account registration, authenticated principals, roles, organizations, or memberships. The workspace header is a demo selector, not proof of identity. The API rejects a workspace other than `northstar-demo`, and non-demo application mode is rejected. These checks do not turn the service into a secure multi-tenant product.

Bind to loopback, keep the Docker port mapping restricted to `127.0.0.1`, use fictional data, and never expose the service with a public tunnel. CORS is not an authentication mechanism. Local users/processes who can access the endpoint can modify demo records. SQLite, previews, evidence, and exports are not encrypted by the application.

Imports accept CSV/XLSX, restrict upload size and workbook expansion, limit sheets/rows/columns, validate numeric/date/status/currency fields, and reject missing or incompatible source relationships. Workbook formulas are treated as untrusted values rather than evaluated as application code. Spreadsheet exports must neutralize formula-like strings. Do not assume this replaces malware scanning or a hardened file-processing sandbox.

The analyst uses approved deterministic operations, not arbitrary SQL or code from imported records. No external AI provider receives data in the default implementation. Application settings must not contain secrets; an optional provider integration and secret storage remain deferred.

Persisted audit records help explain demo changes; they are editable by database administrators and are not a tamper-evident compliance log. Dataset rollback/deletion must preserve source integrity or reject dependent records. Back up the local database before destructive maintenance.

Before production: implement maintained identity/session/password handling, organization/workspace authorization on every access path, RBAC, CSRF where relevant, rate limits, upload isolation, retention/deletion policy, encryption and managed secrets, least-privilege database credentials, secure proxy headers/TLS, observability without raw sensitive records, backup/restore drills, dependency/security review, and adversarial tenant-isolation tests. None of these are implied by a successful local build.
