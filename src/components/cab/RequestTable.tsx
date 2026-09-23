import { Link } from "@tanstack/react-router";
import type { CabRequest } from "@/lib/data";
import { CHANGE_TYPES, fmtDate } from "@/lib/cab";
import { Empty, ProgressBar, RiskPill, StatusPill } from "@/components/cab/primitives";

export function RequestTable({ rows, empty = "No CAB requests" }: { rows: CabRequest[]; empty?: string }) {
  if (!rows.length) return <Empty title={empty} />;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5">Request</th>
            <th className="px-4 py-2.5">Project</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Risk</th>
            <th className="px-4 py-2.5 w-32">Readiness</th>
            <th className="px-4 py-2.5">Target deploy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border hover:bg-surface">
              <td className="px-4 py-3">
                <Link to="/requests/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">
                  {r.request_code}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">{r.topic}</p>
              </td>
              <td className="px-4 py-3">{r.project_code}</td>
              <td className="px-4 py-3">
                {CHANGE_TYPES.find((c) => c.value === r.change_type)?.label ?? r.change_type}
              </td>
              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
              <td className="px-4 py-3"><RiskPill level={r.risk_level} score={r.risk_score} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar value={r.readiness_score} tone={r.readiness_score >= 100 ? "success" : "warning"} />
                  <span className="text-xs tabular">{r.readiness_score}%</span>
                </div>
              </td>
              <td className="px-4 py-3">{fmtDate(r.target_deploy_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
