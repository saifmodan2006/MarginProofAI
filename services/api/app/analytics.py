"""Auditable, currency-isolated financial calculations using Decimal throughout."""

import hashlib
from collections import defaultdict
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from statistics import median

ZERO = Decimal("0")


def dec(value):
    return Decimal(str(value or 0))


def money(value):
    return str(dec(value).quantize(Decimal(".01"), rounding=ROUND_HALF_UP))


def margin(profit, revenue):
    return money(profit / revenue * 100) if revenue else None


def active(row):
    return row.get("status", "valid") not in ("cancelled", "canceled", "draft", "reversed", "void")


def payment_amount(row):
    amount = dec(row.get("amount"))
    return -abs(amount) if row.get("status") == "refund" else amount


def identity(row):
    return str(row.get("source_id") or row.get("id"))


def lookup(rows):
    result = {}
    for row in rows:
        result[identity(row)] = row
        if row.get("id"):
            result[str(row["id"])] = row
    return result


def evidence(row, calculation, **values):
    relevant = {
        "net_amount",
        "tax_amount",
        "discount_amount",
        "amount",
        "hours",
        "billed_hours",
        "hourly_cost",
        "hourly_rate",
        "billable",
        "write_off",
        "issue_date",
        "due_date",
        "recognition_date",
        "payment_date",
        "date",
        "status",
        "currency",
        "invoice_id",
        "payment_id",
        "project_id",
        "time_entry_id",
    }
    return {
        "dataset_id": row.get("dataset_id"),
        "record_id": row.get("id"),
        "source_id": row.get("source_id"),
        "source_row": row.get("source_row"),
        "import_version": row.get("import_version") or row.get("dataset_id"),
        "analysis_version": "1.0.0",
        "calculation": calculation,
        "values": {
            **{k: str(v) if v is not None else None for k, v in row.items() if k in relevant},
            **{k: str(v) for k, v in values.items()},
        },
    }


def reconcile_invoice(invoice, payments, allocations, credits, as_of=None):
    """Signed allocations are authoritative; reversed payments/credits never count.

    Refund payments require negative allocations. A positive allocation on a refund
    is rejected, rather than silently changing its sign. Overpayments stay visible.
    """
    currency = invoice.get("currency", "USD")
    payment_map = lookup(payments)
    ids = {identity(invoice), str(invoice.get("id"))}
    paid = ZERO
    for item in allocations:
        if str(item.get("invoice_id")) not in ids:
            continue
        payment = payment_map.get(str(item.get("payment_id")))
        if not payment:
            continue
        if not active(payment) or (as_of and payment.get("payment_date", "") > as_of):
            continue
        if payment.get("currency", currency) != currency or item.get("currency", currency) != currency:
            raise ValueError("Payment allocation currency does not match invoice currency")
        amount = dec(item.get("amount"))
        if payment.get("status") == "refund" and amount > 0:
            raise ValueError("Refund allocations must be negative")
        paid += amount
    credited = ZERO
    for item in credits:
        if str(item.get("invoice_id")) not in ids or not active(item):
            continue
        if as_of and item.get("date", "") > as_of:
            continue
        if item.get("currency", currency) != currency:
            raise ValueError("Credit note currency does not match invoice currency")
        credited += dec(item.get("amount"))
    # net_amount is tax-exclusive after discounts, as imported from the ledger.
    net = dec(invoice.get("net_amount"))
    tax = dec(invoice.get("tax_amount"))
    balance = net + tax - credited - paid if active(invoice) else ZERO
    return {
        "net_amount": money(net),
        "tax_amount": money(tax),
        "invoice_total": money(net + tax),
        "paid": money(paid),
        "credits": money(credited),
        "balance": money(balance),
        "outstanding": money(max(balance, ZERO)),
        "overpayment": money(max(-balance, ZERO)),
        "currency": currency,
    }


