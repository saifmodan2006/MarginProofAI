from copy import deepcopy
from decimal import Decimal

import pytest

from app.analytics import analyze, reconcile_invoice, scenario


@pytest.fixture
def data():
    return {
        "clients": [{"id": "client-uuid", "source_id": "c1", "name": "Acme", "currency": "USD"}],
        "projects": [
            {
                "id": "project-uuid",
                "source_id": "p1",
                "name": "Build",
                "client_id": "c1",
                "contract_id": "ct1",
                "currency": "USD",
            }
        ],
        "contracts": [
            {
                "id": "contract-uuid",
                "source_id": "ct1",
                "project_id": "p1",
                "kind": "hourly",
                "hourly_rate": "100",
                "currency": "USD",
            }
        ],
        "invoices": [
            {
                "id": "invoice-uuid",
                "source_id": "i1",
                "dataset_id": "d1",
                "project_id": "p1",
                "client_id": "c1",
                "issue_date": "2026-01-05",
                "recognition_date": "2026-01-05",
                "due_date": "2026-01-15",
                "net_amount": "1000",
                "discount_amount": "100",
                "tax_amount": "100",
                "status": "issued",
                "currency": "USD",
            }
        ],
        "payments": [
            {
                "id": "payment-uuid",
                "source_id": "pay1",
                "payment_date": "2026-01-10",
                "amount": "300",
                "currency": "USD",
                "status": "valid",
            }
        ],
        "payment_allocations": [
            {"id": "a1", "payment_id": "pay1", "invoice_id": "i1", "amount": "300", "currency": "USD"}
        ],
        "credit_notes": [
            {
                "id": "credit1",
                "invoice_id": "i1",
                "amount": "100",
                "date": "2026-01-12",
                "status": "valid",
                "currency": "USD",
            }
        ],
        "timesheets": [
            {
                "id": "time-uuid",
                "source_id": "t1",
                "dataset_id": "d2",
                "project_id": "p1",
                "date": "2026-01-04",
                "hours": "10",
                "hourly_cost": "20",
                "billed_hours": "4",
                "billable": True,
                "write_off": False,
                "currency": "USD",
            }
        ],
        "invoice_items": [{"id": "item1", "invoice_id": "i1", "time_entry_id": "t1", "hours": "7", "currency": "USD"}],
        "expenses": [
            {
                "id": "e1",
                "dataset_id": "d3",
                "project_id": "p1",
                "vendor_id": "v1",
                "date": "2026-01-08",
                "amount": "50.25",
                "category": "Cloud",
                "reference": "R1",
                "currency": "USD",
            }
        ],
        "vendors": [],
    }


def run(data, **kwargs):
    return analyze(data, "2026-01-01", "2026-01-31", "2026-01-31", **kwargs)


def test_verified_decimal_dashboard(data):
    result = run(data)
    metrics = result["metrics"]
    assert metrics["invoiced_revenue"] == "1000.00"  # imported net already includes discount
    assert metrics["recognized_revenue"] == "1000.00"
    assert metrics["expenses"] == "50.25"
    assert metrics["cost_of_services"] == "250.25"
    assert metrics["gross_profit"] == "749.75"
    assert metrics["gross_margin"] == "74.98"
    assert metrics["outstanding"] == metrics["overdue"] == "700.00"
    assert metrics["unbilled"] == "300.00"  # explicit 7 hours overrides imported 4
    assert metrics["collected_cash"] == "300.00"
    assert sum(Decimal(r["amount"]) for r in result["aging"]) == Decimal("700")
    assert result["projects"][0]["profit"] == "749.75"
    assert result["clients"][0]["outstanding"] == "700.00"
    assert result["findings"][0]["evidence"][0]["dataset_id"] == "d1"


