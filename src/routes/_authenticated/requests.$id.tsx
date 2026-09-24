import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, FileUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useActorName } from "@/hooks/useAuth";
import {
  openStoredFile,
  uploadFile,
  useActivity,
  useInvalidateAll,
  useRequestBundle,
  type CabDocument,
  type CabRequest,
  type Condition,
  type Deployment,
  type Incident,
  type Risk,
  type AIAnalysis,
  type TechReview,
} from "@/lib/data";
import {
  CHANGE_TYPES,
  DOC_TYPES,
  ENVIRONMENTS,
  ISSUE_CATEGORIES,
  REVIEW_SECTIONS,
  QA_SOURCES,
  QA_TEST_STATUSES,
  QA_APPROVAL_STATUSES,
  isQaGatePassed,
  computeRiskScore,
  fmtDate,
  fmtDateTime,
  logActivity,
  nextRequestCode,
  riskLevelFromScore,
  sectionsForChangeType,
  statusLabel,
  type CabStatus,
  type ReviewSection,
} from "@/lib/cab";
import { can, transition, type Actor } from "@/lib/workflow";
import { Card, ErrorState, Field, Loading, PageHeader, Pill, ProgressBar, RiskPill, StatusPill } from "@/components/cab/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/requests/$id")({
  head: () => ({
    meta: [
      { title: "CAB Request — CAB360" },
      { name: "description", content: "CAB request detail, review, decision and deployment." },
      { property: "og:title", content: "CAB Request — CAB360" },
      { property: "og:description", content: "CAB request detail, review, decision and deployment." },
    ],
  }),
  component: RequestDetail,
});

const STEPS: { label: string; statuses: CabStatus[] }[] = [
  { label: "Registration", statuses: ["DRAFT", "DOCUMENTS_PENDING"] },
  { label: "CAB Review", statuses: ["READY_FOR_CAB", "IN_REVIEW", "NOT_APPROVED"] },
  { label: "Conditions", statuses: ["PASSED_WITH_CONDITIONS", "CONDITIONS_VERIFICATION"] },
  { label: "Passed", statuses: ["PASSED"] },
  { label: "Deployment", statuses: ["DEPLOYMENT_BOOKED", "DEPLOYING", "DEPLOY_FAILED", "INCIDENT"] },
  { label: "Closed", statuses: ["DEPLOYED", "CLOSED"] },
];

function useActor(): Actor {
  const { user, role } = useAuth();
  const name = useActorName();
  return { id: user?.id ?? null, name, role };
}

function RequestDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useRequestBundle(id);
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!data?.request) return <ErrorState error={new Error("Request not found")} />;
  const r = data.request;
  const stepIdx = STEPS.findIndex((s) => s.statuses.includes(r.status as CabStatus));

  return (
    <div className="space-y-5">
      <Link to="/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All requests
      </Link>
      <PageHeader
        title={`${r.request_code} · ${r.topic}`}
        subtitle={`${r.project_code} — ${r.project_name}`}
        actions={<><StatusPill status={r.status} /><RiskPill level={r.risk_level} score={r.risk_score} /></>}
      />
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "rounded-md border px-3 py-2 text-xs font-medium",
              i < stepIdx && "border-success/30 bg-success/10 text-success",
              i === stepIdx && "border-primary bg-primary/10 text-primary",
              i > stepIdx && "border-border text-muted-foreground",
            )}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <NextAction request={r} documents={data.documents} conditions={data.conditions} risk={data.risk} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Overview" className="lg:col-span-1">
          <div className="grid gap-3">
            <Field label="Change type">{CHANGE_TYPES.find((c) => c.value === r.change_type)?.label}</Field>
            <Field label="Developer">{r.developer_name ?? "—"}</Field>
            <Field label="PM / BA lead">{r.pm_ba_lead ?? "—"}</Field>
            <Field label="CAB date">{fmtDate(r.cab_date)}</Field>
            <Field label="Target deploy">{fmtDate(r.target_deploy_date)}</Field>
            <Field label="Target go-live">{fmtDate(r.target_golive_date)}</Field>
            <Field label="Issue category">{r.issue_category ?? "—"}</Field>
            {r.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>}
          </div>
        </Card>
        <div className="lg:col-span-2 space-y-5">
            <QAGateCard request={r} />
            <DocumentsCard request={r} documents={data.documents} />
            <AIPreCabAnalysisCard request={r} documents={data.documents} analysis={data.aiAnalysis} />
          {(["IN_REVIEW"].includes(r.status) || data.reviews.length > 0) && (
            <TechnicalReviewCard request={r} reviews={data.reviews} />
          )}
          {(r.status === "IN_REVIEW" || data.risk) && <RiskCard request={r} risk={data.risk} />}
          {r.status === "IN_REVIEW" && <DecisionCard request={r} risk={data.risk} />}
          {(data.conditions.length > 0) && <ConditionsCard request={r} conditions={data.conditions} />}
          {data.decisions.length > 0 && (
            <Card title="CAB decisions">
              <ul className="space-y-3">
                {data.decisions.map((d) => (
                  <li key={d.id} className="text-sm">
                    <Pill tone={d.decision === "passed" ? "success" : d.decision === "not_approved" ? "danger" : "warning"}>
                      {d.decision === "passed" ? "Passed" : d.decision === "not_approved" ? "Not approved" : "Passed with conditions"}
                    </Pill>
                    <span className="ml-2 text-xs text-muted-foreground">{d.decided_by_name} · {fmtDateTime(d.decided_at)}</span>
                    <p className="mt-1">{d.comment}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(r.status === "PASSED" || data.deployments.length > 0) && (
            <DeploymentCard request={r} deployments={data.deployments} />
          )}
          {data.incidents.length > 0 && <IncidentCard request={r} incidents={data.incidents} />}
          <ActivityCard id={r.id} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Next action banner ---------------- */

function NextAction({ request: r, documents, conditions, risk }: { request: CabRequest; documents: CabDocument[]; conditions: Condition[]; risk: Risk | null }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const uploaded = documents.filter((d) => d.file_path).length;
  const allDocs = uploaded >= DOC_TYPES.length;
  const qaReady = isQaGatePassed(r);
  const cabReady = allDocs && qaReady;
  const required = conditions.filter((c) => c.required);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(false); }
  }

  async function duplicateAsNewCab() {
    const { data: existing, error: codeError } = await supabase
      .from("cab_requests")
      .select("request_code");
    if (codeError) throw codeError;

    const code = nextRequestCode((existing ?? []).map((item) => item.request_code));
    const { data: copy, error } = await supabase
      .from("cab_requests")
      .insert({
        request_code: code,
        project_id: r.project_id,
        project_code: r.project_code,
        project_name: r.project_name,
        topic: `${r.topic} (copy)`,
        pm_ba_lead: r.pm_ba_lead,
        change_type: r.change_type,
        description: r.description,
        developer_id: r.developer_id ?? actor.id,
        developer_name: r.developer_name ?? actor.name,
        status: "DRAFT",
        readiness_score: 0,
        cab_date: null,
        target_deploy_date: null,
        target_golive_date: null,
        risk_level: null,
        risk_score: null,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: docsError } = await supabase
      .from("cab_documents")
      .insert(
        DOC_TYPES.map((doc) => ({
          request_id: copy.id,
          doc_type: doc.value,
          review_status: "missing",
        })),
      );
    if (docsError) throw docsError;

    await logActivity({
      request_id: copy.id,
      actor_id: actor.id,
      actor_name: actor.name,
      action: "Request duplicated",
      comment: `Created from closed request ${r.request_code}`,
      to_status: "DRAFT",
    });

    toast.success(`${code} created from ${r.request_code}`);
    void navigate({ to: "/requests/$id", params: { id: copy.id } });
  }

  let text = "";
  let buttons: React.ReactNode = null;
  const st = r.status as CabStatus;

  if (st === "DRAFT" || st === "DOCUMENTS_PENDING" || st === "NOT_APPROVED") {
  if (!allDocs) {
  text = `Upload all required documents (${uploaded}/${DOC_TYPES.length}) before submitting.`;
} else if (!r.qa_source) {
  text = "All documents uploaded. Complete the QA Gate before submitting to CAB.";
} else if (r.qa_test_status !== "PASSED") {
  text = `CAB blocked — QA test status is ${r.qa_test_status.toLowerCase()}.`;
} else if (
  r.qa_approval_status !== "APPROVED" &&
  r.qa_approval_status !== "NOT_REQUIRED"
) {
  text = "CAB blocked — QA approval is not yet satisfied.";
} else {
  text =
    st === "NOT_APPROVED"
      ? "Requirements complete. Update the findings and resubmit for CAB review."
      : "All evidences and QA requirements complete. Ready to submit to CAB.";
}
    if (can(actor.role, "developer"))
      buttons = (
        <Button disabled={busy || !cabReady} onClick={() => run(async () => {
          // Reset document reviews on resubmission so CAB reviews again.
          if (st === "NOT_APPROVED") await supabase.from("cab_documents").update({ review_status: "pending" }).eq("request_id", r.id).not("file_path", "is", null);
          await transition(r.id, st, "READY_FOR_CAB", actor, st === "NOT_APPROVED" ? "Resubmitted to CAB after fix" : "Submitted to CAB", null, { submitted_at: new Date().toISOString(), readiness_score: 100 });
          toast.success("Submitted to CAB review queue");
        })}>{st === "NOT_APPROVED" ? "Resubmit to CAB" : "Submit to CAB"}</Button>
      );
  } else if (st === "READY_FOR_CAB") {
    text = "Waiting for a CAB reviewer to start the review.";
    if (can(actor.role, "cab_reviewer"))
      buttons = <Button disabled={busy} onClick={() => run(() => transition(r.id, st, "IN_REVIEW", actor, "CAB review started"))}>Start review</Button>;
  } else if (st === "IN_REVIEW") {
    text = risk ? "Complete the technical review and record the CAB decision below." : "Complete document review, technical checklist and risk assessment, then decide.";
  } else if (st === "PASSED_WITH_CONDITIONS") {
    const ready = required.every((c) => c.status === "ready_for_verification" || c.status === "verified");
    text = ready ? "All conditions answered. Send for CAB verification." : "Developer rework: respond to every condition with evidence.";
    if (can(actor.role, "developer"))
      buttons = <Button disabled={busy || !ready} onClick={() => run(() => transition(r.id, st, "CONDITIONS_VERIFICATION", actor, "Conditions submitted for verification"))}>Submit for verification</Button>;
  } else if (st === "CONDITIONS_VERIFICATION") {
    text = "CAB reviewer: verify or reject each condition below.";
  } else if (st === "PASSED") {
    text = "Approved. Deployment coordinator can now book a deployment window.";
  } else if (st === "DEPLOYMENT_BOOKED" || st === "DEPLOYING") {
    text = "Deployment in progress — manage it in the Deployment section.";
  } else if (st === "DEPLOYED") {
    text = "Deployment succeeded. Close the change once post-deployment checks are done.";
    if (can(actor.role, "deployment_coordinator"))
      buttons = <Button disabled={busy} onClick={() => run(() => transition(r.id, st, "CLOSED", actor, "Change closed", null, { closed_at: new Date().toISOString() }))}>Close change</Button>;
  } else if (st === "DEPLOY_FAILED" || st === "INCIDENT") {
    text = "Deployment failed. Complete the incident RCA below.";
  } else if (st === "CLOSED") {
    text = "This change is closed and preserved for audit history.";
    const canDuplicate =
      can(actor.role, "developer") &&
      (actor.role === "admin" ||
        (actor.id != null && actor.id === r.developer_id));

    if (canDuplicate) {
      buttons = (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => run(duplicateAsNewCab)}
        >
          Duplicate as new CAB
        </Button>
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-5 py-3">
      <p className="text-sm"><span className="font-semibold">Next step · </span>{text}</p>
      {buttons}
    </div>
  );
}

function QAGateCard({ request: r }: { request: CabRequest }) {
  const actor = useActor();
  const refresh = useInvalidateAll();

  const editable =
    ["DRAFT", "DOCUMENTS_PENDING", "NOT_APPROVED"].includes(r.status) &&
    can(actor.role, "developer");

  const [source, setSource] = useState(r.qa_source ?? "");
  const [testStatus, setTestStatus] = useState(
    r.qa_test_status ?? "PENDING",
  );
  const [approvalStatus, setApprovalStatus] = useState(
    r.qa_approval_status ?? "PENDING",
  );

  const passed =
    !!source &&
    testStatus === "PASSED" &&
    (approvalStatus === "APPROVED" ||
      approvalStatus === "NOT_REQUIRED");

  async function save() {
    if (!source) return toast.error("Select a QA source");

    const { error } = await supabase
      .from("cab_requests")
      .update({
        qa_source: source,
        qa_test_status: testStatus,
        qa_approval_status: approvalStatus,
      })
      .eq("id", r.id);

    if (error) return toast.error(error.message);

    await logActivity({
      request_id: r.id,
      actor_id: actor.id,
      actor_name: actor.name,
      action: "QA gate updated",
      comment: `${source} · ${testStatus} · ${approvalStatus}`,
    });

    toast.success("QA gate updated");
    await refresh();
  }

  return (
    <Card
      title="CAB Readiness"
      description="CAB readiness requires all 5 evidences plus a completed QA gate."
      actions={
        <Pill tone={passed ? "success" : "warning"}>
          {passed ? "QA Ready" : "QA Blocking CAB"}
        </Pill>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">QA Source</Label>
          <select
            disabled={!editable}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">Select source…</option>
            {QA_SOURCES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs">QA Test Status</Label>
          <select
            disabled={!editable}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={testStatus}
            onChange={(e) => setTestStatus(e.target.value)}
          >
            {QA_TEST_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="text-xs">QA Approval Status</Label>
          <select
            disabled={!editable}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={approvalStatus}
            onChange={(e) => setApprovalStatus(e.target.value)}
          >
            {QA_APPROVAL_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {editable && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={save}>
            Save QA Gate
          </Button>
        </div>
      )}

      {!passed && (
        <p className="mt-3 text-xs text-muted-foreground">
          CAB submission remains blocked until QA has passed and the required
          approval is satisfied.
        </p>
      )}
    </Card>
  );
}

/* ---------------- Documents ---------------- */

function DocumentsCard({ request: r, documents }: { request: CabRequest; documents: CabDocument[] }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const editable = ["DRAFT", "DOCUMENTS_PENDING", "NOT_APPROVED"].includes(r.status) && can(actor.role, "developer");
  const reviewable = r.status === "IN_REVIEW" && can(actor.role, "cab_reviewer");
  const uploaded = documents.filter((d) => d.file_path).length;
  const pct = Math.round((uploaded / DOC_TYPES.length) * 100);

  async function upload(docType: string, file: File) {
    try {
      const path = `${r.id}/${docType}/${Date.now()}-${file.name}`;
      await uploadFile(path, file);
      const { error } = await supabase.from("cab_documents").upsert(
        { request_id: r.id, doc_type: docType, file_path: path, file_name: file.name, uploaded_at: new Date().toISOString(), uploaded_by: actor.id, review_status: "pending" },
        { onConflict: "request_id,doc_type" },
      );
      if (error) throw error;
      const count = documents.filter((d) => d.file_path && d.doc_type !== docType).length + 1;
      const score = Math.round((count / DOC_TYPES.length) * 100);
      const update: { readiness_score: number; status?: string } = { readiness_score: score };
      if (r.status === "DRAFT") update.status = "DOCUMENTS_PENDING";
      await supabase.from("cab_requests").update(update).eq("id", r.id);
      await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: `Uploaded ${DOC_TYPES.find((d) => d.value === docType)?.label}`, comment: file.name });
      toast.success("Document uploaded");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function review(doc: CabDocument, status: "approved" | "rejected") {
    const { error } = await supabase.from("cab_documents").update({ review_status: status }).eq("id", doc.id);
    if (error) return toast.error(error.message);
    await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: `Document ${status}: ${DOC_TYPES.find((d) => d.value === doc.doc_type)?.label}` });
    await refresh();
  }

  return (
    <Card title="Required documents" description={`Document completeness ${pct}% · ${uploaded}/${DOC_TYPES.length} uploaded`}>
      <div className="mb-4"><ProgressBar value={pct} tone={pct >= 100 ? "success" : "warning"} /></div>
      <ul className="divide-y divide-border">
        {DOC_TYPES.map((dt) => {
          const d = documents.find((x) => x.doc_type === dt.value);
          return (
            <li key={dt.value} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{dt.label}</p>
                {d?.file_path ? (
                  <button className="text-xs text-primary hover:underline" onClick={() => openStoredFile(d.file_path!).catch((e: Error) => toast.error(e.message))}>
                    {d.file_name}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">Not uploaded</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={!d?.file_path ? "danger" : d.review_status === "approved" ? "success" : d.review_status === "rejected" ? "danger" : "info"}>
                  {!d?.file_path ? "Missing" : d.review_status}
                </Pill>
                {reviewable && d?.file_path && (
                  <>
                    <Button size="icon" variant="outline" className="h-7 w-7" title="Approve" onClick={() => review(d, "approved")}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" title="Reject" onClick={() => review(d, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                  </>
                )}
                {editable && (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-2.5 py-1 text-xs hover:bg-accent">
                    <FileUp className="h-3.5 w-3.5" /> {d?.file_path ? "Replace" : "Upload"}
                    <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(dt.value, f); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ---------------- AI pre-CAB analysis ---------------- */

function formatAnalysisItem(item: unknown) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const value = item as Record<string, unknown>;
    const severity =
      typeof value.severity === "string"
        ? `${value.severity.toUpperCase()}: `
        : "";
    const issue =
      typeof value.issue === "string"
        ? value.issue
        : typeof value.message === "string"
          ? value.message
          : JSON.stringify(item);
    const docs = Array.isArray(value.documents)
      ? value.documents.filter((doc) => typeof doc === "string").join(", ")
      : "";
    return `${severity}${issue}${docs ? ` (${docs})` : ""}`;
  }
  return String(item);
}

function AnalysisList({
  value,
  emptyText,
}: {
  value: unknown;
  emptyText: string;
}) {
  const items = Array.isArray(value) ? value : [];

  if (!items.length) {
    return <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span>{formatAnalysisItem(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function AIPreCabAnalysisCard({
  request: r,
  documents,
  analysis,
}: {
  request: CabRequest;
  documents: CabDocument[];
  analysis: AIAnalysis | null;
}) {
  const uploaded = documents.filter((d) => d.file_path).length;
  const documentsReady = uploaded >= DOC_TYPES.length;
  const qaReady = isQaGatePassed(r);
  const readyForAI = documentsReady && qaReady;
  const status = analysis?.status ?? "NOT_ANALYZED";

  const badge =
    status === "COMPLETED"
      ? { label: "Analysis Complete", tone: "success" as const }
      : status === "PROCESSING"
        ? { label: "AI Analysis Running", tone: "teal" as const }
        : status === "FAILED"
          ? { label: "Analysis Failed", tone: "danger" as const }
          : readyForAI
            ? { label: "Ready for AI Analysis", tone: "teal" as const }
            : { label: "Waiting for CAB Readiness", tone: "warning" as const };

  const completed = status === "COMPLETED";

  return (
    <Card
      title="AI Pre-CAB Analysis"
      description="Decision-support analysis of submitted evidence before CAB review."
      actions={<Pill tone={badge.tone}>{badge.label}</Pill>}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Required Evidences</p>
          <p className="mt-1 text-sm font-medium">
            {uploaded}/{DOC_TYPES.length} uploaded
          </p>
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">QA Gate</p>
          <p className="mt-1 text-sm font-medium">
            {qaReady ? "Passed" : "Not ready"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-semibold">Executive Summary</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {analysis?.executive_summary ??
              (completed ? "No summary available." : "Not analyzed yet.")}
          </p>
        </div>

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-semibold">Missing Information</p>
          <AnalysisList
            value={analysis?.missing_information}
            emptyText={
              completed ? "No missing information detected." : "Not analyzed yet."
            }
          />
        </div>

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-semibold">Cross-document Inconsistencies</p>
          <AnalysisList
            value={analysis?.inconsistencies}
            emptyText={
              completed ? "No inconsistencies detected." : "Not analyzed yet."
            }
          />
        </div>

        <div className="rounded-md border border-border p-4">
          <p className="text-sm font-semibold">Risk Signals</p>
          <AnalysisList
            value={analysis?.risk_signals}
            emptyText={completed ? "No risk signals detected." : "Not analyzed yet."}
          />
        </div>
      </div>

      {(analysis?.provider || analysis?.model || analysis?.analyzed_at) && (
        <p className="mt-4 text-xs text-muted-foreground">
          {analysis.provider ?? "AI provider"}
          {analysis.model ? ` · ${analysis.model}` : ""}
          {analysis.analyzed_at
            ? ` · analyzed ${fmtDateTime(analysis.analyzed_at)}`
            : ""}
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        AI analysis is decision support only. The CAB reviewer remains the final
        decision authority.
      </p>
    </Card>
  );
}

/* ---------------- Technical review ---------------- */

function TechnicalReviewCard({ request: r, reviews }: { request: CabRequest; reviews: TechReview[] }) {
  const sections = sectionsForChangeType(r.change_type);
  return (
    <Card title="Technical review" description="Checklist by change type">
      <div className="space-y-5">
        {sections.map((s) => <SectionForm key={s} request={r} section={s} existing={reviews.find((x) => x.section === s)} />)}
      </div>
    </Card>
  );
}

function SectionForm({ request: r, section, existing }: { request: CabRequest; section: ReviewSection; existing?: TechReview | undefined }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const editable = r.status === "IN_REVIEW" && can(actor.role, "cab_reviewer");
  const def = REVIEW_SECTIONS[section];
  const [checks, setChecks] = useState<Record<string, boolean>>((existing?.checklist as Record<string, boolean>) ?? {});
  const [findings, setFindings] = useState(existing?.findings ?? "");
  const [cat, setCat] = useState(existing?.issue_category ?? ISSUE_CATEGORIES[0]!);

  async function save() {
    const { error } = await supabase.from("technical_reviews").upsert(
      { request_id: r.id, section, checklist: checks, findings, issue_category: cat, reviewer_id: actor.id, reviewer_name: actor.name, reviewed_at: new Date().toISOString() },
      { onConflict: "request_id,section" },
    );
    if (error) return toast.error(error.message);
    await supabase.from("cab_requests").update({ issue_category: cat }).eq("id", r.id);
    await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: `${def.label} saved`, comment: findings || null });
    toast.success(`${def.label} saved`);
    await refresh();
  }

  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-2 text-sm font-semibold">{def.label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {def.items.map((it) => (
          <label key={it.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!editable} checked={!!checks[it.key]} onChange={(e) => setChecks({ ...checks, [it.key]: e.target.checked })} />
            {it.label}
          </label>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Issue category</Label>
          <select disabled={!editable} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
            {ISSUE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Findings</Label>
          <Textarea disabled={!editable} rows={2} className="mt-1" value={findings} onChange={(e) => setFindings(e.target.value)} />
        </div>
      </div>
      {editable && <div className="mt-3 flex justify-end"><Button size="sm" onClick={save}>Save section</Button></div>}
      {existing && <p className="mt-2 text-xs text-muted-foreground">Last saved by {existing.reviewer_name} · {fmtDateTime(existing.reviewed_at)}</p>}
    </div>
  );
}

/* ---------------- Risk ---------------- */

function RiskCard({ request: r, risk }: { request: CabRequest; risk: Risk | null }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const editable = r.status === "IN_REVIEW" && can(actor.role, "cab_reviewer");
  const [c, setC] = useState(risk?.complexity ?? 2);
  const [d, setD] = useState(risk?.dependency ?? 2);
  const [p, setP] = useState(risk?.previous_issues ?? 0);
  const [notes, setNotes] = useState(risk?.notes ?? "");
  const score = computeRiskScore(c, d, p);
  const level = riskLevelFromScore(score);

  async function save() {
    const { error } = await supabase.from("risk_assessments").upsert(
      { request_id: r.id, complexity: c, dependency: d, previous_issues: p, score, level, notes, assessed_by: actor.id, assessed_at: new Date().toISOString() },
      { onConflict: "request_id" },
    );
    if (error) return toast.error(error.message);
    await supabase.from("cab_requests").update({ risk_score: score, risk_level: level }).eq("id", r.id);
    await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: `Risk assessed: ${level} (${score})` });
    toast.success("Risk assessment saved");
    await refresh();
  }

  const slider = (label: string, v: number, set: (n: number) => void, min: number) => (
    <div>
      <Label className="text-xs">{label}: <span className="tabular font-semibold">{v}</span></Label>
      <input type="range" min={min} max={5} value={v} disabled={!editable} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full accent-primary" />
    </div>
  );

  return (
    <Card title="Risk assessment" actions={<RiskPill level={level} score={score} />}>
      <div className="grid gap-4 sm:grid-cols-3">
        {slider("Complexity (1–5)", c, setC, 1)}
        {slider("Dependency (1–5)", d, setD, 1)}
        {slider("Previous issues (0–5)", p, setP, 0)}
      </div>
      <Textarea disabled={!editable} rows={2} className="mt-3" placeholder="Risk notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {editable && <div className="mt-3 flex justify-end"><Button size="sm" onClick={save}>Save risk</Button></div>}
    </Card>
  );
}

/* ---------------- Decision ---------------- */

function DecisionCard({ request: r, risk }: { request: CabRequest; risk: Risk | null }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const [decision, setDecision] = useState<"passed" | "passed_with_conditions" | "not_approved">("passed");
  const [comment, setComment] = useState("");
  const [conds, setConds] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  if (!can(actor.role, "cab_reviewer")) return null;

  async function submit() {
    if (!risk) return toast.error("Save the risk assessment first");
    if (!comment.trim()) return toast.error("A decision comment is required");
    const list = conds.map((c) => c.trim()).filter(Boolean);
    if (decision === "passed_with_conditions" && !list.length) return toast.error("Add at least one condition");
    setBusy(true);
    try {
      const { error } = await supabase.from("cab_decisions").insert({ request_id: r.id, decision, comment, decided_by: actor.id, decided_by_name: actor.name });
      if (error) throw error;
      const now = new Date().toISOString();
      if (decision === "passed") {
        await transition(r.id, "IN_REVIEW", "PASSED", actor, "CAB decision: Passed", comment, { reviewed_at: now, passed_at: now });
      } else if (decision === "passed_with_conditions") {
        const { error: ce } = await supabase.from("cab_conditions").insert(
          list.map((t) => ({ request_id: r.id, condition_text: t, assigned_to: r.developer_id, assigned_to_name: r.developer_name })),
        );
        if (ce) throw ce;
        await transition(r.id, "IN_REVIEW", "PASSED_WITH_CONDITIONS", actor, "CAB decision: Passed with conditions", comment, { reviewed_at: now });
      } else {
        await transition(r.id, "IN_REVIEW", "NOT_APPROVED", actor, "CAB decision: Not approved", comment, { reviewed_at: now });
      }
      toast.success("Decision recorded");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record decision");
    } finally {
      setBusy(false);
    }
  }

  const opts = [
    { v: "passed", l: "Passed", hint: "→ Deployment booking" },
    { v: "passed_with_conditions", l: "Passed with conditions", hint: "→ Developer rework → verify" },
    { v: "not_approved", l: "Not approved", hint: "→ Developer fix → resubmit" },
  ] as const;

  return (
    <Card title="CAB decision">
      <div className="grid gap-2 sm:grid-cols-3">
        {opts.map((o) => (
          <button key={o.v} type="button" onClick={() => setDecision(o.v)}
            className={cn("rounded-md border p-3 text-left text-sm", decision === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-surface")}>
            <p className="font-medium">{o.l}</p>
            <p className="text-xs text-muted-foreground">{o.hint}</p>
          </button>
        ))}
      </div>
      {decision === "passed_with_conditions" && (
        <div className="mt-4 space-y-2">
          <Label className="text-xs">Conditions</Label>
          {conds.map((c, i) => (
            <Input key={i} value={c} placeholder={`Condition ${i + 1}`} onChange={(e) => setConds(conds.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
          <Button size="sm" variant="outline" onClick={() => setConds([...conds, ""])}>Add condition</Button>
        </div>
      )}
      <Textarea rows={3} className="mt-4" placeholder="Decision comment (required)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="mt-3 flex justify-end"><Button disabled={busy} onClick={submit}>Record decision</Button></div>
    </Card>
  );
}

/* ---------------- Conditions ---------------- */

function ConditionsCard({ request: r, conditions }: { request: CabRequest; conditions: Condition[] }) {
  return (
    <Card title="CAB conditions" description={`${conditions.filter((c) => c.status === "verified").length}/${conditions.length} verified`}>
      <ul className="space-y-3">
        {conditions.map((c) => <ConditionRow key={c.id} request={r} c={c} />)}
      </ul>
    </Card>
  );
}

function ConditionRow({ request: r, c }: { request: CabRequest; c: Condition }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const [resp, setResp] = useState(c.developer_response ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [verNote, setVerNote] = useState("");
  const devEdit = r.status === "PASSED_WITH_CONDITIONS" && can(actor.role, "developer") && c.status !== "verified";
  const verify = r.status === "CONDITIONS_VERIFICATION" && can(actor.role, "cab_reviewer") && c.status === "ready_for_verification";

  async function respond() {
    if (!resp.trim()) return toast.error("Response is required");
    try {
      let upd: Partial<Condition> = { developer_response: resp, status: "ready_for_verification" };
      if (file) {
        const path = `${r.id}/conditions/${c.id}-${file.name}`;
        await uploadFile(path, file);
        upd = { ...upd, evidence_path: path, evidence_name: file.name };
      }
      const { error } = await supabase.from("cab_conditions").update(upd).eq("id", c.id);
      if (error) throw error;
      await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: "Condition answered", comment: c.condition_text });
      toast.success("Response saved");
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function decide(ok: boolean) {
    const { error } = await supabase.from("cab_conditions").update({
      status: ok ? "verified" : "rejected", verification_result: verNote || null, verified_by: actor.id, verified_by_name: actor.name, verified_at: new Date().toISOString(),
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await logActivity({ request_id: r.id, actor_id: actor.id, actor_name: actor.name, action: ok ? "Condition verified" : "Condition rejected", comment: verNote || c.condition_text });
    // Evaluate outcome once no conditions are awaiting verification.
    const { data: all } = await supabase.from("cab_conditions").select("*").eq("request_id", r.id);
    const list = all ?? [];
    if (!list.some((x) => x.status === "ready_for_verification")) {
      const req = list.filter((x) => x.required);
      if (req.every((x) => x.status === "verified")) {
        await transition(r.id, "CONDITIONS_VERIFICATION", "PASSED", actor, "All conditions verified — Passed", null, { passed_at: new Date().toISOString() });
        toast.success("All conditions verified. Request is now Passed.");
      } else {
        await supabase.from("cab_conditions").update({ status: "open" }).eq("request_id", r.id).eq("status", "rejected");
        await transition(r.id, "CONDITIONS_VERIFICATION", "PASSED_WITH_CONDITIONS", actor, "Conditions rejected — returned to developer rework");
        toast.message("Returned to developer for rework");
      }
    }
    await refresh();
  }

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{c.condition_text}</p>
        <Pill tone={c.status === "verified" ? "success" : c.status === "rejected" ? "danger" : c.status === "ready_for_verification" ? "info" : "warning"}>
          {c.status.replace(/_/g, " ")}
        </Pill>
      </div>
      <p className="text-xs text-muted-foreground">Assigned to {c.assigned_to_name ?? "developer"}</p>
      {c.developer_response && !devEdit && <p className="mt-2 text-sm"><span className="text-muted-foreground">Response: </span>{c.developer_response}</p>}
      {c.evidence_path && (
        <button className="mt-1 text-xs text-primary hover:underline" onClick={() => openStoredFile(c.evidence_path!).catch((e: Error) => toast.error(e.message))}>
          Evidence: {c.evidence_name}
        </button>
      )}
      {c.verification_result && <p className="mt-1 text-xs text-muted-foreground">Reviewer: {c.verification_result} ({c.verified_by_name})</p>}
      {devEdit && (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} placeholder="How was this addressed?" value={resp} onChange={(e) => setResp(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button size="sm" onClick={respond}>Save response</Button>
          </div>
        </div>
      )}
      {verify && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input className="max-w-sm" placeholder="Verification note" value={verNote} onChange={(e) => setVerNote(e.target.value)} />
          <Button size="sm" onClick={() => decide(true)}>Verify</Button>
          <Button size="sm" variant="outline" onClick={() => decide(false)}>Reject</Button>
        </div>
      )}
    </li>
  );
}

/* ---------------- Deployment ---------------- */

function DeploymentCard({ request: r, deployments }: { request: CabRequest; deployments: Deployment[] }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const isCoord = can(actor.role, "deployment_coordinator");
  const [f, setF] = useState({ environment: "production", deploy_date: r.target_deploy_date ?? "", start: "20:00", end: "23:00", notes: "" });
  const [failNote, setFailNote] = useState("");
  const current = deployments[0];

  async function book() {
    if (r.status !== "PASSED") return toast.error("Only Passed requests can be booked");
    if (!f.deploy_date) return toast.error("Choose a date");
    const ws = new Date(`${f.deploy_date}T${f.start}`);
    const we = new Date(`${f.deploy_date}T${f.end}`);
    if (we <= ws) return toast.error("Window end must be after start");
    const { data: clash } = await supabase.from("deployments").select("id").eq("environment", f.environment).in("status", ["scheduled", "deploying"]).lt("window_start", we.toISOString()).gt("window_end", ws.toISOString());
    if (clash && clash.length) return toast.error("This window overlaps another deployment in the same environment");
    const { error } = await supabase.from("deployments").insert({
      request_id: r.id, environment: f.environment, deploy_date: f.deploy_date, window_start: ws.toISOString(), window_end: we.toISOString(),
      coordinator_id: actor.id, coordinator_name: actor.name, notes: f.notes || null, attempt: deployments.length + 1,
    });
    if (error) return toast.error(error.message);
    await transition(r.id, "PASSED", "DEPLOYMENT_BOOKED", actor, `Deployment booked (${f.environment}) ${f.deploy_date}`);
    toast.success("Deployment booked");
    await refresh();
  }

  async function setDep(status: "deploying" | "completed" | "failed" | "cancelled") {
    if (!current) return;
    const now = new Date().toISOString();
    const upd: Partial<Deployment> = { status };
    if (status === "deploying") upd.started_at = now;
    if (status === "completed" || status === "failed") upd.completed_at = now;
    const { error } = await supabase.from("deployments").update(upd).eq("id", current.id);
    if (error) return toast.error(error.message);
    try {
      if (status === "deploying") await transition(r.id, "DEPLOYMENT_BOOKED", "DEPLOYING", actor, "Deployment started");
      if (status === "cancelled") await transition(r.id, "DEPLOYMENT_BOOKED", "PASSED", actor, "Booking cancelled — ready to rebook");
      if (status === "completed") await transition(r.id, "DEPLOYING", "DEPLOYED", actor, "Deployment completed successfully");
      if (status === "failed") {
        await transition(r.id, "DEPLOYING", "DEPLOY_FAILED", actor, "Deployment failed", failNote);
        await supabase.from("incidents").insert({ request_id: r.id, deployment_id: current.id, title: `Deployment failure — ${r.request_code}`, description: failNote || null, created_by: actor.id });
        await transition(r.id, "DEPLOY_FAILED", "INCIDENT", actor, "Incident raised for RCA");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    await refresh();
  }

  return (
    <Card title="Deployment">
      {deployments.length > 0 && (
        <ul className="mb-4 space-y-2">
          {deployments.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <span>Attempt {d.attempt} · {ENVIRONMENTS.find((e) => e.value === d.environment)?.label} · {fmtDateTime(d.window_start)} – {new Date(d.window_end).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              <Pill tone={d.status === "completed" ? "success" : d.status === "failed" ? "danger" : d.status === "deploying" ? "teal" : "info"}>{d.status}</Pill>
            </li>
          ))}
        </ul>
      )}
      {r.status === "PASSED" && isCoord && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs">Environment</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.environment} onChange={(e) => setF({ ...f, environment: e.target.value })}>
              {ENVIRONMENTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Date</Label><Input type="date" className="mt-1" value={f.deploy_date} onChange={(e) => setF({ ...f, deploy_date: e.target.value })} /></div>
          <div><Label className="text-xs">Start</Label><Input type="time" className="mt-1" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div><Label className="text-xs">End</Label><Input type="time" className="mt-1" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
          <Textarea className="sm:col-span-4" rows={2} placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <div className="sm:col-span-4 flex justify-end"><Button onClick={book}>Book deployment</Button></div>
        </div>
      )}
      {r.status === "PASSED" && !isCoord && <p className="text-sm text-muted-foreground">Awaiting a deployment coordinator to book a window.</p>}
      {isCoord && r.status === "DEPLOYMENT_BOOKED" && (
        <div className="flex gap-2">
          <Button onClick={() => setDep("deploying")}>Start deployment</Button>
          <Button variant="outline" onClick={() => setDep("cancelled")}>Cancel booking</Button>
        </div>
      )}
      {isCoord && r.status === "DEPLOYING" && (
        <div className="space-y-2">
          <Input placeholder="Failure details (if failed)" value={failNote} onChange={(e) => setFailNote(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => setDep("completed")}>Mark successful</Button>
            <Button variant="destructive" onClick={() => setDep("failed")}>Mark failed</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Incident ---------------- */

function IncidentCard({ request: r, incidents }: { request: CabRequest; incidents: Incident[] }) {
  return (
    <Card title="Incidents / RCA">
      <ul className="space-y-3">{incidents.map((i) => <IncidentRow key={i.id} request={r} i={i} />)}</ul>
    </Card>
  );
}

function IncidentRow({ request: r, i }: { request: CabRequest; i: Incident }) {
  const actor = useActor();
  const refresh = useInvalidateAll();
  const [rc, setRc] = useState(i.root_cause ?? "");
  const [ca, setCa] = useState(i.corrective_action ?? "");
  const [scope, setScope] = useState<boolean>(i.scope_changed ?? false);
  const editable = i.status !== "resolved" && r.status === "INCIDENT" && can(actor.role, "deployment_coordinator", "developer");

  async function resolve() {
    if (!rc.trim() || !ca.trim()) return toast.error("Root cause and corrective action are required");
    const { error } = await supabase.from("incidents").update({ root_cause: rc, corrective_action: ca, scope_changed: scope, status: "resolved" }).eq("id", i.id);
    if (error) return toast.error(error.message);
    try {
      if (scope) await transition(r.id, "INCIDENT", "DOCUMENTS_PENDING", actor, "RCA complete — scope changed, re-CAB required", rc);
      else await transition(r.id, "INCIDENT", "PASSED", actor, "RCA complete — ready to rebook deployment", rc);
      toast.success(scope ? "Returned to developer for re-CAB" : "Ready for re-booking");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    await refresh();
  }

  return (
    <li className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{i.title}</p>
        <Pill tone={i.status === "resolved" ? "success" : "danger"}>{i.status}</Pill>
      </div>
      {i.description && <p className="mt-1 text-muted-foreground">{i.description}</p>}
      {editable ? (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} placeholder="Root cause" value={rc} onChange={(e) => setRc(e.target.value)} />
          <Textarea rows={2} placeholder="Corrective action" value={ca} onChange={(e) => setCa(e.target.value)} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={scope} onChange={(e) => setScope(e.target.checked)} /> Scope changed (requires new CAB review)</label>
          <div className="flex justify-end"><Button size="sm" onClick={resolve}>Complete RCA</Button></div>
        </div>
      ) : (
        <>
          {i.root_cause && <p className="mt-1"><span className="text-muted-foreground">Root cause: </span>{i.root_cause}</p>}
          {i.corrective_action && <p><span className="text-muted-foreground">Action: </span>{i.corrective_action}</p>}
        </>
      )}
    </li>
  );
}

/* ---------------- Activity ---------------- */

function ActivityCard({ id }: { id: string }) {
  const { data } = useActivity(id);
  return (
    <Card title="Activity">
      <ul className="space-y-2.5">
        {(data ?? []).map((a) => (
          <li key={a.id} className="text-sm">
            <p><span className="font-medium">{a.action}</span>{a.to_status && <span className="text-muted-foreground"> → {statusLabel(a.to_status)}</span>}</p>
            <p className="text-xs text-muted-foreground">{a.actor_name ?? "System"} · {fmtDateTime(a.created_at)}</p>
            {a.comment && <p className="text-xs">{a.comment}</p>}
          </li>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </ul>
    </Card>
  );
}