def analyze(data, start, end, as_of, currency="USD", settings=None):
    for value in (start, end, as_of):
        date.fromisoformat(value)
    if start > end:
        raise ValueError("Period start must precede period end")
    settings = settings or {}
    excluded = defaultdict(int)
    rows = {}
    for kind, records in data.items():
        rows[kind] = []
        for row in records:
            if row.get("currency", currency) != currency:
                excluded[kind] += 1
            else:
                rows[kind].append(row)
    invoices = [r for r in rows.get("invoices", []) if active(r)]
    payments = rows.get("payments", [])
    allocations = data.get("payment_allocations", [])  # validate mismatched allocations
    credits = data.get("credit_notes", [])
    clients = rows.get("clients", [])
    projects = rows.get("projects", [])
    contracts = lookup(rows.get("contracts", []))
    client_map, project_map = lookup(clients), lookup(projects)

    def period(value):
        return bool(value and start <= value <= end)

    costs = [r for r in rows.get("expenses", []) if active(r) and period(r.get("date"))]
    times = [r for r in rows.get("timesheets", []) if period(r.get("date"))]
    invoice_period = [r for r in invoices if period(r.get("issue_date"))]
    recognized = [r for r in invoices if period(r.get("recognition_date"))]
    missing = [r for r in invoice_period if not r.get("recognition_date")]
    revenue = sum((dec(r.get("net_amount")) for r in recognized), ZERO)
    invoiced = sum((dec(r.get("net_amount")) for r in invoice_period), ZERO)
    expense = sum((dec(r.get("amount")) for r in costs), ZERO)
    labor = sum((dec(r.get("hours")) * dec(r.get("hourly_cost")) for r in times), ZERO)
    labor_missing = sum(1 for r in times if r.get("hourly_cost") is None)
    delivery_projects = {str(r.get("project_id")) for r in times + costs if r.get("project_id")}
    missing_delivery = []
    for project in projects:
        ids = {identity(project), str(project.get("id"))}
        if not ids.intersection(delivery_projects):
            missing_delivery.append(project)
    missing_delivery_ids = {key for project in missing_delivery for key in (identity(project), str(project.get("id")))}
    incomplete_delivery = any(str(r.get("project_id")) in missing_delivery_ids for r in recognized)
    profit = revenue - expense - labor
    cash = sum((payment_amount(r) for r in payments if active(r) and period(r.get("payment_date"))), ZERO)
    finding_list = []

    def finding(
        kind,
        title,
        amount,
        records,
        description,
        action,
        severity="medium",
        confidence="high",
        identity_records=None,
        calculation_values=None,
    ):
        identities = identity_records if identity_records is not None else records
        key = hashlib.sha256((kind + "|" + "|".join(sorted(identity(r) for r in identities))).encode()).hexdigest()[:24]
        finding_list.append(
            {
                "key": key,
                "title": title,
                "category": kind,
                "severity": severity,
                "confidence": confidence,
                "amount": money(amount),
                "currency": currency,
                "description": description,
                "next_action": action,
                "evidence": [
                    evidence(r, description, finding_amount=amount, **(calculation_values or {})) for r in records
                ],
            }
        )

    outstanding = overdue = ZERO
    aging = {k: ZERO for k in ("Current", "1–30 days", "31–60 days", "61–90 days", "90+ days")}
    client_outstanding = defaultdict(lambda: ZERO)
    for inv in invoices:
        if inv.get("issue_date", "") > as_of:
            continue
        result = reconcile_invoice(inv, data.get("payments", []), allocations, credits, as_of)
        ids = {identity(inv), str(inv.get("id"))}
        related = [inv]
        payment_map = lookup(data.get("payments", []))
        seen_payments = set()
        for allocation in allocations:
            payment = payment_map.get(str(allocation.get("payment_id")))
            if (
                str(allocation.get("invoice_id")) in ids
                and payment
                and active(payment)
                and payment.get("payment_date", "") <= as_of
            ):
                related.append(allocation)
                if identity(payment) not in seen_payments:
                    related.append(payment)
                    seen_payments.add(identity(payment))
        related.extend(
            c for c in credits if str(c.get("invoice_id")) in ids and active(c) and c.get("date", "") <= as_of
        )
        reconciliation = {k: result[k] for k in ("invoice_total", "paid", "credits", "outstanding", "balance")}
        balance = dec(result["outstanding"])
        outstanding += balance
        client_outstanding[str(inv.get("client_id"))] += balance
        days = (date.fromisoformat(as_of) - date.fromisoformat(inv.get("due_date") or as_of)).days
        bucket = (
            "Current"
            if days <= 0
            else "1–30 days"
            if days <= 30
            else "31–60 days"
            if days <= 60
            else "61–90 days"
            if days <= 90
            else "90+ days"
        )
        aging[bucket] += balance
        if days > 0:
            overdue += balance
        if days > int(settings.get("overdue_days", 0)) and balance:
            finding(
                "overdue",
                "Overdue invoice",
                balance,
                related,
                f"Invoice total less valid allocated payments and credits is {money(balance)}; {days} days past due.",
                "Confirm the balance with the ledger and contact the client.",
                "high" if days > 30 else "medium",
                identity_records=[inv],
                calculation_values=reconciliation,
            )
        if dec(result["overpayment"]):
            finding(
                "payment_mismatch",
                "Invoice overpayment",
                dec(result["overpayment"]),
                related,
                "Valid allocated payments and credits exceed the invoice total.",
                "Review allocation, credit note, or refund records.",
                identity_records=[inv],
                calculation_values=reconciliation,
            )
    # Explicit invoice-item time links take precedence over imported billed_hours.
    billed = defaultdict(lambda: ZERO)
    linked = set()
    invoice_map = lookup([r for r in invoices if r.get("issue_date", "") <= as_of])
    for item in rows.get("invoice_items", []):
        if item.get("time_entry_id") and str(item.get("invoice_id")) in invoice_map:
            key = str(item["time_entry_id"])
            linked.add(key)
            billed[key] += dec(item.get("hours"))
    unbilled = ZERO
    ambiguous_contracts = set()
    missing_rates = set()
    for entry in times:
        if not entry.get("billable") or entry.get("write_off"):
            continue
        project = project_map.get(str(entry.get("project_id")), {})
        contract = contracts.get(str(project.get("contract_id")))
        if not contract:
            candidates = [
                c
                for c in rows.get("contracts", [])
                if str(c.get("project_id")) in (identity(project), str(project.get("id")))
            ]
            if len(candidates) > 1:
                ambiguous_contracts.add(identity(project))
                continue
            contract = candidates[0] if candidates else None
        if not contract:
            missing_rates.add(identity(project))
            continue
        if not contract or contract.get("kind") != "hourly":
            continue
        if contract.get("hourly_rate") in (None, "") or dec(contract.get("hourly_rate")) <= 0:
            missing_rates.add(identity(project))
            continue
        ids = (identity(entry), str(entry.get("id")))
        billed_hours = (
            sum((billed[k] for k in set(ids) if k in linked), ZERO)
            if any(k in linked for k in ids)
            else dec(entry.get("billed_hours"))
        )
        hours = max(dec(entry.get("hours")) - billed_hours, ZERO)
        amount = hours * dec(contract.get("hourly_rate"))
        unbilled += amount
        if amount:
            finding(
                "unbilled",
                "Unbilled hourly work",
                amount,
                [entry, contract],
                f"{hours} eligible unbilled hours × contractual hourly rate {contract.get('hourly_rate')}.",
                "Verify time approval and invoice coverage before billing.",
            )
    duplicate_groups = defaultdict(list)
    for row in costs:
        duplicate_groups[
            (
                row.get("vendor_id"),
                row.get("date"),
                dec(row.get("amount")),
                str(row.get("reference", "")).strip().lower(),
            )
        ].append(row)
    for group in duplicate_groups.values():
        if len(group) > 1:
            finding(
                "duplicate_expense",
                "Possible duplicate expense",
                dec(group[0].get("amount")) * (len(group) - 1),
                group,
                "Same vendor, date, amount and reference; candidates remain included in expenses.",
                "Compare receipts and ledger entries before removing a duplicate.",
                confidence="medium",
            )
    categories = defaultdict(list)
    for row in costs:
        categories[row.get("category") or "Uncategorized"].append(row)
    for category, group in categories.items():
        if len(group) < 8:
            continue
        values = [dec(r.get("amount")) for r in group]
        center = median(values)
        mad = median([abs(v - center) for v in values])
        if not mad:
            continue  # no reliable dispersion estimate
        for row in group:
            value = dec(row.get("amount"))
            if value > center and Decimal(".6745") * (value - center) / mad > dec(
                settings.get("anomaly_threshold", "3.5")
            ):
                finding(
                    "expense_anomaly",
                    "Unusual expense amount",
                    value,
                    [row],
                    f"Category {category}: robust MAD score exceeds configured threshold {settings.get('anomaly_threshold', '3.5')} (median {money(center)}, MAD {money(mad)}, n={len(group)}).",
                    "Check the receipt and business context; unusual does not mean incorrect.",
                    confidence="medium",
                )
    # Detect unapplied and overallocated payments independently of invoice balances.
    for payment in payments:
        if not active(payment) or payment.get("payment_date", "") > as_of:
            continue
        ids = {identity(payment), str(payment.get("id"))}
        used = ZERO
        for item in allocations:
            if str(item.get("payment_id")) in ids:
                if item.get("currency", currency) != currency:
                    raise ValueError("Payment allocation currency does not match payment currency")
                used += dec(item.get("amount"))
        difference = payment_amount(payment) - used
        if difference:
            finding(
                "payment_mismatch",
                "Payment allocation mismatch",
                abs(difference),
                [payment],
                f"Payment amount {money(payment.get('amount'))} less allocated amount {money(used)} = {money(difference)}.",
                "Reconcile the payment against invoice allocations and bank records.",
            )
    trend = defaultdict(lambda: {"revenue": ZERO, "expenses": ZERO, "cash": ZERO, "labor": ZERO})
    for r in recognized:
        trend[r["recognition_date"][:7]]["revenue"] += dec(r.get("net_amount"))
    for r in costs:
        trend[r["date"][:7]]["expenses"] += dec(r.get("amount"))
    for r in times:
        trend[r["date"][:7]]["labor"] += dec(r.get("hours")) * dec(r.get("hourly_cost"))
    for r in payments:
        if active(r) and period(r.get("payment_date")):
            trend[r["payment_date"][:7]]["cash"] += payment_amount(r)
    month = date.fromisoformat(start).replace(day=1)
    while month.isoformat() <= end:
        trend[month.isoformat()[:7]]
        month = date(month.year + (month.month == 12), 1 if month.month == 12 else month.month + 1, 1)
    trend_rows = []
    for month, item in sorted(trend.items()):
        p = item["revenue"] - item["expenses"] - item["labor"]
        trend_rows.append(
            {
                "month": month,
                **{k: money(item[k]) for k in ("revenue", "expenses", "cash")},
                "profit": None if missing or labor_missing or incomplete_delivery else money(p),
                "margin": None if missing or labor_missing or incomplete_delivery else margin(p, item["revenue"]),
            }
        )
    client_rows = []
    for client in clients:
        ids = {identity(client), str(client.get("id"))}
        rev = sum((dec(r.get("net_amount")) for r in recognized if str(r.get("client_id")) in ids), ZERO)
        incomplete = any(str(r.get("client_id")) in ids for r in missing)
        client_rows.append(
            {
                "id": identity(client),
                "name": client.get("name"),
                "revenue": None if incomplete else money(rev),
                "outstanding": money(sum((client_outstanding[k] for k in ids), ZERO)),
            }
        )
    project_rows = []
    for project in projects:
        ids = {identity(project), str(project.get("id"))}
        rev = sum((dec(r.get("net_amount")) for r in recognized if str(r.get("project_id")) in ids), ZERO)
        pt = [r for r in times if str(r.get("project_id")) in ids]
        cost = sum((dec(r.get("hours")) * dec(r.get("hourly_cost")) for r in pt), ZERO) + sum(
            (dec(r.get("amount")) for r in costs if str(r.get("project_id")) in ids), ZERO
        )
        client = client_map.get(str(project.get("client_id")), {})
        incomplete = any(str(r.get("project_id")) in ids for r in missing)
        missing_cost = any(r.get("hourly_cost") is None for r in pt) or bool(ids.intersection(missing_delivery_ids))
        project_rows.append(
            {
                "id": identity(project),
                "name": project.get("name"),
                "client": client.get("name", "Unknown"),
                "revenue": None if incomplete else money(rev),
                "cost": None if missing_cost else money(cost),
                "profit": None if incomplete or missing_cost else money(rev - cost),
                "margin": None if incomplete or missing_cost else margin(rev - cost, rev),
                "hours": money(sum((dec(r.get("hours")) for r in pt), ZERO)),
            }
        )
        monthly = defaultdict(lambda: {"revenue": ZERO, "cost": ZERO, "records": []})
        for inv in recognized:
            if str(inv.get("project_id")) in ids:
                monthly[inv["recognition_date"][:7]]["revenue"] += dec(inv.get("net_amount"))
                monthly[inv["recognition_date"][:7]]["records"].append(inv)
        for entry in pt:
            monthly[entry["date"][:7]]["cost"] += dec(entry.get("hours")) * dec(entry.get("hourly_cost"))
            monthly[entry["date"][:7]]["records"].append(entry)
        for entry in costs:
            if str(entry.get("project_id")) in ids:
                monthly[entry["date"][:7]]["cost"] += dec(entry.get("amount"))
                monthly[entry["date"][:7]]["records"].append(entry)
        comparable = [(month, item) for month, item in sorted(monthly.items()) if item["revenue"] > 0]
        if len(comparable) >= 3 and not incomplete and not missing_cost:
            first, last = comparable[0], comparable[-1]
            old_margin = (first[1]["revenue"] - first[1]["cost"]) / first[1]["revenue"] * 100
            new_margin = (last[1]["revenue"] - last[1]["cost"]) / last[1]["revenue"] * 100
            if old_margin - new_margin >= 10:
                shortfall = last[1]["revenue"] * (old_margin - new_margin) / 100
                finding(
                    "margin_decline",
                    "Declining project margin",
                    shortfall,
                    first[1]["records"] + last[1]["records"],
                    f"{project.get('name')}: margin fell from {money(old_margin)}% ({first[0]}) to {money(new_margin)}% ({last[0]}). Amount is latest-month profit gap at the earlier margin, not recoverable revenue.",
                    "Review scope, delivery hours and costs across comparable months.",
                    confidence="medium",
                )
    return {
        "currency": currency,
        "start": start,
        "end": end,
        "as_of": as_of,
        "metrics": {
            "invoiced_revenue": money(invoiced),
            "recognized_revenue": None if missing else money(revenue),
            "expenses": money(expense),
            "delivery_labor": money(labor),
            "cost_of_services": money(expense + labor),
            "gross_profit": None if missing or labor_missing or incomplete_delivery else money(profit),
            "gross_margin": None if missing or labor_missing or incomplete_delivery else margin(profit, revenue),
            "outstanding": money(outstanding),
            "overdue": money(overdue),
            "unbilled": money(unbilled),
            "collected_cash": money(cash),
            "unresolved_findings": len(finding_list),
            "completed_investigations": 0,
            "recovered_revenue": None,
        },
        "trend": trend_rows,
        "aging": [{"bucket": k, "amount": money(v)} for k, v in aging.items()],
        "clients": client_rows,
        "projects": project_rows,
        "expense_categories": [
            {"category": k, "amount": money(sum((dec(r.get("amount")) for r in group), ZERO))}
            for k, group in categories.items()
        ],
        "coverage": {
            "excluded_currency_records": dict(excluded),
            "missing_recognition_dates": len(missing),
            "missing_labor_costs": labor_missing,
            "ambiguous_contracts": len(ambiguous_contracts),
            "missing_rates": len(missing_rates),
            "missing_delivery_projects": len(missing_delivery),
            "invoice_count": len(invoice_period),
            "expense_count": len(costs),
            "timesheet_count": len(times),
            "currency_conversion": False,
        },
        "methodology": [
            {
                "metric": "invoiced_revenue",
                "formula": "Sum of issued net_amount by issue date, excluding tax.",
                "limitations": "net_amount is after discounts; discount_amount is informational and never deducted twice.",
            },
            {
                "metric": "recognized_revenue",
                "formula": "Sum of net_amount by explicit recognition_date.",
                "limitations": "Unavailable if a period invoice has no recognition date. Credit notes affect receivables; no credit revenue recognition is inferred.",
            },
            {
                "metric": "gross_profit",
                "formula": "Recognized revenue − external expenses − hours × hourly_cost.",
                "limitations": "Unavailable when recognition dates or hourly costs are missing, or a revenue-bearing project has no delivery timesheets or expenses in the period. Projects with no delivery data have unavailable cost and profit. External expense total includes unassigned overhead.",
            },
            {
                "metric": "outstanding",
                "formula": "Positive invoice net + tax − valid signed payment allocations − valid credits, as of selected date.",
                "limitations": "Balances use all history through as_of; overpayments are separate findings.",
            },
            {
                "metric": "unbilled",
                "formula": "Eligible hourly-contract hours less explicitly invoiced hours, multiplied by contract rate.",
                "limitations": "Invoice-item time links take precedence over billed_hours. Fixed and retainer work and write-offs excluded. Multiple contracts without an explicit project contract link and missing positive rates are excluded and counted in coverage; contract versions are not inferred. Review before billing.",
            },
            {
                "metric": "collected_cash",
                "formula": "Valid payment amounts by payment_date; refunds normalized to negative absolute amounts.",
                "limitations": "Includes unapplied cash; does not imply recognized revenue. No currency conversion.",
            },
        ],
        "findings": finding_list,
    }


