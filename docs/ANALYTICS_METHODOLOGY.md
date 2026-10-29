# Analytics methodology

## Precision and scope

All authoritative financial calculations use Python Decimal. Display amounts are rounded to two decimal places using `ROUND_HALF_UP`; margin is undefined (`null` / N/A) when revenue is zero. Imports support USD, EUR, GBP, INR, CAD, and AUD at two decimal places. Amounts with unsupported precision or currencies are rejected. No FX source or conversion method exists, so dashboards select one currency and report exclusions. Never sum currency-scoped results into a cross-currency total.

Reporting-period metrics and as-of receivables answer different questions. Start/end dates include both endpoints; receivables use invoices issued and valid payments/credits dated on or before the as-of date. Historical periods may therefore have a different outstanding balance from the invoice-period revenue.

## Revenue and reconciliation

- Recognized revenue: active invoice `net_amount` with `recognition_date` inside the reporting period.
- Invoiced revenue: active invoice `net_amount` with `issue_date` inside the reporting period.
- Collected cash: valid payment amounts in the period, less explicit refunds; reversed payments do not count.
- Invoice payable: `net_amount + tax_amount`. **Net amount is already after discounts**; imported `discount_amount` is descriptive and must not be deducted again.
- Signed balance: payable minus applicable valid credit notes minus valid signed payment allocations. Positive balance is outstanding; a negative balance is retained separately as overpayment.
- Overdue: positive outstanding balance with a due date strictly before the as-of date.

Cancelled/draft invoices and reversed/void records are excluded by status rules. Refunds are explicit positive payment records with negative allocations; the signed allocation restores the invoice balance. An unapplied payment is cash but does not reduce an arbitrary invoice. Allocation capacity, currency compatibility, and refund signs are validated. The system is an investigation tool, not a full double-entry ledger. Credit notes reduce receivables but do not establish a comprehensive recognition adjustment policy.

## Costs and profitability

Period expense = valid expense `amount` by expense date. Labor delivery cost = logged hours × hourly cost for period timesheets. Contribution estimate = recognized revenue − recorded expenses − labor delivery cost. Margin = estimate / recognized revenue × 100. API keys retain the names `gross_profit`/`gross_margin`, but these are recorded-cost estimates, not statutory gross or net profit: expense inputs may include unassigned overhead and omit other operating costs, depreciation or tax. Imported expenses must exclude labor already represented by timesheet costs to avoid double counting. Missing recognition dates and labor rates make affected headline profitability unavailable; zero-filled arithmetic is not proof of complete coverage.

Client/project groupings use source relationships. No configurable overhead allocation, net-margin calculation, contract recognition schedule, or inventory accounting is provided. Projects with no delivery records have unavailable cost/profit; a revenue-bearing project without delivery records also makes the headline contribution estimate unavailable.

## Potential unbilled work

Only eligible billable, non-write-off hourly-contract entries contribute. Remaining hours = max(logged hours − billed hours, 0). Explicit invoice-item time links take precedence over a timesheet's imported `billed_hours`. Estimated exposure = remaining hours × contract hourly rate. Fixed-price/retainer work is excluded. Ambiguous contracts and missing positive hourly rates are excluded and counted in coverage; contract version periods are not inferred. This estimates a review opportunity; it is not recognized revenue or guaranteed recoverable cash. Approval, contractual coverage, rate versions, free work, and billing entitlement still require human review.

## Findings and uncertainty

Overdue balances, overpayments/allocation mismatches, possible duplicates, low project margins, potential unbilled time, and unusual expenses are explainable rules. Possible duplicate expenses match vendor, date, amount, and normalized reference; they remain included in expenses until a human corrects the ledger.

Expense outliers use category median absolute deviation (MAD), at least eight observations, and modified score `0.6745 × (amount − median) / MAD > 3.5` for high-side outliers. Zero MAD produces no statistical finding. This is a descriptive threshold, not a calibrated probability or proof of wrongdoing. Confidence labels describe rule evidence, not estimated probabilities. Trends and low margins do not establish causation.

Evidence identifies source dataset, record, external ID, calculation description, and contributing values. Recalculation distinguishes current candidates from historical investigation state. Imported source rows remain the primary reproducibility reference.

Scenarios apply explicit assumptions to the selected baseline. They are arithmetic sensitivity estimates, not forecasts; they do not model demand response, operational constraints, causality, or guaranteed recovery. Verified recovery must be recorded with supporting evidence, never inferred from a resolved finding.
