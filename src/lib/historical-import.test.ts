import { describe, expect, it, vi } from "vitest";
import readExcelFile from "read-excel-file/browser";
import { parseHistoricalWorkbook } from "./historical-import";

vi.mock("read-excel-file/browser", () => ({ default: vi.fn() }));
const mockRead = vi.mocked(readExcelFile);
function fixture() {
  const issue = [
    ["CR No.", "Category", "Rejected (Y/N)", "Remark ต้นฉบับของประเด็น", "Reject Type", "CAB Date", "Confidence", "Date Source"],
    ["CR-TEST-001", "A. Data type", "Y", "ไม่ผ่าน data type", "Explicit", "01/09/2026", "High", "Remark (#n)"],
    ["CR-TEST-002", "O. Deploy plan/time", "N", "Tentative deploy", "-", "", "Med", "N/A"],
  ];
  const category: Array<Array<string | number>> = [["หมวด", "จำนวนประเด็น"]];
  for (const c of "ABCDEFGHIJKLMNOP") category.push([c + ". Demo category", c === "A" || c === "O" ? 1 : 0]);
  return [
    { sheet: "README", data: [["วันที่อ้างอิงการวิเคราะห์"], ["26/09/2026"]] },
    { sheet: "1_Issue_Level", data: issue },
    { sheet: "2_Category_Summary", data: category },
    { sheet: "3_Reject_Count", data: [
      ["CR No.", "จำนวนครั้ง (รวม)", "Explicit", "Implied", "วันที่แต่ละครั้ง"],
      ["CR-TEST-001", 1, 1, 0, "01/09/2026 (E)"],
    ] },
    { sheet: "4_Multi_Round", data: [
      ["CR No.", "จำนวนรอบ", "ผลแต่ละรอบ"],
      ["CR-TEST-001", 2, "R1 01/09/2026: Reject Explicit | R2 02/09/2026: อนุมัติ"],
    ] },
    { sheet: "5_DQ_Flags", data: [
      ["ประเภท", "Flag", "CR No.", "รายละเอียด"],
      ["Flag", "F1", "CR-TEST-001", "Review date mismatch"],
      ["ข้อสังเกต", "notes", "CR-TEST-002", "Preserve observation"],
    ] },
    { sheet: "6_To_Confirm", data: [
      ["CR No.", "ประเด็น", "คำถามที่ต้องถามเจ้าของ CR"],
      ["CR-TEST-002", "ปิดแล้ว", "Confirmed by test owner"],
    ] },
  ];
}
describe("seven-sheet import with synthetic only", () => {
  it("previews reconciled counts, provenance and observations without committing", async () => {
    mockRead.mockResolvedValue(fixture() as never);
    const f = new File(["example"], "synthetic.xlsx");
    const p = await parseHistoricalWorkbook(f);
    expect(p.errors).toEqual([]);
    expect(p.analytics.totalIssues).toBe(2);
    expect(p.analytics.rejected.events).toBe(1);
    expect(p.analytics.multiRound.count).toBe(1);
    expect(p.payload.notes).toHaveLength(2);
    expect(p.payload.snapshot_date).toBe("2026-09-26");
  });
  it("blocks mismatched category summary", async () => {
    const bad = fixture();
    const categories = bad.find((s) => s.sheet === "2_Category_Summary")!;
    categories.data[1]![1] = 2;
    mockRead.mockResolvedValue(bad as never);
    const p = await parseHistoricalWorkbook(new File(["example"], "invalid.xlsx"));
    expect(p.errors.some((x) => x.includes("category"))).toBe(true);
  });
  it("blocks unsupported workbook names", async () => {
    await expect(parseHistoricalWorkbook(new File(["sample"], "source.xls"))).rejects.toThrow(".xlsx");
  });
});
