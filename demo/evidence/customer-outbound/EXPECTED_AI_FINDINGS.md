# Expected AI Findings

This file is for testers and should not be included in the evidence package sent to the model.

## Inconsistency 1 — target mismatch

- Code Artefacts: customer_v2
- MOP: customer_v2
- Deployment Checklist: customer_v2
- QA Test Results: customer

Expected: flag a cross-document target-table inconsistency.

## Inconsistency 2 — rollback evidence

- Deployment Checklist: "Rollback procedure complete = Yes"
- MOP: only names a rollback owner; detailed rollback procedure is omitted

Expected: flag that the checklist claims rollback readiness but the supporting MOP does not contain a complete rollback procedure.

## Expected risk interpretation

At minimum, the model should describe these as decision-support signals and should not declare the CAB request approved or rejected.