def test_reconcile_signed_refunds_reversals_and_future_credits(data):
    data["payments"] += [
        {"source_id": "refund", "status": "refund", "amount": "-50", "payment_date": "2026-01-20", "currency": "USD"},
        {
            "source_id": "reversed",
            "status": "reversed",
            "amount": "400",
            "payment_date": "2026-01-20",
            "currency": "USD",
        },
    ]
    data["payment_allocations"] += [
        {"payment_id": "refund", "invoice_id": "i1", "amount": "-50"},
        {"payment_id": "reversed", "invoice_id": "i1", "amount": "400"},
    ]
    data["credit_notes"] += [
        {"invoice_id": "i1", "amount": "90", "status": "cancelled", "date": "2026-01-10"},
        {"invoice_id": "i1", "amount": "90", "status": "valid", "date": "2026-02-10"},
    ]
    result = reconcile_invoice(
        data["invoices"][0], data["payments"], data["payment_allocations"], data["credit_notes"], "2026-01-31"
    )
    assert result["paid"] == "250.00"
    assert result["credits"] == "100.00"
    assert result["balance"] == "750.00"
    assert run(data)["metrics"]["collected_cash"] == "250.00"


def test_no_fixed_fee_unbilled_no_writeoff(data):
    data["contracts"][0]["kind"] = "fixed"
    assert run(data)["metrics"]["unbilled"] == "0.00"
    data["contracts"][0]["kind"] = "hourly"
    data["timesheets"][0]["write_off"] = True
    assert run(data)["metrics"]["unbilled"] == "0.00"


def test_missing_recognition_and_labor_cost_are_unavailable(data):
    data["invoices"][0].pop("recognition_date")
    result = run(data)
    assert result["metrics"]["recognized_revenue"] is None
    assert result["metrics"]["gross_profit"] is None
    assert result["coverage"]["missing_recognition_dates"] == 1
    assert scenario(result, {})["projected"] is None
    data["invoices"][0]["recognition_date"] = "2026-01-05"
    data["timesheets"][0].pop("hourly_cost")
    assert run(data)["metrics"]["gross_profit"] is None


def test_period_and_asof_are_distinct(data):
    data["invoices"][0]["issue_date"] = "2025-12-01"
    data["invoices"][0]["recognition_date"] = "2025-12-01"
    result = run(data)
    assert result["metrics"]["invoiced_revenue"] == "0.00"
    assert result["metrics"]["outstanding"] == "700.00"
    data["payments"][0]["payment_date"] = "2026-02-01"
    assert run(data)["metrics"]["outstanding"] == "1000.00"


def test_currency_isolation_and_cross_currency_rejection(data):
    extra = deepcopy(data["expenses"][0])
    extra.update(id="eur", currency="EUR", amount="99999")
    data["expenses"].append(extra)
    result = run(data)
    assert result["metrics"]["expenses"] == "50.25"
    assert result["coverage"]["excluded_currency_records"] == {"expenses": 1}
    data["payment_allocations"][0]["currency"] = "EUR"
    with pytest.raises(ValueError, match="currency"):
        run(data)


def test_duplicates_and_anomalies_are_review_candidates_not_removed(data):
    duplicate = deepcopy(data["expenses"][0])
    duplicate["id"] = "duplicate"
    data["expenses"].append(duplicate)
    for i, amount in enumerate(["10", "11", "12", "13", "14", "15", "16", "1000"]):
        data["expenses"].append(
            {
                "id": f"anom{i}",
                "date": "2026-01-10",
                "amount": amount,
                "category": "Travel",
                "reference": str(i),
                "currency": "USD",
            }
        )
    result = run(data)
    kinds = [f["category"] for f in result["findings"]]
    assert kinds.count("duplicate_expense") == 1
    assert kinds.count("expense_anomaly") == 1
    assert result["metrics"]["expenses"] == "1191.50"
    assert result["findings"] == run(data)["findings"]  # stable evidence and keys


def test_overpayment_and_allocation_mismatch(data):
    data["payments"][0]["amount"] = "1400"
    data["payment_allocations"][0]["amount"] = "1200"
    result = run(data)
    assert result["metrics"]["outstanding"] == "0.00"
    mismatches = [f for f in result["findings"] if f["category"] == "payment_mismatch"]
    assert sorted(f["amount"] for f in mismatches) == ["200.00", "200.00"]