def scenario(dashboard, assumptions):
    """Deterministic sensitivity model; recovery amounts are projections only."""
    baseline = dict(dashboard["metrics"])
    baseline.update(
        revenue=baseline.get("recognized_revenue"),
        cost=baseline.get("cost_of_services"),
        profit=baseline.get("gross_profit"),
        margin=baseline.get("gross_margin"),
    )

    def percent(key):
        value = dec(assumptions.get(key, 0))
        if value < -100 or value > 100:
            raise ValueError(f"{key} must be between -100 and 100")
        return value / 100

    aliases = dict(assumptions)
    assumptions = dict(assumptions)
    assumptions.setdefault("rate_increase_pct", assumptions.get("rate_change", 0))
    assumptions.setdefault("expense_reduction_pct", -dec(assumptions.get("cost_change", 0)))
    assumptions.setdefault("unbilled_recovery_pct", assumptions.get("unbilled_reduction", 0))
    rate = percent("rate_increase_pct")
    cost_reduction = percent("expense_reduction_pct")
    recovery = percent("unbilled_recovery_pct")
    collection = percent("overdue_collection_pct")
    if min(recovery, collection) < 0:
        raise ValueError("Recovery percentages cannot be negative")
    delay_days = dec(assumptions.get("delay_days", 0))
    if delay_days < 0 or delay_days > 365:
        raise ValueError("delay_days must be between 0 and 365")
    if baseline.get("recognized_revenue") is None or baseline.get("gross_profit") is None:
        return {
            "baseline": baseline,
            "projected": None,
            "difference": None,
            "working_capital_release": None,
            "unbilled_opportunity": None,
            "sensitivity": [],
            "assumptions": ["Revenue recognition coverage is incomplete."],
            "inputs": aliases,
            "limitations": ["Revenue recognition coverage is incomplete; projection unavailable."],
        }
    revenue = dec(baseline["recognized_revenue"]) * (1 + rate) + dec(baseline["unbilled"]) * recovery
    expenses = dec(baseline["expenses"]) * (1 - cost_reduction)
    labor = (
        dec(baseline.get("delivery_labor", 0)) * (1 - cost_reduction)
        if "cost_change" in aliases
        else dec(baseline.get("delivery_labor", 0))
    )
    profit = revenue - expenses - labor
    days = (date.fromisoformat(dashboard["end"]) - date.fromisoformat(dashboard["start"])).days + 1
    release = min(dec(baseline["outstanding"]), dec(baseline["invoiced_revenue"]) / days * delay_days)
    projected = {
        "recognized_revenue": money(revenue),
        "expenses": money(expenses),
        "gross_profit": money(profit),
        "gross_margin": margin(profit, revenue),
        "collected_cash": money(
            dec(baseline["collected_cash"])
            + min(dec(baseline["outstanding"]), dec(baseline["overdue"]) * collection + release)
        ),
    }
    projected.update(
        revenue=money(revenue), cost=money(expenses + labor), profit=money(profit), margin=margin(profit, revenue)
    )
    difference = {
        k: money(dec(v) - dec(baseline[k])) if v is not None and baseline.get(k) is not None else None
        for k, v in projected.items()
    }
    return {
        "baseline": baseline,
        "projected": projected,
        "difference": difference,
        "working_capital_release": money(release),
        "unbilled_opportunity": money(dec(baseline["unbilled"]) * recovery),
        "sensitivity": [
            {
                "rate_change": money((rate * 100) + step),
                "profit": money(profit + dec(baseline["recognized_revenue"]) * step / 100),
                "gross_profit": money(profit + dec(baseline["recognized_revenue"]) * step / 100),
            }
            for step in (Decimal("-5"), ZERO, Decimal("5"))
        ],
        "inputs": aliases,
        "assumptions": [
            f"Rate change {money(rate * 100)}%; delivery cost change {money(-cost_reduction * 100)}%; unbilled conversion {money(recovery * 100)}%.",
            "Rate changes apply to baseline recognized revenue. Delivery cost changes apply to labor and external expenses.",
            "Payment delay reduction changes cash availability, never revenue. Unbilled conversion assumes eligible work becomes recognizable.",
        ],
        "limitations": [
            "Hypothetical sensitivity only; rate changes apply to baseline revenue; cost_change applies to delivery labor and external expenses.",
            "Unbilled recovery assumes work becomes recognizable. Collections change cash, never revenue.",
            "delay_days models faster collection: period invoice revenue / period days × days saved, capped at outstanding.",
            "No saved finding status or recovered revenue is changed.",
        ],
    }
