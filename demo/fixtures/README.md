# Fictional import samples

Upload `clients.csv` as Clients for a new fictional client. Upload `expenses.csv` as Expenses in the seeded Northstar workspace: the project and vendor references already exist. Both files have canonical column headers so mapping is automatic. Validate, inspect the summary, then explicitly import the accepted row. Importing expenses increases recorded external cost by exactly USD 175.25; rollback restores the original amount.

Source identifiers are stable, so repeating an active import is rejected. To test rejection reporting, copy a file and put `not-a-date` in a date field or repeat its source identifier. Use generated templates for additional categories. No fixture contains real financial information.
