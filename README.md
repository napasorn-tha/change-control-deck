# CAB360

**Intelligent Change Advisory Board & Deployment Control Tower**

CAB360 is a working proof-of-concept for digitising a Data Warehouse Change Advisory Board (CAB) workflow. It centralises CAB registration, evidence readiness, review, risk assessment, deployment coordination, incidents/RCA, and management visibility.

Live prototype: https://change-control-deck.lovable.app

## Current scope

This repository is a course prototype / proof-of-concept intended for a small internal team and future handoff. It is not yet a production security baseline.

Implemented today:

- Supabase authentication and role-based UI
- Developer / CAB Reviewer / Deployment Coordinator / Executive / Admin views
- Admin-only role assignment and demo role switching
- CAB request registration
- Project directory and project registration
- Five required evidence slots
- QA readiness gate
- CAB review and reviewer risk assessment
- Passed / Passed with Conditions / Not Approved workflow separation
- Deployment booking, calendar, execution, failure and RCA
- Activity history / audit trail
- Executive Control Tower
- AI Pre-CAB Analysis data model and UI placeholder
- Safe reuse of closed requests by duplicating them into a new Draft

## Source-of-truth CAB readiness

A request can enter CAB only when all five required evidences are present:

1. Code artefacts
2. MOP document
3. Deployment checklist
4. QA test results
5. Git merge request evidence

and the QA gate is complete:

- QA Source: DQA / End User / Other
- QA Test Status: Passed
- QA Approval Status: Approved or Not Required

Document completeness and CAB readiness are intentionally separate concepts.

## Workflow

```text
Create CAB Request
  -> Upload 5 evidences
  -> QA Gate
  -> CAB Ready
  -> CAB Review
       |-> Passed -------------------------> Deployment Booking
       |-> Passed with Conditions -> Rework -> Verify Conditions -> Passed
       |-> Not Approved ----------> Fix / Resubmit -> CAB Review
  -> Deployment
       |-> Success -> Deployed -> Closed
       |-> Failure -> Incident / RCA
             |-> Scope unchanged -> Re-book deployment
             |-> Scope changed   -> Rework / re-CAB
```

Closed records are preserved for audit history. Reuse is done with **Duplicate as new CAB**, which creates a fresh Draft rather than reopening a closed record.

## Roles

- **Developer** — create requests, upload evidence, complete QA readiness inputs, respond to rework/conditions, track deployment.
- **CAB Reviewer** — review evidence, perform technical review, save risk assessment, and record the CAB decision.
- **Deployment Coordinator** — book windows, manage deployment execution, and complete incident/RCA flow.
- **Executive** — read-only Control Tower, requests, deployments, incidents, projects and activity drill-down.
- **Admin** — manage roles and use demo role switching.

New accounts start as Developer; an Admin assigns operational roles.

## Tech stack

- React 19
- TypeScript
- TanStack Router / TanStack Start
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- React Query
- Recharts
- Lovable hosting / project integration

## AI direction

CAB360 follows this design principle:

> Deterministic rules establish whether a CAB request is eligible for review; AI analyses the meaning and consistency of submitted evidence; historical CAB and deployment outcomes provide risk context; and the human CAB reviewer remains the final decision authority.

The planned AI pipeline is:

```text
Documents
  -> Extract / Parse / Normalise
  -> Structured text / JSON
  -> LLM analysis
       - Executive summary
       - Missing information
       - Cross-document inconsistencies
       - Risk signals
       - Revision comparison
  -> ai_analyses
  -> CAB reviewer decision support
```

The proposed reasoning provider for V1 is Groq with `gpt-oss-120b`. Groq is the reasoning layer, not the raw file-ingestion layer.

The strongest planned demo is cross-document consistency detection. Synthetic evidence in `demo/evidence/customer-outbound/` intentionally contains mismatches for this purpose.

## Remark / historical risk layer

The final business taxonomy for **CAB Review Remarks** and **Deployment Remarks** is intentionally not hard-coded yet. It will be added once the real classification is supplied.

The intended learning loop is:

```text
Pre-CAB evidence
  -> AI risk signals
  -> Reviewer final risk
  -> CAB decision
  -> Deployment outcome
  -> Deployment remark / incident
  -> Historical risk knowledge
```

See `docs/REMARK_SCHEMA_TEMPLATE.md`.

## UAT

Core happy-path functional testing has been completed through:

```text
Create
-> Evidence
-> QA Gate
-> CAB Review
-> Risk
-> Passed
-> Deployment Booking
-> Deploy
-> Close
```

Deployment failure / incident actions are also operational.

See `docs/UAT.md` for the test matrix and remaining branch tests.

## Local development

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Prototype limitations / production handoff

Before broader enterprise use, the implementation should be hardened with:

- enterprise SSO
- stricter Supabase RLS and backend write authorization
- formal access governance
- production secrets management
- file malware/content validation
- approved external-AI data handling policy
- observability and production audit requirements
- Realtime subscriptions where operationally useful

For prototype AI testing, use synthetic or anonymised documents unless external processing of real company information has been explicitly approved.
