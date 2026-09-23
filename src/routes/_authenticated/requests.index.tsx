import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAllConditions, useRequests } from "@/lib/data";
import { DEVELOPER_ACTION_STATUSES, REVIEW_QUEUE_STATUSES, STATUS_META, type CabStatus } from "@/lib/cab";
import { ErrorState, Loading, PageHeader } from "@/components/cab/primitives";
import { RequestTable } from "@/components/cab/RequestTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Scope = "all" | "mine" | "queue" | "conditions" | "risk" | "history" | "booking" | "actions";
const SCOPES: Scope[] = ["all", "mine", "queue", "conditions", "risk", "history", "booking", "actions"];
const TITLES: Record<Scope, string> = {
  all: "All CAB Requests",
  mine: "My CAB Requests",
  queue: "CAB Review Queue",
  conditions: "Pending Conditions",
  risk: "High Risk Changes",
  history: "Review History",
  booking: "Ready for Deployment Booking",
  actions: "Rework / Actions Required",
};

export const Route = createFileRoute("/_authenticated/requests/")({
  validateSearch: (s: Record<string, unknown>): { scope?: Scope | undefined } => ({
    scope: SCOPES.includes(s["scope"] as Scope) ? (s["scope"] as Scope) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "CAB Requests — CAB360" },
      { name: "description", content: "Browse and filter change advisory board requests." },
      { property: "og:title", content: "CAB Requests — CAB360" },
      { property: "og:description", content: "Browse and filter change advisory board requests." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { scope = "all" } = Route.useSearch();
  const { user, role } = useAuth();
  const { data, isLoading, error } = useRequests();
  const conds = useAllConditions();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    let r = data ?? [];
    const s = (st: CabStatus[]) => r.filter((x) => st.includes(x.status as CabStatus));
    if (scope === "mine") r = r.filter((x) => x.developer_id === user?.id);
    if (scope === "queue") r = s(REVIEW_QUEUE_STATUSES);
    if (scope === "conditions") r = s(["PASSED_WITH_CONDITIONS", "CONDITIONS_VERIFICATION"]);
    if (scope === "risk") r = r.filter((x) => x.risk_level === "high" || x.risk_level === "critical");
    if (scope === "history") r = r.filter((x) => x.reviewed_at);
    if (scope === "booking") r = s(["PASSED"]);
    if (scope === "actions")
      r = s(DEVELOPER_ACTION_STATUSES).filter((x) => !user || x.developer_id === user.id || role !== "developer");
    if (status) r = r.filter((x) => x.status === status);
    if (q) {
      const t = q.toLowerCase();
      r = r.filter((x) =>
        [x.request_code, x.topic, x.project_code, x.project_name, x.developer_name]
          .join(" ")
          .toLowerCase()
          .includes(t),
      );
    }
    return r;
  }, [data, scope, q, status, user, role]);

  const openConds = (conds.data ?? []).filter((c) => c.status !== "verified").length;

  return (
    <div>
      <PageHeader
        title={TITLES[scope]}
        subtitle={scope === "conditions" ? `${openConds} condition(s) not yet verified` : `${rows.length} request(s)`}
        actions={
          <Button asChild>
            <Link to="/requests/new"><PlusCircle className="mr-1.5 h-4 w-4" />New request</Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search code, topic, project…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      {isLoading ? <Loading /> : error ? <ErrorState error={error} /> : <RequestTable rows={rows} />}
    </div>
  );
}
