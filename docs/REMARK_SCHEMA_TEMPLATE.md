# CAB360 Historical Remark Schema — Owner-confirmed methodology

The historical A–P taxonomy was supplied and owner-confirmed on 2026-09-26. It replaces the former category placeholder. No real company source rows are bundled with the application.

## Distinct business entities

Operational CAB360 uses live CAB requests, decisions, conditions, deployment attempts and incidents. Historical CAB Intelligence uses versioned imported snapshots (hist_*). Never merge historical records into live operational KPIs.

A CAB review decision, a deployment outcome and an individual remark/issue are separate. An approved CAB with a failed deployment is not a CAB rejection. The operational workflow remains Passed → Deployment Booking; Passed with Conditions → Verify Conditions → Passed → Booking; Not Approved → Fix/Resubmit → Review.

## Storage and security

- hist_datasets: SHA-256 deduplication, source filename, analysis date, taxonomy version, expected/computed counts, validation status and published flag. Publishing requires validation passed.
- hist_issues: one issue per row; source row, CR, immutable original remark, categorized summary, one primary and optional secondary category, source date and provenance, confidence and reject type.
- hist_cab_rounds: one actual review session per row with round number, date, session, decision, source/confidence and Special CAB marker.
- hist_deployment_outcomes: separate deployment attempts and outcomes (success/partial/failed/rollback etc.).
- hist_dq_flags: F1–F4 and owner confirmation state.
- hist_overrides: before/after value, reason, confirmer, timestamp; do not rewrite immutable source text.
- hist_taxonomy: stable code, label, grouping and version.

Database RLS allows admin imports/edits; actual CAB reviewers, coordinators, executives and admins may read permitted published history. Developers and anonymous visitors cannot read it. UI demo role switching must not confer privileges. Never embed internal raw company data in a public app bundle.

## Taxonomy v1-2026-09-26

One primary category per issue; optional secondary.

| Group | Code | Meaning |
| --- | --- | --- |
| Data Quality | A | Data type |
| Data Quality | B | Naming |
| Data Quality | C | Data design/Logic |
| Data Quality | D | Standard/Structure |
| Data Quality | E | Impact/Users/Migration |
| Data Quality | F | QA/Testing |
| Data Quality | G | Schedule/Dependency/Alert |
| CAB Process | H | Documentation |
| CAB Process | I | Rejected – no reason |
| Other | J | Cancelled/Duplicate |
| Deployment | K | Deploy issue/Defect/Config |
| CAB Process | L | Special approval |
| Deployment | M | Initial data/Cut over |
| Deployment | N | Postponed |
| Deployment | O | Deploy plan/time |
| Other | P | Other |

Use an actual known rejection cause (such as A or B) rather than I. O can mean administrative deployment-time/status notes, not a defect.

## Reading rounds and preserving provenance

Find the true header containing CR No.; count CR-only placeholder rows but exclude them from issue analysis. Split dated #1/#2 items, and split clearly independent subissues from one remark. Date after #n normally records the CAB review date, but untagged leading dates and tentative deploy dates are often event/deployment dates. Do not infer a CAB meeting from every date or from a weekday pattern. Owner-confirmed Special CAB is a real round.

A morning rejection and same-date afternoon/out-of-session approval are two review rounds but one rejected event under unique (CR No., CAB Date). If the approval round is missing in the original Remark, document its source as owner-confirmed. Conditional comments on an approved round are NOT rejection. Deployment failures and Implementation Status do not determine past CAB outcomes.

Explicit means the original remark literally says reject/not approved/ไม่ผ่าน/ไม่อนุมัติ. A Pending-only remark later confirmed rejected by the owner is Implied with High confidence: confirmation never changes what the original text literally said. Preserve original text and timestamped owner overrides, while routing unclear or contradictory cases to confirmation instead of guessing.

Flags: F1 latest tagged CAB date differs from CAB Date; F2 Open despite elapsed deploy date; F3 tentative deploy remark despite Success; F4 rejected without reason. F2 is a recording inconsistency, not a command to auto-close CR.

## Counting contract and audit

Count total rows from 1_Issue_Level. The number of distinct CRs is a different measure. A–G is Data Quality. Stack monthly A, B, C, E and D/F/G-other by source CAB month; include intervening months with zero. Dated A–G plus undated A–G must equal total A–G.

Rejected ISSUE rows can exceed rejection EVENTS because a single CAB session can list multiple causes. Events are distinct (CR, CAB date); preserve Explicit/Implied event breakdown. Undated rejected rounds must block validated publication until their date is confirmed. Multi-round counts review sessions, not unique rejected dates.

Use 2_Category_Summary, 3_Reject_Count and 4_Multi_Round to reconcile the issue-level source; do not import those derived checks as additional raw issue records. Require category sum = issue count, unique reject-event total = reject-sheet total, monthly dated+undated A–G = A–G, and valid multi-round totals. If any differ, stop publication and expose differences. Show snapshot date, latest potentially incomplete month, missing dates, category O as admin notes, and the possibility that changes in review-detail intensity alter trends.

Workbook contract: README; 1_Issue_Level; 2_Category_Summary; 3_Reject_Count; 4_Multi_Round; 5_DQ_Flags; 6_To_Confirm. Implement permission approval, parser, deterministic cross-sheet validation and atomic rollback before enabling actual import. Until then the admin import entry is explicitly disabled.

## AI boundary

AI may propose classification, evidence-based risk signals, missing information and cross-document differences. Deterministic code owns facts, arithmetic, authorization, readiness and state transitions. AI must not silently rewrite owner-confirmed labels or automatically approve CAB. Final CAB decision belongs to the human reviewer.
