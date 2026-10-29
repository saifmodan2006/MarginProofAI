"""Reproducible in-process analytics and import validation microbenchmark.

Run: .venv/Scripts/python scripts/benchmark.py (root working directory).
Timings are measurements, not production capacity claims.
"""

import json
import platform
import sys
import time
import tracemalloc
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))
from app.analytics import analyze  # noqa: E402
from app.demo import generate  # noqa: E402
from app.imports import parse_file, validate_rows  # noqa: E402

data = generate()
tracemalloc.start()
start = time.perf_counter()
result = analyze(data, "2025-11-01", "2026-10-29", "2026-10-29")
analysis_seconds = time.perf_counter() - start
_, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()
raw = (
    "source_id,name,currency\n"
    + "".join(f"BENCH-{i},Fictional client {i},USD\n" for i in range(10000))
).encode()
tracemalloc.start()
start = time.perf_counter()
_, sheets = parse_file("benchmark.csv", raw)
validated = validate_rows(
    "clients", sheets["CSV"], {k: k for k in ["source_id", "name", "currency"]}, {}
)
validation_seconds = time.perf_counter() - start
_, import_peak = tracemalloc.get_traced_memory()
tracemalloc.stop()
measurement = {
    "python": platform.python_version(),
    "platform": platform.platform(),
    "processor": platform.processor(),
    "source_records": sum(len(v) for v in data.values()),
    "counts": {k: len(v) for k, v in data.items()},
    "analysis_seconds": round(analysis_seconds, 4),
    "analysis_tracemalloc_peak_bytes": peak,
    "csv_rows": 10000,
    "csv_valid_rows": validated["valid_count"],
    "parse_validate_seconds": round(validation_seconds, 4),
    "parse_validate_tracemalloc_peak_bytes": import_peak,
    "limitations": [
        "Single local run; warm filesystem; no network or HTTP overhead",
        "tracemalloc tracks Python allocations, not total process RSS",
        "Import measurement excludes database commit, linkage and automatic analysis",
        "No PostgreSQL or production load benchmark",
    ],
}
(ROOT / "docs" / "benchmark.json").write_text(
    json.dumps(measurement, indent=2), encoding="utf-8"
)
(ROOT / "demo" / "expected_results" / "reference.json").write_text(
    json.dumps(
        {
            "period": result.get(
                "period", {"start": result["start"], "end": result["end"]}
            ),
            "currency": result["currency"],
            "metrics": result["metrics"],
            "counts": measurement["counts"],
            "finding_categories": {
                k: sum(f["category"] == k for f in result["findings"])
                for k in sorted({f["category"] for f in result["findings"]})
            },
        },
        indent=2,
    ),
    encoding="utf-8",
)
print(json.dumps(measurement, indent=2))
