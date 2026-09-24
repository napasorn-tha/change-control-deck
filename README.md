# CAB Command Center

Build a functional responsive web application called:

CAB360

Intelligent Change Advisory Board & Deployment Control Tower

Use the attached CAB360 workflow diagram as the primary business-process and visual reference.

Technology:

- React

- TypeScript

- Tailwind CSS

- Supabase as the backend

- Supabase Authentication

- Supabase PostgreSQL

- Supabase Storage

- Supabase Realtime where useful

Do NOT create a fake frontend-only prototype.

Use the connected Supabase database and existing tables, views, authentication and storage.

==================================================

PRODUCT OBJECTIVE

==================================================

CAB360 digitizes the Change Advisory Board workflow for a Data Warehouse organization.

The current problem is that CAB registration, document checking, email coordination, developer follow-up, CAB review, deployment scheduling and management reporting are largely manual.

The application should provide:

1. Centralized CAB registration

2. Automatic document readiness checking

3. CAB review workflow

4. Risk assessment

5. Conditional approval and rework

6. Deployment booking and scheduling

7. Incident / root cause management

8. Complete historical audit trail

9. Real-time executive CAB Control Tower

The system covers:

- Data Ingestion

- Data Transformation

- Data Outbound

==================================================

IMPORTANT WORKFLOW LOGIC

==================================================

Implement the following workflow exactly.

Developer:

Create CAB Request

→ Upload required documents

→ Readiness Check

If documents are incomplete:

→ Developer Fix / Resubmit

→ Readiness Check again

If ready:

→ CAB Review Queue

→ Review Ingestion / Transform / Outbound

→ Risk Assessment

→ CAB Decision

There are THREE CAB outcomes.

---------------------------------

1. PASSED

---------------------------------

PASSED

→ directly to Deployment Booking

IMPORTANT:

Do NOT send PASSED requests to Verify Conditions.

---------------------------------

2. PASSED WITH CONDITIONS

---------------------------------

PASSED WITH CONDITIONS

→ Request Rework

→ Developer Fix

→ Verify Conditions

→ PASSED

→ Deployment Booking

Verify Conditions exists ONLY for this workflow.

---------------------------------

3. NOT APPROVED

---------------------------------

NOT APPROVED

→ Developer Fix / Resubmit

→ Readiness / Submission

→ return to CAB Review

Do NOT send NOT APPROVED requests to Verify Conditions.

---------------------------------

DEPLOYMENT

---------------------------------

Deployment Booking

→ Deployment Scheduler

→ Deploy

→ Deployment Result

If success:

→ Closed / Completed

If failure:

→ Incident

→ Root Cause Analysis

Then ask:

“Has Scope or Design changed?”

If NO:

→ Re-Deployment Booking

If YES:

→ Developer rework / resubmission

→ CAB review again

All status changes must be persisted to Supabase and written to the activity log.

==================================================

APPLICATION SHELL

==================================================

Create a polished enterprise application.

Use a left navigation sidebar and top application bar.

Brand:

CAB360

Subtitle:

Intelligent Change Advisory Board & Deployment Control Tower

Visual direction:

- Enterprise Data / Technology platform

- Clean

- Modern

- Professional

- Dense enough for operational users

- Not playful

- Not consumer-app style

- White / soft neutral background

- Navy blue as primary enterprise color

- Teal as positive / workflow accent

- Green for success

- Amber for conditions / warnings

- Red for failure / high risk

- Clear typography

- Rounded cards but not excessively rounded

- Subtle shadows

- Strong information hierarchy

Use the attached workflow image as a visual design reference but create a real application interface, not a copy of the diagram.

==================================================

AUTHENTICATION

==================================================

Create Login page using Supabase Auth.

After login, detect the user's role from profiles.

Roles:

Developer

CAB Reviewer

Deployment Coordinator

Executive

Admin

The sidebar and default dashboard must change according to role.

==================================================

DEVELOPER EXPERIENCE

==================================================

Developer sidebar:

Dashboard

My CAB Requests

Create CAB Request

Documents

Rework / Actions Required

Deployment Status

Activity History

Developer Dashboard should show:

- Active Requests

