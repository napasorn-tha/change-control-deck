# Deployment Intelligence — CAB360 prototype

## Why this layer exists

CAB review findings and deployment issues are different business entities. A deployment can be marked Success and still contain script, schema, Git, documentation or validation issues that were fixed during the window. Those findings should not be forced into Incident/RCA, and they should not be counted as CAB rejection events.

The closed loop is:

`CAB → Deployment Outcome → DEP Issue → Root Cause → Resolution → Post-deploy SR → Closure → Historical Learning → Pre-CAB Review`

## Taxonomy namespaces

Never store a bare category letter without its domain.

**CAB taxonomy:** CAB-A … CAB-P (historical review remarks).

**Deployment taxonomy:** DEP-A … DEP-G:
- DEP-A Script / Code Error
- DEP-B Schema / Data Type
- DEP-C Framework Config / Metadata
- DEP-D Git / Version Control
- DEP-E Documentation / MOP
- DEP-F Data Validation
- DEP-G Environment / Access

Deployment taxonomy version: `dep-v1-2026-10-07`.

## Operational model

`deployments.outcome` is business outcome and is deliberately separate from workflow `deployments.status`.

Outcomes: SUCCESS, PARTIAL_SUCCESS, FAILED, ROLLBACK, POSTPONED.

`deployment_issues` contains issue-level records, each linked to the CAB request and exact deployment attempt. Resolution state is open / follow_up / resolved. Success does not imply zero issues.

`service_requests` links Patch Data, Update Config, Reprocess/Rerun and other post-deploy follow-up to the original CAB/deployment. The prototype stores an optional external SR reference; it does not pretend to be ServiceNow.

## Standards knowledge

Data-type conventions are deterministic reference rules, not AI opinions. The Standards Knowledge page exposes a quick rule lookup based on the CAB owner's Data Type Quick Reference. It intentionally returns "human review" when no rule matches.

Important examples:
- TM_KEY_DAY → INT
- FLAG Y/N → Blendata STRING, Vertica VARCHAR(1)
- RATIO / PERCENTAGE → DECIMAL(20,8)
- DATE without time → DATE
- DATE + TIME → TIMESTAMP
- LATITUDE / LONGITUDE → DECIMAL(10,7)
- numeric ID/KEY → INT or BIGINT, with BIGINT when the identifier can reach 10+ digits
- legacy character IDs remain character types

Future DDL parsing can feed this same deterministic rule layer. The LLM can explain a mismatch but must not redefine the standard.

## AI feedback loop

The request detail shows local Historical Deployment Signal counts by DEP category. These are advisory frequencies, not failure probabilities.

The consent-gated AI endpoint may receive:
1. current request evidence text,
2. aggregate CAB category frequencies,
3. aggregate DEP category frequencies,
4. deterministic standards examples.

It does not receive historical raw remarks or resolutions as context. It cannot approve/reject CAB.

## Data-source mapping from owner-provided examples

The deployment issue report demonstrated:
- one CR can have several issue/resolution pairs,
- a Success deployment may still have issues,
- Partial Success and Rollback need separate business outcomes,
- open resolution/audit follow-up must remain visible,
- repeated patterns include code/script defects, schema/data-type mismatch, framework metadata, Git/version drift, MOP/document gaps, validation gaps and environment/access issues.

The post-deploy SR examples demonstrated fields such as request type, priority, project/environment, objective, target objects and execution steps. CAB360 models these fields without hard-coding or importing those example records.

## Prototype scope / non-goals

- No real owner-provided deployment report rows are embedded in Git.
- No historical deployment data is automatically imported.
- No automatic Incident creation for every DEP issue.
- No external ticketing integration.
- No AI-generated standards.
- No CAB decision automation.
