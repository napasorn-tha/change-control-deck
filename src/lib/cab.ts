import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "developer"
  | "cab_reviewer"
  | "deployment_coordinator"
  | "executive"
  | "admin";

export const ROLE_LABEL: Record<AppRole, string> = {
  developer: "Developer",
  cab_reviewer: "CAB Reviewer",
  deployment_coordinator: "Deployment Coordinator",
  executive: "Executive",
  admin: "Admin",
};

export type CabStatus =
  | "DRAFT"
  | "DOCUMENTS_PENDING"
  | "READY_FOR_CAB"
  | "IN_REVIEW"
  | "PASSED_WITH_CONDITIONS"
  | "CONDITIONS_VERIFICATION"
  | "PASSED"
  | "NOT_APPROVED"
  | "DEPLOYMENT_BOOKED"
  | "DEPLOYING"
  | "DEPLOYED"
  | "DEPLOY_FAILED"
  | "INCIDENT"
  | "CLOSED";

type Tone = "neutral" | "info" | "teal" | "success" | "warning" | "danger" | "primary";

export const STATUS_META: Record<CabStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  DOCUMENTS_PENDING: { label: "Documents Pending", tone: "warning" },
  READY_FOR_CAB: { label: "Ready for CAB", tone: "info" },
  IN_REVIEW: { label: "In Review", tone: "info" },
  PASSED_WITH_CONDITIONS: { label: "Passed with Conditions", tone: "warning" },
  CONDITIONS_VERIFICATION: { label: "Verify Conditions", tone: "warning" },
  PASSED: { label: "Passed", tone: "success" },
  NOT_APPROVED: { label: "Not Approved", tone: "danger" },
  DEPLOYMENT_BOOKED: { label: "Deployment Booked", tone: "teal" },
  DEPLOYING: { label: "Deploying", tone: "teal" },
  DEPLOYED: { label: "Deployed", tone: "success" },
  DEPLOY_FAILED: { label: "Deployment Failed", tone: "danger" },
  INCIDENT: { label: "Incident / RCA", tone: "danger" },
  CLOSED: { label: "Closed / Completed", tone: "success" },
};

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/25",
  teal: "bg-teal/10 text-teal border-teal/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  primary: "bg-primary/10 text-primary border-primary/25",
};

export function statusLabel(status: string) {
  return STATUS_META[status as CabStatus]?.label ?? status;
}
export function statusTone(status: string): Tone {
  return STATUS_META[status as CabStatus]?.tone ?? "neutral";
}

export const RISK_TONE: Record<string, Tone> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
  unassessed: "neutral",
};

export const CHANGE_TYPES = [
  { value: "ingestion", label: "Data Ingestion" },
  { value: "transformation", label: "Data Transformation" },
  { value: "outbound", label: "Data Outbound" },
  { value: "mixed", label: "Mixed" },
] as const;

export const DOC_TYPES = [
  { value: "code_artefacts", label: "Code Artefacts" },
  { value: "mop_document", label: "MOP Document" },
  { value: "deployment_checklist", label: "Deployment Checklist" },
  { value: "qa_test_results", label: "QA Test Results" },
  { value: "git_merge_request", label: "Git Merge Request" },
] as const;

export const ENVIRONMENTS = [
  { value: "sit", label: "SIT" },
  { value: "uat", label: "UAT" },
  { value: "pre_production", label: "Pre-Production" },
  { value: "production", label: "Production" },
] as const;

export const REVIEW_SECTIONS = {
  ingestion: {
    label: "Ingestion Review",
    items: [
      { key: "source_connectivity", label: "Source connectivity" },
      { key: "schema_readiness", label: "Schema readiness" },
      { key: "data_type_compatibility", label: "Data type compatibility" },
      { key: "load_strategy", label: "Incremental / full load strategy" },
      { key: "data_volume", label: "Data volume" },
      { key: "error_handling", label: "Error handling" },
    ],
  },
  transformation: {
    label: "Transformation Review",
    items: [
      { key: "business_logic", label: "Business logic" },
      { key: "data_quality", label: "Data quality" },
      { key: "naming_standards", label: "Naming standards" },
      { key: "data_types", label: "Data types" },
      { key: "dependency", label: "Dependency" },
      { key: "lineage", label: "Lineage" },
    ],
  },
  outbound: {
    label: "Outbound Review",
    items: [
      { key: "target_interface", label: "Target interface" },
      { key: "consumer_dependency", label: "Consumer dependency" },
      { key: "data_contract", label: "Data contract" },
      { key: "validation", label: "Validation" },
      { key: "delivery_schedule", label: "Delivery schedule" },
      { key: "failure_handling", label: "Failure handling" },
    ],
  },
} as const;

export type ReviewSection = keyof typeof REVIEW_SECTIONS;

export const ISSUE_CATEGORIES = [
  "No Finding / No Issue",
  "Data Type Standard",
  "Data Type Compatibility",
  "Naming Standard",
  "Lineage Validation",
  "Source Connectivity",
  "Lineage Documentation Gap",
  "Data Contract Gap",
];

export function sectionsForChangeType(changeType: string): ReviewSection[] {
  if (changeType === "ingestion") return ["ingestion"];
  if (changeType === "transformation") return ["transformation"];
  if (changeType === "outbound") return ["outbound"];
  return ["ingestion", "transformation", "outbound"];
}

export function computeRiskScore(
  complexity: number,
  dependency: number,
  previousIssues: number,
) {
  const score = Math.round((complexity / 5) * 45 + (dependency / 5) * 35 + (previousIssues / 5) * 20);
  return Math.max(0, Math.min(100, score));
}

export function riskLevelFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 35) return "low";
  if (score < 60) return "medium";
  if (score < 80) return "high";
  return "critical";
}

/** Statuses that mean the developer must act. */
export const DEVELOPER_ACTION_STATUSES: CabStatus[] = [
  "DRAFT",
  "DOCUMENTS_PENDING",
  "NOT_APPROVED",
  "PASSED_WITH_CONDITIONS",
  "INCIDENT",
];

/** Statuses visible in the CAB review queue. */
export const REVIEW_QUEUE_STATUSES: CabStatus[] = ["READY_FOR_CAB", "IN_REVIEW"];

/** Passed and not yet booked → Deployment Booking. */
export const READY_FOR_BOOKING_STATUSES: CabStatus[] = ["PASSED"];

export async function logActivity(entry: {
  request_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  comment?: string | null;
}) {
  const { error } = await supabase.from("activity_log").insert(entry);
  if (error) console.error("activity log failed", error);
}

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function nextRequestCode(existing: string[]) {
  const year = new Date().getFullYear();
  const nums = existing
    .map((c) => Number(c.split("-")[2]))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `CAB-${year}-${String(next).padStart(3, "0")}`;
}