- Documents Missing

- Pending Review

- Passed

- Waiting for Deployment

- Completed

Also show:

“My Action Required”

with the highest-priority requests.

==================================================

CREATE CAB REQUEST

==================================================

Create a multi-section CAB request form.

Fields:

Project Code

Project / Topic

PM / BA / Lead

Developer

Change Type

CAB Date

Target Deploy Date

Target Go-Live Date

Description

Change Type:

Ingestion

Transformation

Outbound

Mixed

After creating a request, move to Document Submission.

==================================================

DOCUMENT SUBMISSION

==================================================

Create a document readiness interface.

Required Submission checklist:

1. Code Artefacts

2. MOP Document

3. Deployment Checklist

4. QA Test Results

5. Git Merge Request

For each item show:

Document type

Upload status

File

Uploaded date

Review status

Comment

Use Supabase Storage.

Show a Readiness Score.

Example:

Readiness Score 80%

4 / 5 Required Documents

Missing:

QA Test Results

Disable “Submit to CAB” until all required documentation is ready.

==================================================

CAB REVIEWER EXPERIENCE

==================================================

CAB Reviewer sidebar:

Dashboard

CAB Review Queue

Pending Conditions

High Risk Changes

Review History

Projects

Activity Log

Create CAB Review Queue as a powerful data table.

Columns:

Request ID

Project

Topic

Change Type

Developer

Submitted Date

CAB Date

Risk

Readiness

Status

Action

Add:

Search

Filters

Sorting

Status filter

Risk filter

Change-type filter

Date filter

Clicking a row opens CAB Request Detail.

==================================================

CAB REQUEST DETAIL

==================================================

Create a detailed workspace.

Header:

Request ID

Project

Current Status

Risk Badge

Developer

CAB Date

Deploy Date

Tabs:

Overview

Documents

Technical Review

Risk

Conditions

Deployment

Activity History

==================================================

TECHNICAL CAB REVIEW

==================================================

Create three review sections:

INGESTION

Examples:

- Source connectivity

- Schema readiness

- Data type compatibility

- Incremental / full load strategy

- Data volume

- Error handling

TRANSFORMATION

Examples:

- Business logic

- Data quality

- Naming standards

- Data types

- Dependency

- Lineage

OUTBOUND

Examples:

- Target interface

- Consumer dependency

- Data contract

- Validation

- Delivery schedule

- Failure handling

Allow reviewers to enter comments and findings.

==================================================

RISK SCORE

==================================================

Create a Risk Assessment card.

Show:

Overall Risk Score

Complexity

Dependency

Previous Issues

Risk level:

Low

Medium

High

Critical

Use a visual gauge or progress indicator.

Do not make risk score purely decorative.

Persist values in Supabase.

==================================================

CAB DECISION

==================================================

Create three prominent decision actions:

PASSED

PASSED WITH CONDITIONS

NOT APPROVED

Require a reviewer comment.

If Passed:

set status to PASSED

and make the request immediately available to Deployment Coordination.

If Passed With Conditions:

create one or more CAB Conditions.

If Not Approved:

return request to Developer Actions Required.

==================================================

CONDITION MANAGEMENT

==================================================

For PASSED WITH CONDITIONS create a condition workflow.

Display:

Condition

Assigned Developer

Status

Developer Response

Evidence

Verification Result

Verified By

Verified At

Developer can mark:

Ready for Verification

Reviewer can:

Verify

Reject

Only when all required conditions are VERIFIED should the request become PASSED.

Then send directly to Deployment Booking.

==================================================

DEPLOYMENT COORDINATION

==================================================

Deployment Coordinator sidebar:

Deployment Dashboard

Ready for Booking

Deployment Calendar

Scheduled Deployments

Active Deployments

Incidents

History

==================================================

DEPLOYMENT BOOKING

==================================================

Create deployment booking form.

Fields:

CAB Request

Target Environment

Deployment Date

Deployment Window Start

Deployment Window End

Coordinator

Notes

Show conflict detection.

Show warnings if another deployment conflicts with the same project or window.

==================================================

DEPLOYMENT CALENDAR

==================================================

Create Calendar view.

Support:

Month

Week

