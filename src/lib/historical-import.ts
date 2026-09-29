import readExcelFile from "read-excel-file/browser";
import { computeAnalytics, validateSnapshot, REQUIRED_SHEETS, TAXONOMY_VERSION, type Confidence, type HistIssue, type HistRound, type HistFlag, type Expected } from "./historical";

type Row = unknown[];
type Sheet = { sheet: string; data: Row[] };
type RecordRow = { source_row: number; data: Record<string, unknown> };
export type ImportNote = { sheet_name: string; source_row: number; cr_reference: string; label: string; detail: string; status: string };
export type ImportFlag = HistFlag & { detail: string };
export type ImportPayload = {
  source_file: string; file_sha256: string; snapshot_date: string; taxonomy_version: string;
  expected_counts: Expected & { dqIssues: number; explicit: number; implied: number; flagCounts: Record<string, number> };
  issues: HistIssue[]; rounds: HistRound[]; flags: ImportFlag[]; notes: ImportNote[];
};
export type ImportPreview = { payload: ImportPayload; errors: string[]; warnings: string[]; analytics: ReturnType<typeof computeAnalytics> };
const str = (x: unknown) => x == null ? "" : x instanceof Date
  ? String(x.getUTCDate()).padStart(2, "0") + "/" + String(x.getUTCMonth() + 1).padStart(2, "0") + "/" + x.getUTCFullYear()
  : String(x).trim();
