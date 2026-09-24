# Complete role-based CAB360 dashboard

## What will be built
- Replace the placeholder dashboard with four operational views selected from the signed-in user's role:
  - Developer: personal request totals, missing documents, pending review, passed, deployment queue, completed work, and prioritized actions.
  - CAB Reviewer: review queue, pending conditions, high-risk changes, recent review work, and priority requests.
  - Deployment Coordinator: ready-to-book, scheduled, active, completed, failed, and upcoming deployment work.
  - Executive/Admin: full Control Tower with live KPI cards, lifecycle funnel, issue category chart, and recent high-risk requests.
- Make each metric and list link into the existing request workflow with the relevant filter where possible.
- Keep the existing dense enterprise styling, semantic status/risk colors, loading, empty, and error states.
- Point the Executive/Admin sidebar dashboard entry to the completed dashboard so it does not reference an unfinished page.

## Data and behavior
- Read CAB requests, conditions, documents, and deployments through the existing authenticated data hooks.
- Read executive KPI, funnel, and issue-category aggregates from the existing database views.
- Scope developer metrics to the signed-in developer; other roles receive the operational data appropriate to their work.
- Derive action priority from workflow status, risk, readiness, and target dates without changing backend workflow rules.

## Validation
- Confirm the app builds without route or type errors.
- Open the signed-in dashboard and verify the appropriate role view renders from live database data.
- Check desktop and narrow-screen layouts for clipping, overflow, and readable tables/charts.
