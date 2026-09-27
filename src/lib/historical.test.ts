import { describe, expect, it } from "vitest";
import {
  classifyRejectWording,
  computeAnalytics,
  missingSheets,
  REQUIRED_SHEETS,
  thaiMonthLabel,
  validateSnapshot,
  type Snapshot,
} from "./historical";

// SYNTHETIC fixtures only — no real CR numbers, remarks or names.
const fx: Snapshot = {
  issues: [
    // CR-X1: conditional approval, then failed deploy -> NOT a CAB rejection
    { source_row: 1, cr_number: "X1", original_remark: "approved with condition: add index", primary_category: "C", source_date: "2025-01-10", confidence: "High", is_rejected: false },
    { source_row: 2, cr_number: "X1", original_remark: "deploy failed, config missing", primary_category: "K", source_date: "2025-01-15", confidence: "High", is_rejected: false },
    // CR-X2: explicit reject with two issues in the same rejected round
    { source_row: 3, cr_number: "X2", original_remark: "ไม่ผ่าน data type wrong", primary_category: "A", source_date: "2025-03-05", confidence: "High", is_rejected: true, reject_type: "Explicit" },
    { source_row: 4, cr_number: "X2", original_remark: "ไม่ผ่าน naming", primary_category: "B", source_date: "2025-03-05", confidence: "High", is_rejected: true, reject_type: "Explicit" },
    // CR-X3: implied reject (Pending wording, owner-confirmed), same-day AM reject + PM approve
    { source_row: 5, cr_number: "X3", original_remark: "Pending - fix lineage", primary_category: "E", source_date: "2025-03-20", confidence: "High", is_rejected: true, reject_type: "Implied" },
    // CR-X4: special CAB, date-less issue
    { source_row: 6, cr_number: "X4", original_remark: "Special CAB approval", primary_category: "L", source_date: null, confidence: "Low", is_rejected: false, is_special_cab: true },
    { source_row: 7, cr_number: "X4", original_remark: "QA evidence missing", primary_category: "F", source_date: null, confidence: "Med", is_rejected: false },
  ],
  rounds: [
    { cr_number: "X1", round_no: 1, cab_date: "2025-01-10", decision: "APPROVED_WITH_CONDITIONS" },
    { cr_number: "X2", round_no: 1, cab_date: "2025-03-05", decision: "REJECTED", reject_type: "Explicit" },
    { cr_number: "X2", round_no: 2, cab_date: "2025-03-12", decision: "REJECTED", reject_type: "Implied" },
    { cr_number: "X2", round_no: 3, cab_date: "2025-03-19", decision: "APPROVED" },
    { cr_number: "X3", round_no: 1, cab_date: "2025-03-20", session: "AM", decision: "REJECTED", reject_type: "Implied" },
    { cr_number: "X3", round_no: 2, cab_date: "2025-03-20", session: "PM", decision: "APPROVED" },
    { cr_number: "X4", round_no: 1, cab_date: null, decision: "SPECIAL_APPROVAL", is_special_cab: true },
  ],
  deployments: [
    { cr_number: "X1", attempt_no: 1, deploy_date: "2025-01-15", outcome: "FAILED" },
    { cr_number: "X1", attempt_no: 2, deploy_date: "2025-01-22", outcome: "SUCCESS" },
  ],
  flags: [{ cr_number: "X2", flag_code: "F1" }, { cr_number: "X3", flag_code: "F3", confirmation_status: "confirmed" }],
};

describe("historical analytics", () => {
  const a = computeAnalytics(fx);

  it("counts issues and CRs", () => {
    expect(a.totalIssues).toBe(7);
    expect(a.totalCrs).toBe(4);
  });
  it("conditional approval + failed deploy is not a rejection", () => {
    expect(a.rejected.causes.find((c) => c.code === "K")).toBeUndefined();
    expect(a.rejected.events).toBe(3);
  });
  it("reject events are distinct (CR,date) and split explicit/implied", () => {
    expect(a.rejected.explicit).toBe(1);
    expect(a.rejected.implied).toBe(2);
    expect(a.rejected.crs).toBe(2);
  });
  it("rejected issue rows can exceed reject events for a round", () => {
    expect(a.rejected.issueRows).toBe(3);
    expect(a.rejected.causes.map((c) => c.code).sort()).toEqual(["A", "B", "E"]);
  });
  it("same-day reject then approve is two rounds, one event", () => {
    const x3 = a.multiRound.list.find((m) => m.cr === "X3")!;
    expect(x3.count).toBe(2);
    expect(x3.sameDay).toBe(true);
    expect(a.multiRound.threePlus).toBe(1);
  });
  it("monthly DQ includes zero months and undated DQ", () => {
    expect(a.monthly.map((m) => m.month)).toEqual(["2025-01", "2025-02", "2025-03"]);
    expect(a.monthly[1]).toMatchObject({ A: 0, B: 0, C: 0, E: 0, DFG: 0 });
    expect(a.dq.undated).toBe(1);
    expect(a.undatedIssues).toBe(2);
  });
  it("validation passes on consistent data and fails on mismatched expected counts", () => {
    expect(validateSnapshot(a, { analyzedIssueRows: 7, rejectEvents: 3 })).toEqual([]);
    expect(validateSnapshot(a, { rejectEvents: 4 }).length).toBe(1);
  });

  it("blocks publication when a rejected review has no verified CAB date", () => {
    const undated: Snapshot = {
      ...fx,
      rounds: [...fx.rounds, { cr_number: "X5", round_no: 1, cab_date: null,
        decision: "REJECTED", reject_type: "Implied" }],
    };
    const result = computeAnalytics(undated);
    expect(result.rejected.events).toBe(3);
    expect(result.rejected.undatedRounds).toBe(1);
    expect(validateSnapshot(result).some((error) => error.includes("lack verified dates"))).toBe(true);
  });

  it("includes zero-DQ months at the start of a snapshot when CAB issue activity exists", () => {
    const extra: Snapshot = {
      ...fx,
      issues: [...fx.issues, { source_row: 10, cr_number: "X0",
        original_remark: "approved administrative note", primary_category: "O",
        source_date: "2024-12-15", confidence: "High", is_rejected: false }],
    };
    const result = computeAnalytics(extra);
    expect(result.monthly[0]).toMatchObject({
      month: "2024-12", A: 0, B: 0, C: 0, E: 0, DFG: 0,
    });
  });

  it("unknown category fails validation", () => {
    const b = computeAnalytics({ ...fx, issues: [...fx.issues, { ...fx.issues[0], source_row: 99, primary_category: "Z" }] });
    expect(validateSnapshot(b).length).toBeGreaterThan(0);
  });
  it("explicit wording detection", () => {
    expect(classifyRejectWording("ไม่อนุมัติ")).toBe("Explicit");
    expect(classifyRejectWording("Pending owner")).toBe("Implied");
  });
  it("Thai BE month label and sheet check", () => {
    expect(thaiMonthLabel("2026-09")).toBe("ก.ย. 69");
    expect(missingSheets(REQUIRED_SHEETS)).toEqual([]);
    expect(missingSheets(["README"]).length).toBe(6);
  });
});
