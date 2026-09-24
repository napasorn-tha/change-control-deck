# Remark Schema Template

Do not lock final categories until the real CAB taxonomy is supplied.

## Why two stages matter

CAB360 should distinguish:

- **CAB Review Remark** — a pre-deployment finding / early-warning signal
- **Deployment Remark** — an observed deployment outcome / realised issue

That separation enables future analysis of whether pre-CAB warnings predict actual deployment problems.

## Proposed neutral schema

| Field | Purpose |
| --- | --- |
| id | Record identifier |
| request_id | CAB request |
| deployment_id | Nullable deployment attempt |
| stage | CAB_REVIEW or DEPLOYMENT |
| category | Nullable until taxonomy is final |
| subcategory | Nullable |
| severity | Optional Low / Medium / High / Critical or business taxonomy |
| remark_text | Original human remark |
| source | Reviewer / Coordinator / Incident / Imported history |
| created_by | Actor |
| created_at | Timestamp |
| resolved | Optional state |
| resolution_text | Optional follow-up |
| taxonomy_version | Version of classification used |

## Future analytical mapping

Potential feature side:

- document signals
- change type
- complexity
- dependency
- CAB Review Remarks
- repeated historical categories

Potential outcome side:

- Deployment Remark
- deployment failed / succeeded
- incident created
- root cause
- redeployment required
- scope/design changed

A future risk model can therefore estimate something like:

```text
P(Deployment issue |
  document signals,
  change characteristics,
  CAB review remarks,
  historical patterns)
```

## When the real taxonomy arrives

Map the supplied categories into this template first, then decide whether:

- category/subcategory should be enums or reference tables
- severity is supplied or derived
- one CAB can have multiple remarks
- deployment remarks attach to request, deployment attempt, or both
- historical categories need aliases / migration mapping

Do not replace historical free text; preserve it alongside any classification.
