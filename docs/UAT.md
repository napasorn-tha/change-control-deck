# CAB360 Functional UAT

## Confirmed working

| ID | Flow | Expected result | Status |
| --- | --- | --- | --- |
| TC01 | Add project | Project appears in CAB registration dropdown | Passed |
| TC02 | Create CAB request | New request created as Draft | Passed |
| TC03 | Fewer than 5 evidences | CAB submission blocked | Passed |
| TC04 | Five evidences uploaded | Document completeness reaches 100% | Passed |
| TC05 | QA Pending | CAB submission blocked | Passed |
| TC06 | QA Failed | CAB submission blocked | Passed |
| TC07 | QA Passed + approval pending | CAB submission blocked | Passed |
| TC08 | QA Passed + approval approved | CAB readiness satisfied | Passed |
| TC09 | QA Passed + approval not required | CAB readiness satisfied | Passed |
| TC10 | Submit to CAB | Status becomes Ready for CAB | Passed |
| TC11 | Start CAB review | Status becomes In Review | Passed |
| TC12 | Save technical review | Findings/checklist persist | Passed |
| TC13 | Save reviewer risk | Risk score and level persist | Passed |
| TC14 | CAB decision = Passed | Goes directly to Passed / deployment booking | Passed |
| TC18 | Book deployment | Deployment record and window created | Passed |
| TC19 | Successful deployment | Deploying -> Deployed -> Closed | Passed |
| TC20A | Mark deployment failed | Failure action and incident path available | Passed |
| TC21 | Activity history | Major workflow actions recorded | Passed |
| TC22 | Coordinator dashboard filters | Ready / Scheduled / Active / Failed navigation works | Passed |
| TC23 | Closed request reuse | Duplicate as new CAB creates a new Draft | Implemented |
| TC24 | Role switching for demo | Admin can View as another role without mutating real Admin role | Implemented |
| TC25 | Executive write restriction | Executive view is read-only for CAB creation/project mutation | Implemented |

## Remaining branch tests

These should be tested with separate synthetic requests to keep audit history clean.

### Passed with Conditions

```text
In Review
-> Passed with Conditions
-> Developer response / evidence
-> Conditions Verification
-> Reviewer Verify
-> Passed
-> Deployment Booking
```

Checks:

- at least one condition is required
- developer can respond only during the rework stage
- reviewer can verify/reject only during verification
- all required conditions must be verified before Passed
- rejected condition returns to developer rework

### Not Approved

```text
In Review
-> Not Approved
-> Developer fix
-> Resubmit
-> Ready for CAB
-> CAB Review again
```

Checks:

- Not Approved never enters Verify Conditions
- uploaded evidence can be replaced
- document review status resets on resubmission
- new CAB decision is appended to history rather than overwriting the prior decision

## AI tests — not yet counted as functional pass

The AI Pre-CAB panel and `ai_analyses` schema exist, but provider/document-processing integration is not yet live.

When integration is enabled, use the synthetic case in `demo/evidence/customer-outbound/`.

Expected hero finding:

> MOP and Deployment Checklist reference `customer_v2`, while QA Test Results reference `customer`.

A second expected finding is that the checklist claims rollback readiness while the MOP intentionally lacks a complete rollback procedure.
