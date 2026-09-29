import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import { AlertTriangle, Archive, FileLock2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHistoricalSnapshot } from "@/lib/historical-data";
import { HistoricalImportPanel } from "@/components/cab/HistoricalImportPanel";
import { GROUP_LABEL, TAXONOMY, type GroupCode } from "@/lib/historical";

export const Route = createFileRoute("/_authenticated/historical")({
  head: () => ({
    meta: [
      { title: "Historical CAB Intelligence — CAB360" },
      { name: "description", content: "Validated, versioned historical CAB remark analysis." },
    ],
  }),
  component: HistoricalPage,
});

const GROUP_ORDER: GroupCode[] = ["DATA_QUALITY", "CAB_PROCESS", "DEPLOYMENT", "OTHER"];
const GROUP_COLORS: Record<GroupCode, string> = {
  DATA_QUALITY: "#2a78d6", CAB_PROCESS: "#eb6834",
  DEPLOYMENT: "#1baf7a", OTHER: "#8b8d87",
};
const MONTH_COLORS = [
  { key: "A", label: "Data type", fill: "#eda100" },
  { key: "B", label: "Naming", fill: "#4a3aa7" },
  { key: "C", label: "Data design", fill: "#e87ba4" },
  { key: "E", label: "Impact", fill: "#008300" },
  { key: "DFG", label: "Other D/F/G", fill: "#5598e7" },
] as const;

function Panel({ title, subtitle, children, table }: {
  title: string; subtitle: string; children: React.ReactNode; table?: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {table && (
          <button type="button" className="rounded-md border border-border px-3 py-2 text-xs hover:bg-surface"
            aria-expanded={showTable} onClick={() => setShowTable(!showTable)}>
            {showTable ? "Hide table" : "View table / ดูเป็นตาราง"}
          </button>
        )}
      </div>
      {children}
      {showTable && table && <div className="mt-4 overflow-x-auto border-t border-border pt-3">{table}</div>}
    </section>
  );
}