const norm = (x: unknown) => str(x).replace(/\s+/g, " ").trim().toLowerCase();
const number = (x: unknown) => Number(str(x).replace(/,/g, ""));
function dateISO(v: unknown): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const text = str(v);
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = Number(m[1]), mon = Number(m[2]), year = Number(m[3]);
    const dt = new Date(Date.UTC(year, mon - 1, d));
    if (dt.getUTCFullYear() === year && dt.getUTCMonth() === mon - 1 && dt.getUTCDate() === d) return dt.toISOString().slice(0, 10);
  }
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const dt = new Date(text + "T00:00:00Z");
    if (!Number.isNaN(dt.valueOf()) && dt.toISOString().slice(0, 10) === text) return text;
  }
  return null;
}
const category = (v: unknown) => str(v).match(/^([A-P])(?:\s*\.|\s*$)/i)?.[1]?.toUpperCase() ?? "";
function records(rows: Row[], required: string[], tab: string, errors: string[]): RecordRow[] {
  const head = rows.findIndex((r) => required.every((n) => r.some((v) => norm(v) === norm(n))));
  if (head < 0) { errors.push(tab + ": required columns missing"); return []; }
  const cols = (rows[head] ?? []).map(norm);
  return rows.slice(head + 1).map((r, i) => ({
    source_row: head + i + 2,
    data: Object.fromEntries(cols.map((key, j) => [key, r[j] ?? null])),
  })).filter((r) => Object.values(r.data).some((v) => str(v)));
}
const get = (r: RecordRow, name: string) => r.data[norm(name)];
function rejectEntries(text: string) {
  return [...text.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})\s*\(([EI])\)/g)].map((m) => ({
    date: dateISO(m[1] ?? ""), type: m[2] === "E" ? "Explicit" as const : "Implied" as const,
  }));
}
function parseRounds(text: string, c: string, errors: string[]): HistRound[] {
  const rounds: HistRound[] = [];
  for (const part of text.split(/\s*\|\s*(?=R\d+\b)/i)) {
    const m = part.match(/\bR(\d+)\s+(?:review\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s*:\s*(.*)/i);
    if (!m) { errors.push("Round format unresolved for " + c); continue; }
    const d = dateISO(m[2] ?? ""), note = m[3] ?? "";
    const rejected = /reject|ไม่ผ่าน|ไม่อนุมัติ/i.test(note), approved = /อนุมัติ|approved|ผ่าน/i.test(note);
    if (!d || (!rejected && !approved)) { errors.push("Review date/decision unresolved for " + c); continue; }
    const decision = rejected ? "REJECTED" as const : /มีเงื่อนไข/.test(note) ? "APPROVED_WITH_CONDITIONS" as const : "APPROVED" as const;
    rounds.push({ cr_number: c, round_no: Number(m[1]), cab_date: d, decision,
      reject_type: rejected ? /Explicit/i.test(note) ? "Explicit" : "Implied" : null,
      is_special_cab: /special cab/i.test(note), session: null });
  }
  const seen = new Map<string, number>();
  for (const r of rounds) {
    const k = r.cab_date ?? "";
    const n = seen.get(k) ?? 0;
    if (rounds.filter((x) => x.cab_date === k).length > 1) r.session = n ? "PM / later review" : "AM / earlier review";
    seen.set(k, n + 1);
  }
  return rounds;
}

export async function parseHistoricalWorkbook(file: File): Promise<ImportPreview> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Only .xlsx workbooks are supported.");
  if (file.size > 5_000_000) throw new Error("Workbook exceeds 5 MB.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const sheets = new Map((await readExcelFile(file) as Sheet[]).map((v) => [v.sheet.trim(), v.data]));
  const errors = REQUIRED_SHEETS.filter((n) => !sheets.has(n)).map((n) => "Missing sheet: " + n);
  if (errors.length) throw new Error(errors.join("; "));
  const rows = (name: string) => sheets.get(name) ?? [];
  const issueRows = records(rows("1_Issue_Level"), ["CR No.", "Category", "Rejected (Y/N)", "Remark ต้นฉบับของประเด็น"], "1_Issue_Level", errors);
  const rejectRows = records(rows("3_Reject_Count"), ["CR No.", "จำนวนครั้ง (รวม)", "วันที่แต่ละครั้ง"], "3_Reject_Count", errors);
  const multiRows = records(rows("4_Multi_Round"), ["CR No.", "จำนวนรอบ", "ผลแต่ละรอบ"], "4_Multi_Round", errors);
  const catRows = records(rows("2_Category_Summary"), ["หมวด", "จำนวนประเด็น"], "2_Category_Summary", errors);
  const flagRows = records(rows("5_DQ_Flags"), ["ประเภท", "Flag", "CR No.", "รายละเอียด"], "5_DQ_Flags", errors);
  const confirmRows = records(rows("6_To_Confirm"), ["CR No.", "ประเด็น", "คำถามที่ต้องถามเจ้าของ CR"], "6_To_Confirm", errors);
  const snapshot_date = rows("README").flat().slice(0, 20).map(dateISO).find((v) => v !== null) ?? "";
  if (!snapshot_date) errors.push("README: analysis date DD/MM/YYYY not found.");

  const issues: HistIssue[] = issueRows.filter((r) => !!str(get(r, "CR No."))).map((r) => {
    const is_rejected = norm(get(r, "Rejected (Y/N)")) === "y";
    const t = str(get(r, "Reject Type"));
    const raw = str(get(r, "Remark ต้นฉบับของประเด็น"));
    const primary_category = category(get(r, "Category"));
    const reject_type = is_rejected && (t === "Explicit" || t === "Implied") ? t : null;
    if (!raw || !primary_category || (is_rejected && !reject_type)) errors.push("Invalid source issue row " + r.source_row);
    const confidence: Confidence = ["High", "Med", "Low"].includes(str(get(r, "Confidence")))
      ? str(get(r, "Confidence")) as Confidence : "Low";
    return { source_row: r.source_row, cr_number: str(get(r, "CR No.")), original_remark: raw,
      primary_category, secondary_category: category(get(r, "Secondary")) || null,
      source_date: dateISO(get(r, "CAB Date")), date_source: str(get(r, "Date Source")),
      confidence, is_rejected, reject_type, is_special_cab: /Special CAB/i.test(str(get(r, "หมายเหตุ"))) };
  });
  if (issues.length > 5000) errors.push("More than 5000 issue rows.");
  const byCr = new Map<string, HistRound[]>();
  for (const r of multiRows) {
    const c = str(get(r, "CR No.")); if (!c || c === "รวม") continue;
    const list = parseRounds(str(get(r, "ผลแต่ละรอบ")), c, errors);
    if (list.length !== number(get(r, "จำนวนรอบ")) || new Set(list.map((x) => x.round_no)).size !== list.length)
      errors.push("Multi-round count mismatch: " + c);
    byCr.set(c, list);
  }
  const expectedReject = new Map<string, "Explicit" | "Implied">();
  let rejectEvents = 0, explicit = 0, implied = 0;
  for (const r of rejectRows) {
    const c = str(get(r, "CR No.")); if (!c || c === "รวม") continue;
    const list = rejectEntries(str(get(r, "วันที่แต่ละครั้ง")));
    const n = number(get(r, "จำนวนครั้ง (รวม)")), e = number(get(r, "Explicit")), i = number(get(r, "Implied"));
    if (list.length !== n || list.filter((x) => x.type === "Explicit").length !== e || list.filter((x) => x.type === "Implied").length !== i || list.some((x) => !x.date))
      errors.push("Reject_Count totals/dates mismatch: " + c);
    rejectEvents += n; explicit += e; implied += i;
    if (!byCr.has(c)) byCr.set(c, list.map((v, j) => ({
      cr_number: c, round_no: j + 1, cab_date: v.date, decision: "REJECTED" as const, reject_type: v.type, session: null,
    })));
    for (const entry of list) {
      const key = c + "|" + entry.date;
      if (expectedReject.has(key)) errors.push("Duplicate reject date for " + c);
      expectedReject.set(key, entry.type);
    }
  }
  const rounds = [...byCr.values()].flat();
  for (const r of rounds.filter((x) => x.decision === "REJECTED")) {
    const k = r.cr_number + "|" + r.cab_date;
    if (expectedReject.get(k) !== r.reject_type) errors.push("Reconstructed CAB round differs from reject sheet: " + k);
  }
  const actualReject = new Set(rounds.filter((x) => x.decision === "REJECTED").map((x) => x.cr_number + "|" + x.cab_date));
  for (const key of expectedReject.keys()) if (!actualReject.has(key)) errors.push("Reject sheet event missing in reconstructed rounds: " + key);

  const flags: ImportFlag[] = [], notes: ImportNote[] = [];
  for (const r of flagRows) {
    const type = str(get(r, "ประเภท")), flag = str(get(r, "Flag")), c = str(get(r, "CR No.")), detail = str(get(r, "รายละเอียด"));
    if (type === "Flag" && /^(F1|F2|F3|F4)$/.test(flag)) {
      if (!c) errors.push("Flag without CR at row " + r.source_row);
      flags.push({ cr_number: c, flag_code: flag as HistFlag["flag_code"], detail, confirmation_status: /ยืนยันแล้ว/.test(detail) ? "confirmed" : "pending" });
    } else notes.push({ sheet_name: "5_DQ_Flags", source_row: r.source_row, cr_reference: c, label: flag || type, detail, status: "observation" });
  }
  for (const r of confirmRows) {
    const label = str(get(r, "ประเด็น"));
    notes.push({ sheet_name: "6_To_Confirm", source_row: r.source_row, cr_reference: str(get(r, "CR No.")),
      label, detail: str(get(r, "คำถามที่ต้องถามเจ้าของ CR")), status: label === "ปิดแล้ว" ? "confirmed" : "pending" });
  }
  const categories = new Map<string, number>();
  for (const r of catRows) {
    const c = category(get(r, "หมวด")); if (!c) continue;
    if (categories.has(c)) errors.push("Duplicate category: " + c);
    categories.set(c, number(get(r, "จำนวนประเด็น")));
  }
  if (categories.size !== 16) errors.push("Expected all A–P category summaries.");
  for (const [c, n] of categories) if (!Number.isInteger(n) || n < 0 || issues.filter((i) => i.primary_category === c).length !== n)
    errors.push("Issue category mismatch: " + c);
  const flagCounts = Object.fromEntries(["F1", "F2", "F3", "F4"].map((key) => [key, flags.filter((f) => f.flag_code === key).length]));
  const expected_counts = {
    analyzedIssueRows: [...categories.values()].reduce((a, b) => a + b, 0),
    rejectedIssueRows: issues.filter((i) => i.is_rejected).length, rejectEvents, explicit, implied,
    multiRoundCrs: [...byCr.values()].filter((v) => v.length > 1).length,
    dqIssues: [..."ABCDEFG"].reduce((a, c) => a + (categories.get(c) ?? 0), 0), flagCounts,
  };
  const analytics = computeAnalytics({ issues, rounds, flags });
  errors.push(...validateSnapshot(analytics, expected_counts));
  if (analytics.dq.issues !== expected_counts.dqIssues || analytics.rejected.explicit !== explicit || analytics.rejected.implied !== implied)
    errors.push("DQ / reject type reconciliation failed.");
  if (multiRows.length !== expected_counts.multiRoundCrs) errors.push("4_Multi_Round distinct-CR count mismatch.");
  for (const k of ["F1", "F2", "F3", "F4"]) if (new Set(flags.filter((v) => v.flag_code === k).map((v) => v.cr_number)).size !== flagCounts[k])
    errors.push("Duplicated CR and flag " + k);
  const warnings = [];
  if (notes.length) warnings.push("Additional observations and confirmation entries preserved: " + notes.length);
  if (analytics.undatedIssues) warnings.push("Date-less issues excluded from monthly trend: " + analytics.undatedIssues);
  return { payload: { source_file: file.name, file_sha256: hash, snapshot_date,
    taxonomy_version: TAXONOMY_VERSION, expected_counts, issues, rounds, flags, notes }, errors: [...new Set(errors)], warnings, analytics };
}