def test_cancelled_and_draft_do_not_create_revenue_or_receivables(data):
    for status in ("cancelled", "draft"):
        data["invoices"][0]["status"] = status
        result = run(data)
        assert result["metrics"]["recognized_revenue"] == "0.00"
        assert result["metrics"]["outstanding"] == "0.00"


def test_zero_revenue_margin_and_empty_data():
    result = run({})
    assert result["metrics"]["gross_margin"] is None
    assert result["metrics"]["gross_profit"] == "0.00"
    assert len(result["trend"]) == 1


def test_scenario_does_not_book_collection_as_revenue(data):
    baseline = run(data)
    result = scenario(baseline, {"overdue_collection_pct": 100})
    assert result["projected"]["recognized_revenue"] == "1000.00"
    assert result["projected"]["collected_cash"] == "1000.00"
    assert baseline["metrics"]["recovered_revenue"] is None
    with pytest.raises(ValueError):
        scenario(baseline, {"expense_reduction_pct": 101})


def test_ui_scenario_contract_and_positive_refund_convention(data):
    data["payments"].append(
        {"source_id": "refund", "status": "refund", "amount": "50", "payment_date": "2026-01-20", "currency": "USD"}
    )
    data["payment_allocations"].append({"payment_id": "refund", "invoice_id": "i1", "amount": "-50"})
    baseline = run(data)
    assert baseline["metrics"]["collected_cash"] == "250.00"
    assert not [f for f in baseline["findings"] if f["category"] == "payment_mismatch"]
    result = scenario(baseline, {"rate_change": 10, "cost_change": 20, "unbilled_reduction": 50, "delay_days": 10})
    assert result["baseline"]["revenue"] == "1000.00"
    assert result["projected"]["revenue"] == "1250.00"
    assert result["projected"]["cost"] == "300.30"
    assert result["projected"]["profit"] == "949.70"
    assert result["working_capital_release"] == "322.58"
    assert result["unbilled_opportunity"] == "150.00"
    assert all(isinstance(s, str) for s in result["assumptions"])
    assert all("profit" in row for row in result["sensitivity"])


def test_declining_project_margin_evidence(data):
    for month, hourly_cost in [("02", "40"), ("03", "60")]:
        inv = deepcopy(data["invoices"][0])
        inv.update(
            id="inv" + month,
            source_id="inv" + month,
            issue_date=f"2026-{month}-05",
            recognition_date=f"2026-{month}-05",
        )
        data["invoices"].append(inv)
        time = deepcopy(data["timesheets"][0])
        time.update(id="time" + month, source_id="time" + month, date=f"2026-{month}-04", hourly_cost=hourly_cost)
        data["timesheets"].append(time)
    result = analyze(data, "2026-01-01", "2026-03-31", "2026-03-31")
    declines = [f for f in result["findings"] if f["category"] == "margin_decline"]
    assert len(declines) == 1
    assert declines[0]["confidence"] == "medium"
    assert len(declines[0]["evidence"]) >= 4


def test_overdue_contractual_metric_independent_of_finding_threshold(data):
    result = run(data, settings={"overdue_days": 30})
    assert result["metrics"]["overdue"] == "700.00"
    assert not [f for f in result["findings"] if f["category"] == "overdue"]
    assert sum(Decimal(r["amount"]) for r in result["aging"] if r["bucket"] != "Current") == Decimal("700")


