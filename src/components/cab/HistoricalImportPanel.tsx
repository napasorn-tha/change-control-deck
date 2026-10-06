import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { parseHistoricalWorkbook, type ImportPreview } from "@/lib/historical-import";

const sourcePermission = "I confirm that the CAB owner has approved importing this workbook into this CAB360 prototype, and that it will not be sent to an external AI service.";

export function HistoricalImportPanel() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [working, setWorking] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const qc = useQueryClient();
  const drafts = useQuery({
    queryKey: ["historical-cab", "admin-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hist_datasets")
        .select("id,source_file,snapshot_date,validation_status,published,computed_counts")
        .eq("published", false).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function choose(file: File | undefined) {
    setPreview(null); setAuthorized(false);
    if (!file) return;
    setWorking(true);
    try {
      const found = await parseHistoricalWorkbook(file);
      setPreview(found);
      if (found.errors.length) toast.error("Workbook reconciliation failed. Nothing was imported.");
      else toast.success("Workbook parsed and reconciled locally. No database changes yet.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cannot parse workbook.");
    } finally { setWorking(false); }
  }
  async function importSnapshot() {
    if (!preview || preview.errors.length || !authorized || working) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc("hist_import_snapshot", {
        p: preview.payload as unknown as Json,
      });
      if (error) throw error;
      setSelectedId(data);
      await qc.invalidateQueries({ queryKey: ["historical-cab"] });
      toast.success("Historical snapshot imported and validated. Publication still requires a separate confirmation.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Historical import failed. No partial import should be retained.");
    } finally { setWorking(false); }
  }
  async function publish() {
    if (!selectedId || !authorized || working) return;
    setWorking(true);
    try {
      const { data, error } = await supabase.rpc("hist_publish_snapshot", { p_id: selectedId });
      if (error || !data) throw error ?? new Error("Publication did not complete.");
      toast.success("Validated historical snapshot published to authorized CAB roles.");
      setPreview(null); setAuthorized(false); setSelectedId("");
      await qc.invalidateQueries({ queryKey: ["historical-cab"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cannot publish historical snapshot.");
    } finally { setWorking(false); }
  }
  return <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-card">
    <h2 className="text-base font-semibold">Admin · Historical CAB workbook import</h2>
    <p className="mt-1 text-xs text-muted-foreground">
      Import the final owner-reviewed seven-sheet analysis XLSX. This workflow parses locally, checks category,
      reject-date and multi-round totals, and uses one transaction to store data. Nothing is published automatically.
      Never upload the raw operational register here.
    </p>
    <label className="mt-4 block text-sm font-medium" htmlFor="cab-historical-file">Historical analysis workbook (.xlsx)</label>
    <input id="cab-historical-file" className="mt-2 block w-full max-w-lg rounded-md border border-input bg-background p-2 text-sm"
      type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      disabled={working} onChange={(e) => { void choose(e.target.files?.[0]); }} />
    {working && <p role="status" className="mt-2 text-xs text-muted-foreground">Validating / saving…</p>}
    {preview && <>
      <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
        <div className="rounded bg-surface p-3">Issue rows <strong>{preview.analytics.totalIssues}</strong></div>
        <div className="rounded bg-surface p-3">A–G <strong>{preview.analytics.dq.issues}</strong></div>
        <div className="rounded bg-surface p-3">Reject events <strong>{preview.analytics.rejected.events}</strong></div>
        <div className="rounded bg-surface p-3">Multiple rounds <strong>{preview.analytics.multiRound.count}</strong></div>
      </div>
      {preview.errors.length ? <div role="alert" className="mt-3 rounded border border-destructive p-3 text-sm text-destructive">
        <strong>Import blocked · {preview.errors.length} inconsistencies</strong>
        <ul className="mt-2 list-disc pl-5">{preview.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      </div> : <p className="mt-3 text-sm text-success">All workbook reconciliation checks passed. You may import a private draft.</p>}
      {preview.warnings.map((w) => <p key={w} className="mt-2 text-xs text-muted-foreground">{w}</p>)}
    </>}
    <label className="mt-4 flex items-start gap-2 text-xs">
      <input type="checkbox" className="mt-0.5" checked={authorized}
        onChange={(e) => setAuthorized(e.target.checked)} />
      <span>{sourcePermission}</span>
    </label>
    <button type="button" disabled={!preview || preview.errors.length > 0 || !authorized || working}
      onClick={() => void importSnapshot()}
      className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
      Import validated snapshot privately
    </button>
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Step 2 · Publish an already validated snapshot</h3>
      <p className="mt-1 text-xs text-muted-foreground">Visible only to authorized CAB roles after publication. Select the exact reviewed dataset.</p>
      {drafts.error && <p className="mt-2 text-sm text-destructive">Could not load draft snapshots.</p>}
      <select className="mt-3 w-full max-w-lg rounded-md border border-input bg-background p-2 text-sm"
        value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <option value="">Choose validated private dataset…</option>
        {(drafts.data ?? []).filter((d) => d.validation_status === "passed").map((d) =>
          <option key={d.id} value={d.id}>{d.snapshot_date} · {d.source_file} · validated</option>)}
      </select>
      <button type="button" disabled={!selectedId || !authorized || working} onClick={() => void publish()}
        className="ml-0 mt-3 rounded-md border border-border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:ml-3">
        Publish selected snapshot
      </button>
    </div>
  </section>;
}
