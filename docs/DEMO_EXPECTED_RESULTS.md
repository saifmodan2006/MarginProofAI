# Fictional demo reference results

The generator uses a fixed random seed (`42`) and source dates November 2025 through October 2026. For a fresh, unchanged seed, report period `2025-11-01` through `2026-10-29`, as-of `2026-10-29`, currency USD, default thresholds:

| Metric | Expected value |
| --- | ---: |
| Invoiced / explicitly recognized net revenue | 2,535,500.00 |
| External expenses | 266,574.00 |
| Delivery labor estimate | 994,739.00 |
| Recorded cost of services | 1,261,313.00 |
| Contribution estimate (`gross_profit` API key) | 1,274,187.00 |
| Margin estimate | 50.25% |
| Outstanding receivables | 97,850.00 |
| Overdue receivables | 68,250.00 |
| Potential hourly unbilled estimate | 2,000.00 |
| Collected cash, net of explicit refund | 2,437,400.00 |

The live API marks verified recovered revenue unavailable: no bank-supported recovery verification workflow exists. Resolving a finding does not prove recovery.

Reference source counts: 12 clients, 24 projects, 24 contracts, 288 invoices, 282 payments, 282 allocations, 288 timesheets, 288 invoice items, 865 expenses, four vendors, one credit note. These deliberately prioritize internally consistent scenarios over the larger suggested quotas.

Expected rule candidates at default settings: seven overdue invoices, one unbilled hourly-work finding, one duplicate-expense group, one robust expense outlier, seven project margin findings. Candidate counts change with dates, settings, source imports and corrected records. These categories can overlap; summing their exposure does not calculate a business loss.

Seed scenarios include `PR-001` with 16 unbilled hours × USD 125 in its last month; `INV-001-10` with two partial payments totaling 50%; fixed-price projects with additional non-billable hours excluded from unbilled exposure; `EXP-DUPLICATE` with matching duplicate attributes; a USD 5,400 infrastructure expense in project six; `CN-001` reducing one invoice by USD 250; and separate refund/reversal records. The refund restores an outstanding balance; the reversed payment does not count as collected cash.

These values were obtained by executing the real `generate()` and `analyze()` functions during implementation. They are reference results, not seeded dashboard constants or an assertion that every requested test passed. Integration tests should independently verify smaller known financial fixtures.
