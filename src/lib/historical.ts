// Deterministic Historical CAB Intelligence analytics.
// Pure functions only: no network, no storage, no logging of source rows.

export const TAXONOMY_VERSION = "v1-2026-09-26";

export type GroupCode = "DATA_QUALITY" | "CAB_PROCESS" | "DEPLOYMENT" | "OTHER";
export type Confidence = "High" | "Med" | "Low";
export type RejectType = "Explicit" | "Implied";

export const TAXONOMY: { code: string; name: string; group: GroupCode }[] = [
  { code: "A", name: "Data type", group: "DATA_QUALITY" },
  { code: "B", name: "Naming", group: "DATA_QUALITY" },
  { code: "C", name: "Data design/Logic", group: "DATA_QUALITY" },
  { code: "D", name: "Standard/Structure", group: "DATA_QUALITY" },
  { code: "E", name: "Impact/Users/Migration", group: "DATA_QUALITY" },
  { code: "F", name: "QA/Testing", group: "DATA_QUALITY" },
  { code: "G", name: "Schedule/Dependency/Alert", group: "DATA_QUALITY" },
  { code: "H", name: "Documentation", group: "CAB_PROCESS" },
  { code: "I", name: "Rejected – no reason", group: "CAB_PROCESS" },
  { code: "J", name: "Cancelled/Duplicate", group: "OTHER" },
  { code: "K", name: "Deploy issue/Defect/Config", group: "DEPLOYMENT" },
  { code: "L", name: "Special approval", group: "CAB_PROCESS" },
  { code: "M", name: "Initial data/Cut over", group: "DEPLOYMENT" },
  { code: "N", name: "Postponed", group: "DEPLOYMENT" },
  { code: "O", name: "Deploy plan/time", group: "DEPLOYMENT" },
  { code: "P", name: "Other", group: "OTHER" },
];
export const GROUP_LABEL: Record<GroupCode, string> = {
  DATA_QUALITY: "Data Quality (A–G)",
  CAB_PROCESS: "CAB Process (H, I, L)",
  DEPLOYMENT: "Deployment (K, M, N, O)",
  OTHER: "Other (J, P)",
};
const GROUP_OF = new Map(TAXONOMY.map((t) => [t.code, t.group]));
export const isDataQuality = (code: string) => GROUP_OF.get(code) === "DATA_QUALITY";

export type HistIssue = {
  source_row: number;
  cr_number: string;
  original_remark: string;
  primary_category: string;
  secondary_category?: string | null;
  source_date?: string | null; // YYYY-MM-DD
  date_source?: string | null;
  confidence: Confidence;
  is_rejected: boolean;
  reject_type?: RejectType | null;
  is_special_cab?: boolean;
};

export type HistRound = {
  cr_number: string;
  round_no: number;
  cab_date?: string | null;
  session?: string | null;
  decision:
    | "APPROVED"
    | "APPROVED_WITH_CONDITIONS"
    | "REJECTED"
    | "PENDING"
    | "SPECIAL_APPROVAL"
    | "CANCELLED";
  reject_type?: RejectType | null;
  is_special_cab?: boolean;
};

export type HistDeployment = {
  cr_number: string;
  attempt_no: number;
  deploy_date?: string | null;
  outcome: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "ROLLBACK" | "POSTPONED" | "UNKNOWN";
};

export type HistFlag = { cr_number: string; flag_code: "F1" | "F2" | "F3" | "F4"; confirmation_status?: string };

export type Snapshot = {
  issues: HistIssue[];
  rounds: HistRound[];
  deployments?: HistDeployment[];
  flags?: HistFlag[];
};

/** Explicit iff remark literally states rejection. Implied otherwise (owner-confirmed). */
const EXPLICIT_RE = /(rejected|reject|not approved|ไม่ผ่าน|ไม่อนุมัติ)/i;
export function classifyRejectWording(remark: string): RejectType {
  return EXPLICIT_RE.test(remark) ? "Explicit" : "Implied";
}

