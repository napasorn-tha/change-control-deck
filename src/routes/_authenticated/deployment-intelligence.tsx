import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, GitBranch, LifeBuoy, Rocket } from "lucide-react";
import { Empty, ErrorState, Loading, PageHeader, Pill } from "@/components/cab/primitives";
import { useDeploymentIntelligence } from "@/lib/data";
import { DEPLOYMENT_CATEGORIES } from "@/lib/deployment-intelligence";

export const Route = createFileRoute("/_authenticated/deployment-intelligence")({
  head: () => ({
    meta: [
      { title: "Deployment Intelligence — CAB360" },
      { name: "description", content: "Closed-loop deployment issue, resolution and service-request intelligence." },
    ],
  }),
  component: DeploymentIntelligencePage,
});

function DeploymentIntelligencePage() {
  const query = useDeploymentIntelligence();
  if (query.isLoading) return <Loading label="Loading deployment intelligence…" />;
  if (query.error) return <ErrorState error={query.error} />;
  const deployments = query.data?.deployments ?? [];
  const issues = query.data?.issues ?? [];
  const serviceRequests = query.data?.serviceRequests ?? [];
  const deploymentsWithIssues = new Set(issues.map((i) => i.deployment_id)).size;
  const openResolutions = issues.filter((i) => i.resolution_status !== "resolved").length;
  const followUp = serviceRequests.filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED").length;
  const outcomes = {
    partial: deployments.filter((d) => d.outcome === "PARTIAL_SUCCESS").length,
    failed: deployments.filter((d) => d.outcome === "FAILED").length,
    rollback: deployments.filter((d) => d.outcome === "ROLLBACK").length,
  };
  const categoryCounts = DEPLOYMENT_CATEGORIES.map((c) => ({
    ...c,
    count: issues.filter((i) => i.category_code === c.code).length,
  })).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...categoryCounts.map((x) => x.count));

  return <div className="space-y-5">
    <PageHeader
      title="Deployment Intelligence"
      subtitle="Post-CAB learning loop: deployment outcome → issue → resolution → service request. DEP-A…DEP-G is a separate taxonomy from CAB-A…CAB-P."
    />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Deployments", deployments.length, "All tracked attempts"],
        ["With Issues", deploymentsWithIssues, "Unique deployment attempts"],
        ["Partial / Failed / Rollback", outcomes.partial + outcomes.failed + outcomes.rollback, outcomes.partial + " partial · " + outcomes.failed + " failed · " + outcomes.rollback + " rollback"],
        ["Open Resolution", openResolutions, "Open or follow-up DEP issues"],
        ["Follow-up SR", followUp, "Open / in-progress post-deploy requests"],
      ].map(([label, value, detail]) => <div key={String(label)} className="rounded-lg border border-border bg-card p-4 shadow-card">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>)}
    </section>

    {issues.length === 0 ? <Empty
      title="No deployment issues recorded yet"
      body="The model is ready. Record an issue from a CAB request’s Deployment section; successful deployments can still carry issues and follow-up actions."
    /> : <>
      <section className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">DEP issue categories</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Counts are issue rows, not failed deployments. One deployment may contain multiple categories.</p>
        <div className="mt-4 space-y-3">{categoryCounts.map((c) => <div key={c.code} className="grid grid-cols-[86px_minmax(0,1fr)_40px] items-center gap-3 text-sm">
          <span className="font-mono text-xs font-semibold">DEP-{c.code}</span>
          <div>
            <div className="flex justify-between gap-3"><span>{c.name}</span><span className="text-xs text-muted-foreground">{c.description}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: String((c.count / max) * 100) + "%" }} /></div>
          </div>
          <span className="text-right font-mono">{c.count}</span>
        </div>)}</div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Issue → Resolution ledger</h2></div>
          <p className="mt-1 text-xs text-muted-foreground">Deployment issues are intentionally separate from Incidents: a Success outcome can still contain resolved or follow-up quality issues.</p>
        </div>
        <div className="divide-y divide-border">
          {issues.slice(0, 50).map((i) => <div key={i.id} className="grid gap-3 px-5 py-4 md:grid-cols-[150px_minmax(0,1fr)_200px]">
            <div>
              <Pill tone={i.resolution_status === "resolved" ? "success" : i.resolution_status === "follow_up" ? "warning" : "danger"}>{i.resolution_status}</Pill>
              <p className="mt-2 font-mono text-xs">DEP-{i.category_code}</p>
              <Link to="/requests/$id" params={{ id: i.request_id }} className="mt-1 block text-xs text-primary hover:underline">
                {i.cab_requests?.request_code ?? "Open CAB request"}
              </Link>
            </div>
            <div className="text-sm">
              <p className="font-medium">{i.issue_text}</p>
              {i.root_cause && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Root cause:</span> {i.root_cause}</p>}
              <p className="mt-1 text-xs"><span className="font-medium">Resolution:</span> {i.resolution || "Not recorded"}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Attempt {i.deployments?.attempt ?? "—"}</p>
              <p>Outcome {i.deployments?.outcome ?? i.deployments?.status ?? "—"}</p>
              <p>{i.cab_requests?.topic ?? "—"}</p>
            </div>
          </div>)}
        </div>
      </section>
    </>}

    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Post-deploy Service Requests</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Patch Data, Update Config and Reprocess/Rerun are linked to the originating CAB/deployment instead of becoming disconnected notes.</p>
      </div>
      {serviceRequests.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No linked post-deploy SR yet.</p> :
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr>
          <th className="px-5 py-3">CAB</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Objective</th><th className="px-4 py-3">Environment</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th>
        </tr></thead>
        <tbody>{serviceRequests.map((s) => <tr key={s.id} className="border-t border-border">
          <td className="px-5 py-3"><Link to="/requests/$id" params={{ id: s.request_id }} className="text-primary hover:underline">{s.cab_requests?.request_code ?? "Open"}</Link></td>
          <td className="px-4 py-3 font-mono text-xs">{s.request_type}</td>
          <td className="max-w-md px-4 py-3">{s.objective}</td>
          <td className="px-4 py-3">{s.environment}</td>
          <td className="px-4 py-3">{s.priority}</td>
          <td className="px-4 py-3"><Pill tone={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "teal" : "warning"}>{s.status}</Pill></td>
        </tr>)}</tbody>
      </table></div>}
    </section>

    <section className="rounded-lg border border-border bg-card p-5 text-sm shadow-card">
      <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /><h2 className="font-semibold">Closed-loop interpretation</h2></div>
      <p className="mt-2 text-muted-foreground">
        CAB findings and DEP issues are deliberately different. Future Pre-CAB AI can use DEP category frequencies and resolved patterns as advisory history, while deterministic standards remain the source of truth for rules such as data types. Historical frequencies never auto-approve or auto-reject a change.
      </p>
    </section>
  </div>;
}