Day

Display scheduled deployments.

Click deployment to open detail panel.

Use badges for:

Scheduled

Deploying

Completed

Failed

==================================================

DEPLOYMENT EXECUTION

==================================================

Deployment Detail should show:

Project

CAB request

Scheduled window

Coordinator

Deployment attempt

Status

Timeline

Actions:

Start Deployment

Mark Successful

Mark Failed

Successful:

→ COMPLETED

Failed:

→ Create Incident automatically

==================================================

INCIDENT / ROOT CAUSE ANALYSIS

==================================================

Create Incident page.

Fields:

Incident Title

Description

Root Cause

Corrective Action

Question:

“Has Scope or Design changed?”

YES:

send request back through developer rework and CAB review.

NO:

allow Re-Deployment Booking.

Show deployment attempt history.

==================================================

EXECUTIVE CONTROL TOWER

==================================================

Executive users should land directly on:

CAB Control Tower

This should be the strongest dashboard in the application.

Top KPI cards:

Active Requests

Pending Review

Passed

Deploy Success Rate

High-Risk Changes

Seed/demo values may initially resemble:

Active Requests: 28

Pending Review: 12

Passed: 156

Deploy Success Rate: 96.5%

High Risk Changes: 8

But retrieve metrics from Supabase views rather than hard-coding them.

==================================================

CHANGE LIFECYCLE FUNNEL

==================================================

Create horizontal funnel:

Submitted

→ Reviewed

→ Passed

→ Scheduled

→ Deployed

→ Closed

Example demo counts:

Submitted 180

Reviewed 168

Passed 156

Scheduled 140

Deployed 132

Closed 128

Use real database aggregate data.

Clicking a funnel stage should filter the request list.

==================================================

ISSUE CATEGORY VISUALIZATION

==================================================

Create donut chart.

Categories:

No Finding / No Issue

Data Type Standard

Data Type Compatibility

Naming Standard

Lineage Validation

Source Connectivity

Lineage Documentation Gap

Clicking a category filters relevant CAB records.

==================================================

ADDITIONAL EXECUTIVE ANALYTICS

==================================================

Add:

CAB requests over time

Average CAB turnaround time

Average Passed → Deployment time

Requests by project

Requests by change type

Risk distribution

Deployment success trend

Projects with most CAB issues

Overdue requests

==================================================

ACTIVITY TIMELINE

==================================================

Every CAB Request should have a chronological activity timeline.

Example:

Request Created

Documents Uploaded

Readiness Check Passed

Submitted to CAB

Review Started

CAB Passed

Deployment Booked

Deployment Started

Deployment Completed

Show:

timestamp

actor

action

status transition

comment

==================================================

REAL-TIME BEHAVIOR

==================================================

Where reasonable use Supabase realtime subscriptions.

Examples:

Reviewer approves CAB

→ developer dashboard updates

CAB passes

→ appears in Deployment Ready queue

Deployment completed

→ Executive KPI and funnel update

==================================================

UX REQUIREMENTS

==================================================

The application must feel like a real operational system.

Do NOT create every screen as independent static cards.

Use:

real tables

real forms

real routing

real detail pages

working filters

working buttons

database reads

database writes

status transitions

role-based navigation

confirmation dialogs

toast notifications

loading states

empty states

error handling

Use responsive design but prioritize desktop because this is primarily an enterprise operational system.

==================================================

DEMO DATA

==================================================

Use the data already seeded in Supabase.

Create a useful demo experience with examples of:

Passed

Passed With Conditions

Not Approved

Pending Review

High Risk

Scheduled Deployment

Failed Deployment

Completed

==================================================

IMPORTANT FINAL RULE

==================================================

Workflow correctness is more important than decorative UI.

In particular:

PASSED

→ Deployment Booking

PASSED WITH CONDITIONS

→ Developer Rework

→ Verify Conditions

→ Passed

→ Deployment Booking

NOT APPROVED

→ Developer Fix / Resubmit

→ CAB Review again

Do not merge these three flows.

Build the application incrementally but keep the database integration functional from the beginning.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://change-control-deck.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bff1529f-6881-450a-bcec-ce87e7d4d44c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