function SummaryCard({ label, value, detail, danger = false }: {
  label: string; value: number | string; detail: string; danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"mt-2 text-3xl font-semibold tabular-nums " + (danger ? "text-destructive" : "")}>{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function HistoricalPage() {
  // Demo role switching must not grant access: actual Supabase role + database RLS decide.
  const { actualRole } = useAuth();
  const canView = actualRole === "admin" || actualRole === "executive" ||
    actualRole === "cab_reviewer" || actualRole === "deployment_coordinator";
  const query = useHistoricalSnapshot(canView);

  if (!canView) return (
    <div className="max-w-xl rounded-lg border border-border bg-card p-6">
      <FileLock2 className="mb-3 h-6 w-6 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Historical CAB Intelligence</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Access is available to authorized CAB reviewers, deployment coordinators, executives and administrators only.
      </p>
    </div>
  );
  if (query.isPending) return <div role="status" className="p-6 text-sm text-muted-foreground">Loading historical snapshot…</div>;
  if (query.error) return (
    <div role="alert" className="rounded-lg border border-destructive p-5 text-sm text-destructive">
      Historical data could not be loaded. Check authorization and data connectivity.
    </div>
  );

  const result = query.data;
  const header = (
    <header className="mb-6">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        <Archive className="h-4 w-4" /> CAB360 / Control Tower
        <span className="rounded-full border border-border px-2 py-1">HISTORICAL · IMPORTED SNAPSHOT</span>
      </div>
      <h1 className="text-2xl font-semibold">Historical CAB Intelligence</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Historical issue-level findings, review-round outcomes and deployment records are distinct.
        These figures do not represent live operational CAB KPIs.
      </p>
    </header>
  );

  if (!result) return (
    <div>
      {header}
      <section className="rounded-lg border border-dashed border-border bg-card p-8">
        <ShieldCheck className="mb-3 h-7 w-7 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No published historical snapshot</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          This screen intentionally shows no demonstration numbers. An authorized administrator must
          validate a source workbook and publish an approved snapshot before historical analytics are shown.
          No company records are embedded in the public app.
        </p>
        {actualRole === "admin" && <HistoricalImportPanel />}
      </section>
    </div>
  );

  const { dataset, analytics: a, validationErrors } = result;
  if (validationErrors.length) return (
    <div>
      {header}
      <section role="alert" className="rounded-lg border border-destructive bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle className="h-5 w-5" /> Snapshot reconciliation failed
        </h2>
        <p className="mt-2 text-sm">The dataset is withheld until an administrator resolves these discrepancies.</p>
        <ul className="mt-3 list-disc pl-5 text-sm">{validationErrors.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
    </div>
  );

  const groupTotal = a.totalIssues || 1;
  const maxCat = Math.max(1, ...a.byCategory.map((c) => c.count));
  const maxCause = Math.max(1, ...a.rejected.causes.map((c) => c.count));
  const monthRows = a.monthly.map((r) => ({ ...r, total: r.A + r.B + r.C + r.E + r.DFG }));
  const fmtPct = (n: number) => (100 * n).toFixed(1) + "%";
  return (
    <div className="pb-8">
      {header}
      <div className="mb-4 text-xs text-muted-foreground">
        Source: {dataset.source_file} · As-of snapshot: {dataset.snapshot_date} ·
        Taxonomy: {dataset.taxonomy_version} · Validated historical import (not live)
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Issues / CR with remarks" value={a.totalIssues} detail={a.totalCrs + " unique CR · one row = one issue"} />
        <SummaryCard label="Data Quality · A–G" value={a.dq.issues} detail={a.dq.crs + " CR · " + fmtPct(a.dq.share) + " of all issue rows"} />
        <SummaryCard label="CAB reject events · unique CR + date" value={a.rejected.events}
          detail={a.rejected.crs + " CR · Explicit " + a.rejected.explicit + " / Implied " + a.rejected.implied} danger />
        <SummaryCard label="CR with multiple CAB rounds" value={a.multiRound.count}
          detail={a.multiRound.threePlus + " CR had at least 3 rounds"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="1 · What issue categories recur?"
          subtitle="Issue-level count, grouped by taxonomy. Category O includes scheduling/status notes, not necessarily defects."
          table={<table className="w-full text-left text-sm">
            <thead><tr className="border-b border-border"><th className="py-2">Category</th><th className="py-2 text-right">Issues</th><th className="py-2 text-right">% of all</th></tr></thead>
            <tbody>{a.byCategory.map((c) => <tr key={c.code} className="border-b border-border">
              <td className="py-1.5">{c.code} · {c.name}</td><td className="text-right tabular-nums">{c.count}</td><td className="text-right">{fmtPct(c.count / groupTotal)}</td>
            </tr>)}
            <tr className="font-semibold"><td className="py-2">Total</td><td className="text-right">{a.totalIssues}</td><td className="text-right">100%</td></tr></tbody>
          </table>}>
          <div className="space-y-5">
            {GROUP_ORDER.map((g) => {
              const total = a.groups.find((v) => v.group === g)?.count ?? 0;
              const rows = a.byCategory.filter((c) => c.group === g).sort((x, y) => y.count - x.count);
              return <div key={g}>
                <p className="mb-2 text-xs font-semibold">{GROUP_LABEL[g]} · {total} ({fmtPct(total / groupTotal)})</p>
                <div className="space-y-2">{rows.map((c) => <div key={c.code} className="grid grid-cols-[minmax(0,135px)_minmax(0,1fr)_40px] items-center gap-2 text-xs">
                  <span title={c.name} className="truncate">{c.code} · {c.name}</span>
                  <div className="h-3 rounded-full bg-secondary" role="img" aria-label={c.name + ": " + c.count + " issues"}>
                    <div className="h-3 rounded-full" style={{ width: (100 * c.count / maxCat) + "%", backgroundColor: GROUP_COLORS[g] }} />
                  </div>
                  <span className="text-right tabular-nums">{c.count}</span>
                </div>)}</div>
              </div>;
            })}
          </div>
        </Panel>

        <Panel title="2 · Data Quality issues over time"
          subtitle="A–G only · CAB source-date month · date-less findings excluded from the chart"
          table={<table className="w-full text-left text-sm">
            <thead><tr className="border-b border-border">{["Month","A","B","C","E","D/F/G","Total"].map((x) => <th key={x} className="py-2 pr-3">{x}</th>)}</tr></thead>
            <tbody>{monthRows.map((m) => <tr key={m.month} className="border-b border-border">
              {[m.label,m.A,m.B,m.C,m.E,m.DFG,m.total].map((v,i) => <td key={i} className="py-2 pr-3 tabular-nums">{v}</td>)}
            </tr>)}
              <tr className="font-semibold"><td>Total dated</td>
                {(["A","B","C","E","DFG","total"] as const).map((key) => <td key={key} className="py-2 pr-3">{monthRows.reduce((n,r) => n + r[key],0)}</td>)}
              </tr>
              <tr><td colSpan={7} className="py-2 text-muted-foreground">Undated A–G issues: {a.dq.undated}. Dated + undated = {a.dq.issues}.</td></tr>
            </tbody>
          </table>}>
          {monthRows.length ? <>
            <div className="h-64 w-full text-xs" aria-label="Monthly stacked bar chart for data-quality issues; an accessible table is available">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthRows} margin={{ left: 0, right: 8, bottom: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" interval={0} angle={-35} textAnchor="end" height={52} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }} />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 10 }} />
                  {MONTH_COLORS.map((c) => <Bar key={c.key} dataKey={c.key} name={c.label} stackId="DQ" fill={c.fill} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Undated A–G issues: {a.dq.undated}; all undated issue types: {a.undatedIssues}. The most recent month may be incomplete.</p>
          </> : <p className="text-sm text-muted-foreground">No dated Data Quality issues in this snapshot.</p>}
        </Panel>

        <Panel title="3 · Why did CAB reject?"
          subtitle={"Counted as rejected ISSUE rows (" + a.rejected.issueRows + "), not rejection EVENTS (" + a.rejected.events + "). One rejected review can list multiple causes."}
          table={<table className="w-full text-left text-sm">
            <thead><tr className="border-b border-border"><th className="py-2">Cause</th><th className="py-2 text-right">Issue rows</th></tr></thead>
            <tbody>{a.rejected.causes.map((c) => <tr key={c.code} className="border-b border-border">
              <td className="py-2">{c.code} · {c.name}</td><td className="text-right">{c.count}</td></tr>)}
              <tr className="font-semibold"><td className="py-2">Total rejected issue rows</td><td className="text-right">{a.rejected.issueRows}</td></tr>
            </tbody>
          </table>}>
          <div className="space-y-3">{a.rejected.causes.map((c) => (
            <div className="grid grid-cols-[minmax(0,145px)_minmax(0,1fr)_35px] items-center gap-2 text-xs" key={c.code}>
              <span title={c.name} className="truncate">{c.code} · {c.name}</span>
              <div className="h-3 rounded-full bg-secondary" role="img" aria-label={c.name + ": " + c.count + " rejected issue rows"}>
                <div className="h-3 rounded-full bg-destructive" style={{ width: (c.count / maxCause * 100) + "%" }} />
              </div>
              <span className="text-right">{c.count}</span>
            </div>
          ))}</div>
          {!a.rejected.causes.length && <p className="text-sm text-muted-foreground">No rejected issue rows.</p>}
        </Panel>

        <Panel title="3 · CR returning for multiple CAB rounds"
          subtitle="A same-day morning rejection and afternoon approval are two review rounds but one rejected (CR, date) event."
          table={<table className="w-full text-left text-sm"><thead><tr className="border-b border-border">
            <th className="py-2">CR</th><th className="py-2">Rounds</th><th className="py-2">Decisions</th>
          </tr></thead><tbody>{a.multiRound.list.map((r) => <tr key={r.cr} className="border-b border-border">
            <td className="py-2 font-mono">{r.cr}</td><td>{r.count}</td>
            <td>{r.rounds.map((v) => "R" + v.round_no + " " + (v.cab_date ?? "undated") + " " + (v.session ?? "") + " " + v.decision).join(" · ")}</td>
          </tr>)}</tbody></table>}>
          {a.multiRound.list.length ? <div className="flex flex-wrap gap-2">
            {a.multiRound.list.map((r) => <details key={r.cr} className="min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-xs">
              <summary className="cursor-pointer font-mono font-medium">{r.cr} ×{r.count}{r.sameDay ? " · same-day" : ""}</summary>
              <ol className="mt-2 space-y-1 text-muted-foreground">{r.rounds.map((v) =>
                <li key={v.round_no}>R{v.round_no}: {v.cab_date ?? "date unconfirmed"} {v.session ?? ""} · {v.decision}{v.is_special_cab ? " · Special CAB" : ""}</li>)}</ol>
            </details>)}
          </div> : <p className="text-sm text-muted-foreground">No repeat review rounds recorded.</p>}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Source data-quality checks · F1–F4" subtitle="Flags document data recording exceptions, not automatic modifications to the source.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["F1","F2","F3","F4"] as const).map((key) => <div key={key} className="rounded-md bg-surface p-3">
              <p className="text-xs text-muted-foreground">{key}</p><p className="text-xl font-semibold">{a.flags.counts[key]}</p>
            </div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            F1: Remark/CAB date mismatch · F2: stale Open status despite elapsed deploy date ·
            F3: tentative deployment text after Success · F4: rejection reason absent.
            Pending owner confirmation: {a.flags.pending}.
          </p>
        </Panel>
        <Panel title="Methodology & limitations" subtitle="Published source snapshot, deterministic counts and human-confirmed corrections.">
          <ul className="list-disc space-y-2 pl-5 text-xs text-muted-foreground">
            <li>Source: {dataset.source_file}; as of {dataset.snapshot_date}; taxonomy {dataset.taxonomy_version}.</li>
            <li>Reject events count distinct (CR, CAB date). Rejected issue rows may exceed review events.</li>
            <li>Explicit/Implied classification follows the original remark's wording; human confirmation changes confidence without rewriting original text.</li>
            <li>Undated issues ({a.undatedIssues}) are excluded from monthly charts, not from overall KPIs.</li>
            <li>Category O has {a.categoryOCount} administrative deployment-plan/time items; it is not a defect count.</li>
            <li>Apparent trend changes can reflect CAB review detail and source coverage, not necessarily deterioration in quality.</li>
            <li>Latest month may be incomplete. Historical figures are never merged into live throughput or risk-score metrics.</li>
          </ul>
        </Panel>
      </div>
      {actualRole === "admin" && <HistoricalImportPanel />}
    </div>
  );
}
