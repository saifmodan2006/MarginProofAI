"""Deterministic fictional records; no dashboard values are seeded."""

from datetime import date, timedelta
from decimal import Decimal
from random import Random

from app.database import Dataset, Record, RecordLink, Workspace
from app.imports import REFS

DEMO_ID = "northstar-demo"
DEFAULT_SETTINGS = {
    "business_name": "Northstar Digital Studio",
    "currency": "USD",
    "target_margin": 35,
    "overdue_days": 0,
    "anomaly_threshold": 3.5,
    "mode": "development-only",
    "ai_provider": "deterministic",
    "date_format": "YYYY-MM-DD",
}


def generate():
    rng = Random(42)
    data = {
        k: []
        for k in [
            "clients",
            "projects",
            "contracts",
            "invoices",
            "payments",
            "payment_allocations",
            "timesheets",
            "invoice_items",
            "expenses",
            "vendors",
            "credit_notes",
        ]
    }
    names = [
        "Acme Collective",
        "Bloom Health",
        "Cedar & Co.",
        "Orbit Labs",
        "Lumen Commerce",
        "Atlas Ventures",
        "Evergreen Studio",
        "Harbor Robotics",
        "Solstice Travel",
        "Juniper Foods",
        "Mosaic Learning",
        "Quarry Digital",
    ]
    for i, name in enumerate(names, 1):
        data["clients"].append({"source_id": f"CL-{i:03}", "name": name, "currency": "USD"})
    for i, name in enumerate(
        ["Cloud infrastructure", "Design partners", "Software subscriptions", "Office services"], 1
    ):
        data["vendors"].append({"source_id": f"V-{i}", "name": name, "currency": "USD"})
    project_names = [
        "Commerce platform",
        "Patient portal",
        "Brand evolution",
        "Analytics platform",
        "Storefront rebuild",
        "Portfolio intelligence",
        "Studio operations",
        "Fleet dashboard",
        "Booking experience",
        "Supply chain portal",
        "Learning platform",
        "Growth campaign",
    ]
    for i in range(1, 25):
        p = f"PR-{i:03}"
        c = f"CL-{(i - 1) % 12 + 1:03}"
        data["projects"].append(
            {
                "source_id": p,
                "name": project_names[(i - 1) % 12] + (" / Support" if i > 12 else ""),
                "client_id": c,
                "currency": "USD",
            }
        )
        data["contracts"].append(
            {
                "source_id": f"CT-{i:03}",
                "project_id": p,
                "kind": "fixed" if i % 4 == 0 else "hourly",
                "hourly_rate": "125.00" if i % 4 else "0",
                "currency": "USD",
            }
        )
        for m in range(12):
            year = 2025 if m < 2 else 2026
            month = m + 11 if m < 2 else m - 1
            issued = date(year, month, 1)
            sid = f"INV-{i:03}-{m:02}"
            hours = Decimal(rng.randrange(40, 100))
            labor_rate = Decimal(45 if i != 3 else 40 + m * 4)
            billed = hours - 16 if (i == 1 and m == 11) else hours
            net = billed * Decimal(125)
            data["invoices"].append(
                {
                    "source_id": sid,
                    "project_id": p,
                    "client_id": c,
                    "issue_date": issued.isoformat(),
                    "due_date": (issued + timedelta(days=30)).isoformat(),
                    "recognition_date": issued.isoformat(),
                    "net_amount": str(net),
                    "tax_amount": "0",
                    "discount_amount": "0",
                    "status": "issued",
                    "currency": "USD",
                }
            )
            time_id = f"TS-{i:03}-{m:02}"
            data["timesheets"].append(
                {
                    "source_id": time_id,
                    "project_id": p,
                    "date": issued.isoformat(),
                    "hours": str(hours + (20 if i % 4 == 0 else 0)),
                    "billable": i % 4 != 0,
                    "billed_hours": str(billed if i % 4 else 0),
                    "write_off": False,
                    "hourly_cost": str(labor_rate),
                    "currency": "USD",
                }
            )
            data["invoice_items"].append(
                {
                    "source_id": f"LINE-{i:03}-{m:02}",
                    "invoice_id": sid,
                    "time_entry_id": time_id,
                    "hours": str(billed),
                    "amount": str(net),
                    "coverage_start": issued.isoformat(),
                    "coverage_end": (issued + timedelta(days=27)).isoformat(),
                }
            )
            unpaid = i in {2, 5, 9} and m >= 9
            factor = Decimal("0.50") if i == 1 and m == 10 else Decimal("1")
            if not unpaid:
                # Split one invoice into two partial allocations to exercise reconciliation.
                parts = [Decimal("0.30"), Decimal("0.20")] if factor == Decimal("0.50") else [Decimal("1")]
                for j, part in enumerate(parts):
                    pay = f"PAY-{i:03}-{m:02}-{j}"
                    data["payments"].append(
                        {
                            "source_id": pay,
                            "payment_date": (issued + timedelta(days=18)).isoformat(),
                            "amount": str(net * part),
                            "status": "valid",
                            "currency": "USD",
                        }
                    )
                    data["payment_allocations"].append(
                        {
                            "source_id": f"ALLOC-{i:03}-{m:02}-{j}",
                            "payment_id": pay,
                            "invoice_id": sid,
                            "amount": str(net * part),
                            "currency": "USD",
                        }
                    )
            for j, category in enumerate(["Infrastructure", "Contractors", "Software"]):
                cost = Decimal(rng.randrange(150, 450))
                if i == 6 and m == 11 and j == 0:
                    cost = Decimal(5400)
                data["expenses"].append(
                    {
                        "source_id": f"EXP-{i:03}-{m:02}-{j}",
                        "project_id": p,
                        "vendor_id": f"V-{j + 1}",
                        "date": issued.isoformat(),
                        "amount": str(cost),
                        "category": category,
                        "reference": f"VENDOR-{i}-{m}-{j}",
                        "currency": "USD",
                        "status": "valid",
                    }
                )
    duplicate = dict(data["expenses"][-8])
    duplicate["source_id"] = "EXP-DUPLICATE"
    data["expenses"].append(duplicate)
    data["credit_notes"].append(
        {
            "source_id": "CN-001",
            "invoice_id": "INV-002-09",
            "amount": "250.00",
            "status": "valid",
            "date": "2026-08-08",
            "currency": "USD",
        }
    )
    data["payments"].append(
        {
            "source_id": "REFUND-001",
            "payment_date": "2026-10-20",
            "amount": "100.00",
            "status": "refund",
            "currency": "USD",
        }
    )
    data["payment_allocations"].append(
        {
            "source_id": "ALLOC-REFUND",
            "payment_id": "REFUND-001",
            "invoice_id": "INV-004-11",
            "amount": "-100.00",
            "currency": "USD",
        }
    )
    data["payments"].append(
        {
            "source_id": "REVERSED-001",
            "payment_date": "2026-10-20",
            "amount": "100.00",
            "status": "reversed",
            "currency": "USD",
        }
    )
    data["payment_allocations"].append(
        {
            "source_id": "ALLOC-REVERSED",
            "payment_id": "REVERSED-001",
            "invoice_id": "INV-005-11",
            "amount": "100.00",
            "currency": "USD",
        }
    )
    return data