def test_invoice_evidence_includes_reconciliation_sources_and_stable_key(data):
    data["invoices"][0]["source_row"] = 8
    original = next(f for f in run(data)["findings"] if f["category"] == "overdue")
    data["payments"].append(
        {
            "id": "extra-pay",
            "source_id": "extra-pay",
            "dataset_id": "payments-dataset",
            "source_row": 3,
            "payment_date": "2026-01-25",
            "amount": "50",
            "currency": "USD",
        }
    )
    data["payment_allocations"].append(
        {
            "id": "extra-allocation",
            "source_id": "extra-allocation",
            "dataset_id": "allocations-dataset",
            "source_row": 4,
            "payment_id": "extra-pay",
            "invoice_id": "i1",
            "amount": "50",
            "currency": "USD",
        }
    )
    updated = next(f for f in run(data)["findings"] if f["category"] == "overdue")
    assert original["key"] == updated["key"]
    by_id = {e["record_id"]: e for e in updated["evidence"]}
    assert set(by_id) >= {"invoice-uuid", "payment-uuid", "a1", "credit1", "extra-pay", "extra-allocation"}
    for e in updated["evidence"]:
        assert e["values"]["invoice_total"] == "1100.00"
        assert e["values"]["paid"] == "350.00"
        assert e["values"]["credits"] == "100.00"
        assert e["values"]["outstanding"] == "650.00"
        assert e["analysis_version"] == "1.0.0"
    assert by_id["invoice-uuid"]["values"]["net_amount"] == "1000"
    assert by_id["invoice-uuid"]["source_row"] == 8
    assert by_id["extra-pay"]["import_version"] == "payments-dataset"
    assert by_id["extra-allocation"]["values"]["amount"] == "50"


def test_reconciliation_evidence_excludes_inactive_or_future_sources(data):
    data["credit_notes"] += [
        {"id": "cancelled-credit", "invoice_id": "i1", "amount": "20", "date": "2026-01-20", "status": "cancelled"},
        {"id": "future-credit", "invoice_id": "i1", "amount": "20", "date": "2026-02-20"},
    ]
    data["payments"].append({"id": "reversed-pay", "payment_date": "2026-01-20", "amount": "20", "status": "reversed"})
    data["payment_allocations"].append(
        {"id": "reversed-alloc", "payment_id": "reversed-pay", "invoice_id": "i1", "amount": "20"}
    )
    finding = next(f for f in run(data)["findings"] if f["category"] == "overdue")
    assert not {"cancelled-credit", "future-credit", "reversed-pay", "reversed-alloc"}.intersection(
        e["record_id"] for e in finding["evidence"]
    )


def test_multiple_contracts_without_explicit_link_are_ambiguous(data):
    data["projects"][0].pop("contract_id")
    extra = deepcopy(data["contracts"][0])
    extra.update(id="other-contract", source_id="other-contract", hourly_rate="300")
    data["contracts"].append(extra)
    result = run(data)
    assert result["metrics"]["unbilled"] == "0.00"
    assert result["coverage"]["ambiguous_contracts"] == 1
    assert result["coverage"]["missing_rates"] == 0
    data["projects"][0]["contract_id"] = "other-contract"
    assert run(data)["metrics"]["unbilled"] == "900.00"


@pytest.mark.parametrize("rate", [None, "", "0"])
def test_missing_positive_hourly_rate_is_excluded_with_coverage(data, rate):
    data["contracts"][0]["hourly_rate"] = rate
    result = run(data)
    assert result["metrics"]["unbilled"] == "0.00"
    assert result["coverage"]["missing_rates"] == 1


def test_project_without_delivery_records_profitability_unavailable(data):
    data["timesheets"] = []
    data["expenses"] = []
    result = run(data)
    assert result["metrics"]["recognized_revenue"] == "1000.00"
    assert result["metrics"]["gross_profit"] is None
    assert result["metrics"]["gross_margin"] is None
    assert result["projects"][0]["cost"] is None
    assert result["projects"][0]["profit"] is None
    assert result["coverage"]["missing_delivery_projects"] == 1
    assert scenario(result, {})["projected"] is None
    # Truly empty data still has a well-defined zero activity total.
    assert run({})["metrics"]["gross_profit"] == "0.00"


def test_anomaly_description_reports_configured_threshold(data):
    data["expenses"] = [
        {"id": str(i), "date": "2026-01-20", "amount": amount, "category": "Travel"}
        for i, amount in enumerate(["10", "11", "12", "13", "14", "15", "16", "1000"])
    ]
    findings = run(data, settings={"anomaly_threshold": 5})["findings"]
    finding = next(f for f in findings if f["category"] == "expense_anomaly")
    assert "configured threshold 5" in finding["description"]