/** Rejection events = distinct (CR, date) among REJECTED CAB rounds. Deployment outcomes never contribute. */
export function rejectEvents(rounds: HistRound[]) {
  const map = new Map<string, { cr: string; date: string | null; type: RejectType }>();
  for (const r of rounds) {
    if (r.decision !== "REJECTED" || !r.cab_date) continue;
    const key = `${r.cr_number}|${r.cab_date}`;
    const prev = map.get(key);
    // Explicit wins if any round on that (CR,date) is explicit.
    const type: RejectType = prev?.type === "Explicit" || r.reject_type === "Explicit" ? "Explicit" : "Implied";
    map.set(key, { cr: r.cr_number, date: r.cab_date ?? null, type });
  }
  return [...map.values()];
}

export function multiRound(rounds: HistRound[]) {
  const by = new Map<string, HistRound[]>();
  for (const r of rounds) by.set(r.cr_number, [...(by.get(r.cr_number) ?? []), r]);
  return [...by.entries()]
    .filter(([, rs]) => rs.length >= 2)
    .map(([cr, rs]) => {
      const sorted = [...rs].sort((a, b) => a.round_no - b.round_no);
      const dates = sorted.map((r) => r.cab_date ?? "");
      const sameDay = dates.some((d, i) => d && dates.indexOf(d) !== i);
      return { cr, rounds: sorted, count: sorted.length, sameDay };
    })
    .sort((a, b) => b.count - a.count || a.cr.localeCompare(b.cr));
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "2026-09" -> "ก.ย. 69" (Buddhist Era, 2-digit). */
export function thaiMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${TH_MONTHS[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
}
export function monthRange(first: string, last: string) {
  const out: string[] = [];
  let [y, m] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export type MonthlyRow = { month: string; label: string; A: number; B: number; C: number; E: number; DFG: number };

export function computeAnalytics(s: Snapshot) {
  const issues = s.issues;
  const crs = new Set(issues.map((i) => i.cr_number));
  const byCategory = TAXONOMY.map((t) => ({
    ...t,
    count: issues.filter((i) => i.primary_category === t.code).length,
  }));
  const groups = (Object.keys(GROUP_LABEL) as GroupCode[]).map((g) => ({
    group: g,
    label: GROUP_LABEL[g],
    count: byCategory.filter((c) => c.group === g).reduce((a, c) => a + c.count, 0),
  }));
  const dq = issues.filter((i) => isDataQuality(i.primary_category));
  const dqDated = dq.filter((i) => i.source_date);
  const dqUndated = dq.length - dqDated.length;
  // Use the entire historical period (not merely months containing a DQ issue), including zero-DQ months.
  const months = [...issues.map((i) => i.source_date).filter((v): v is string => !!v),
    ...s.rounds.map((r) => r.cab_date).filter((v): v is string => !!v)]
    .map((d) => d.slice(0, 7)).sort();
  const monthly: MonthlyRow[] = months.length
    ? monthRange(months[0], months[months.length - 1]).map((m) => {
        const row: MonthlyRow = { month: m, label: thaiMonthLabel(m), A: 0, B: 0, C: 0, E: 0, DFG: 0 };
        for (const i of dqDated) {
          if (i.source_date!.slice(0, 7) !== m) continue;
          const c = i.primary_category;
          if (c === "A" || c === "B" || c === "C" || c === "E") row[c]++;
          else row.DFG++;
        }
        return row;
      })
    : [];
  const rejectedIssues = issues.filter((i) => i.is_rejected);
  const rejectCauses = TAXONOMY.map((t) => ({
    code: t.code,
    name: t.name,
    count: rejectedIssues.filter((i) => i.primary_category === t.code).length,
  })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const events = rejectEvents(s.rounds);
  const mr = multiRound(s.rounds);
  const flags = s.flags ?? [];
  const flagCounts = { F1: 0, F2: 0, F3: 0, F4: 0 } as Record<HistFlag["flag_code"], number>;
  for (const f of flags) flagCounts[f.flag_code]++;
  return {
    totalIssues: issues.length,
    totalCrs: crs.size,
    undatedIssues: issues.filter((i) => !i.source_date).length,
    byCategory,
    groups,
    dq: { issues: dq.length, crs: new Set(dq.map((i) => i.cr_number)).size, share: issues.length ? dq.length / issues.length : 0, undated: dqUndated },
    monthly,
    rejected: {
      issueRows: rejectedIssues.length,
      undatedRounds: s.rounds.filter((r) => r.decision === "REJECTED" && !r.cab_date).length,
      events: events.length,
      crs: new Set(events.map((e) => e.cr)).size,
      explicit: events.filter((e) => e.type === "Explicit").length,
      implied: events.filter((e) => e.type === "Implied").length,
      causes: rejectCauses,
    },
    multiRound: { list: mr, count: mr.length, threePlus: mr.filter((m) => m.count >= 3).length },
    flags: { counts: flagCounts, pending: flags.filter((f) => (f.confirmation_status ?? "pending") === "pending").length },
    categoryOCount: byCategory.find((c) => c.code === "O")?.count ?? 0,
  };
}
export type Analytics = ReturnType<typeof computeAnalytics>;

export type Expected = Partial<{
  analyzedIssueRows: number;
  rejectEvents: number;
  rejectedIssueRows: number;
  multiRoundCrs: number;
}>;

/** Returns list of validation errors; empty = publishable. */
export function validateSnapshot(a: Analytics, expected: Expected = {}): string[] {
  const errs: string[] = [];
  const catSum = a.byCategory.reduce((x, c) => x + c.count, 0);
  if (catSum !== a.totalIssues) errs.push(`Category sum ${catSum} ≠ total issues ${a.totalIssues} (unknown category codes present)`);
  const grpSum = a.groups.reduce((x, g) => x + g.count, 0);
  if (grpSum !== a.totalIssues) errs.push(`Group sum ${grpSum} ≠ total issues ${a.totalIssues}`);
  const monthlyDq = a.monthly.reduce((x, r) => x + r.A + r.B + r.C + r.E + r.DFG, 0);
  if (monthlyDq + a.dq.undated !== a.dq.issues) errs.push(`Monthly DQ ${monthlyDq} + undated ${a.dq.undated} ≠ DQ total ${a.dq.issues}`);
  if (a.rejected.undatedRounds) errs.push(`${a.rejected.undatedRounds} rejected CAB rounds lack verified dates; event count cannot be published`);
  if (a.rejected.explicit + a.rejected.implied !== a.rejected.events) errs.push("Explicit + Implied ≠ reject events");
  if (a.rejected.crs > a.rejected.events) errs.push("Rejected CRs exceed reject events");
  if (a.multiRound.threePlus > a.multiRound.count) errs.push("3-round CRs exceed multi-round CRs");
  if (expected.analyzedIssueRows != null && expected.analyzedIssueRows !== a.totalIssues)
    errs.push(`Issue rows ${a.totalIssues} ≠ analyzed sheet ${expected.analyzedIssueRows}`);
  if (expected.rejectEvents != null && expected.rejectEvents !== a.rejected.events)
    errs.push(`Reject events ${a.rejected.events} ≠ reject sheet ${expected.rejectEvents}`);
  if (expected.rejectedIssueRows != null && expected.rejectedIssueRows !== a.rejected.issueRows)
    errs.push(`Rejected issue rows ${a.rejected.issueRows} ≠ expected ${expected.rejectedIssueRows}`);
  if (expected.multiRoundCrs != null && expected.multiRoundCrs !== a.multiRound.count)
    errs.push(`Multi-round CRs ${a.multiRound.count} ≠ expected ${expected.multiRoundCrs}`);
  return errs;
}

export const REQUIRED_SHEETS = ["README", "1_Issue_Level", "2_Category_Summary", "3_Reject_Count", "4_Multi_Round", "5_DQ_Flags", "6_To_Confirm"];
export function missingSheets(names: string[]) {
  return REQUIRED_SHEETS.filter((s) => !names.includes(s));
}