def seed(db):
    if db.get(Workspace, DEMO_ID):
        return
    db.add(Workspace(id=DEMO_ID, name="Northstar Digital Studio", settings=DEFAULT_SETTINGS))
    db.flush()
    data = generate()
    records = {}
    for kind, rows in data.items():
        ds = Dataset(
            workspace_id=DEMO_ID,
            name=f"Northstar demo · {kind}.csv",
            kind=kind,
            fingerprint=f"demo-v1-{kind}",
            row_count=len(rows),
            rejected_count=0,
        )
        db.add(ds)
        db.flush()
        for n, payload in enumerate(rows, 2):
            rec = Record(
                workspace_id=DEMO_ID,
                dataset_id=ds.id,
                kind=kind,
                source_id=payload["source_id"],
                payload=payload,
                source_row=n,
            )
            db.add(rec)
            db.flush()
            records[(kind, rec.source_id)] = rec
    for (kind, _), record in records.items():
        for field, target_kind in REFS.get(kind, {}).items():
            target = records.get((target_kind, record.payload.get(field)))
            if target:
                db.add(RecordLink(workspace_id=DEMO_ID, record_id=record.id, target_id=target.id, field=field))
    db.commit()


if __name__ == "__main__":
    from app.database import SessionLocal

    with SessionLocal() as db:
        seed(db)
    print("Fictional Northstar demo is ready.")
