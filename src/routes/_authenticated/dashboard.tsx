import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  GaugeCircle,
  Rocket,
  ShieldAlert,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import {
  useAllConditions,
  useAllDocuments,
  useControlTower,
  useDeployments,
  useRequests,
  type CabRequest,
} from "@/lib/data";
import {
  DEVELOPER_ACTION_STATUSES,
  REVIEW_QUEUE_STATUSES,
  fmtDate,
  type AppRole,
  type CabStatus,
} from "@/lib/cab";
import { ErrorState, Loading, PageHeader, Pill, RiskPill, StatusPill } from "@/components/cab/primitives";
import { RequestTable } from "@/components/cab/RequestTable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CAB360" },
      { name: "description", content: "Your CAB360 overview of change requests and deployments." },
      { property: "og:title", content: "Dashboard — CAB360" },
      { property: "og:description", content: "Your CAB360 overview of change requests and deployments." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { role, user, profile } = useAuth();
  const requests = useRequests();
  const documents = useAllDocuments();
  const conditions = useAllConditions();
  const deployments = useDeployments();
  const controlTower = useControlTower();

  if (requests.isLoading || documents.isLoading || conditions.isLoading || deployments.isLoading) {
    return <Loading label="Loading dashboard…" />;
  }
  const error = requests.error || documents.error || conditions.error || deployments.error;
  if (error) return <ErrorState error={error} />;

  const allRequests = requests.data ?? [];
  if (role === "executive" || role === "admin") {
    return (
      <ExecutiveDashboard
        requests={allRequests}
        analytics={controlTower.data}
        loading={controlTower.isLoading}
        error={controlTower.error}
      />
    );
  }
  if (role === "cab_reviewer") {
    return <ReviewerDashboard requests={allRequests} openConditions={(conditions.data ?? []).filter((item) => item.status !== "verified").length} />;
  }
  if (role === "deployment_coordinator") {
    return <CoordinatorDashboard requests={allRequests} deployments={deployments.data ?? []} />;
  }
  const mine = allRequests.filter((request) => request.developer_id === user?.id);
  return (
    <DeveloperDashboard
      requests={mine}
      missingDocuments={(documents.data ?? []).filter(
        (document) => document.cab_requests?.developer_id === user?.id && !document.file_path,
      ).length}
      name={profile?.full_name ?? user?.email ?? "Developer"}
    />
  );
}

type MetricProps = {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "teal" | "success" | "warning" | "danger";
  to?: "/requests";
  search?: Record<string, string>;
  href?: string;
};

function Metric({ label, value, detail, icon: Icon, tone = "primary", to, search, href }: MetricProps) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    teal: "bg-teal/10 text-teal",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
  };
  const content = (
    <div className="h-full rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
  if (to) return <Link to={to} search={search ?? {}} className="block h-full">{content}</Link>;
  if (href) return <a href={href} className="block h-full">{content}</a>;
  return content;
}

function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      actions={<Pill tone="teal">Live operational data</Pill>}
    />
  );
}

function DeveloperDashboard({ requests, missingDocuments, name }: { requests: CabRequest[]; missingDocuments: number; name: string }) {
  const statuses = (values: CabStatus[]) => requests.filter((item) => values.includes(item.status as CabStatus));
  const actions = statuses(DEVELOPER_ACTION_STATUSES).sort(prioritySort).slice(0, 6);
  return (
    <div>
      <DashboardHeader title={`Welcome, ${name}`} subtitle="Your CAB requests, readiness, approvals, and deployment progress." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Active requests" value={requests.filter((item) => item.status !== "CLOSED").length} detail="Currently in progress" icon={GaugeCircle} to="/requests" search={{ scope: "mine" }} />
        <Metric label="Documents missing" value={missingDocuments} detail="Required files outstanding" icon={FileWarning} tone="warning" to="/requests" search={{ scope: "actions" }} />
        <Metric label="Pending review" value={statuses(["READY_FOR_CAB", "IN_REVIEW"]).length} detail="With the CAB team" icon={ClipboardCheck} tone="teal" to="/requests" search={{ scope: "mine" }} />
        <Metric label="Passed" value={statuses(["PASSED"]).length} detail="Ready for deployment booking" icon={CheckCircle2} tone="success" to="/requests" search={{ scope: "booking" }} />
        <Metric label="Waiting deployment" value={statuses(["DEPLOYMENT_BOOKED", "DEPLOYING"]).length} detail="Booked or underway" icon={Rocket} tone="teal" to="/requests" search={{ scope: "mine" }} />
        <Metric label="Completed" value={statuses(["CLOSED"]).length} detail="Successfully closed" icon={CheckCircle2} tone="success" to="/requests" search={{ scope: "mine" }} />
      </div>
      <DashboardSection title="My action required" subtitle="Highest-priority changes that need your attention." actionLabel="View all actions" search={{ scope: "actions" }}>
        <RequestTable rows={actions} empty="No actions required" />
      </DashboardSection>
    </div>
  );
}

function ReviewerDashboard({ requests, openConditions }: { requests: CabRequest[]; openConditions: number }) {
  const queue = requests.filter((item) => REVIEW_QUEUE_STATUSES.includes(item.status as CabStatus));
  const highRisk = requests.filter((item) => item.risk_level === "high" || item.risk_level === "critical");
  const recentlyReviewed = requests.filter((item) => item.reviewed_at).sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""));
  return (
    <div>
      <DashboardHeader title="CAB Review Dashboard" subtitle="Review readiness, risk, conditions, and recent decisions." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Review queue" value={queue.length} detail="Ready or under review" icon={ClipboardCheck} tone="teal" to="/requests" search={{ scope: "queue" }} />
        <Metric label="Pending conditions" value={openConditions} detail="Awaiting evidence or verification" icon={FileWarning} tone="warning" to="/requests" search={{ scope: "conditions" }} />
        <Metric label="High-risk changes" value={highRisk.length} detail="High and critical exposure" icon={ShieldAlert} tone="danger" to="/requests" search={{ scope: "risk" }} />
        <Metric label="Reviewed" value={recentlyReviewed.length} detail="Requests with a CAB review" icon={CheckCircle2} tone="success" to="/requests" search={{ scope: "history" }} />
      </div>
      <DashboardSection title="Priority review queue" subtitle="Highest-risk submissions are shown first." actionLabel="Open full queue" search={{ scope: "queue" }}>
        <RequestTable rows={[...queue].sort(prioritySort).slice(0, 7)} empty="The review queue is clear" />
      </DashboardSection>
    </div>
  );
}

function CoordinatorDashboard({ requests, deployments }: { requests: CabRequest[]; deployments: ReturnType<typeof useDeployments>["data"] extends (infer U)[] | undefined ? U[] : never[] }) {
  const ready = requests.filter((item) => item.status === "PASSED");
  const scheduled = deployments.filter((item) => item.status === "scheduled");
  const active = deployments.filter((item) => item.status === "deploying");
  const failed = deployments.filter((item) => item.status === "failed");
  return (
    <div>
      <DashboardHeader title="Deployment Dashboard" subtitle="Book approved changes and monitor every deployment window." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ready for booking" value={ready.length} detail="CAB passed, not yet scheduled" icon={CalendarClock} tone="warning" to="/requests" search={{ scope: "booking" }} />
        <Metric label="Scheduled" value={scheduled.length} detail="Upcoming deployment windows" icon={CalendarClock} tone="teal" href="/deployments?status=scheduled" />
        <Metric label="Deploying" value={active.length} detail="Changes currently underway" icon={Rocket} tone="primary" href="/deployments?status=deploying" />
        <Metric label="Failed" value={failed.length} detail="Requires incident follow-up" icon={AlertTriangle} tone="danger" href="/deployments?status=failed" />
      </div>
      <DashboardSection title="Ready for deployment booking" subtitle="Approved requests waiting for a deployment window." actionLabel="View booking queue" search={{ scope: "booking" }}>
        <RequestTable rows={ready.slice(0, 7)} empty="No requests are waiting for booking" />
      </DashboardSection>
    </div>
  );
}

type Analytics = ReturnType<typeof useControlTower>["data"];

function ExecutiveDashboard({ requests, analytics, loading, error }: { requests: CabRequest[]; analytics: Analytics; loading: boolean; error: unknown }) {
  const highRisk = requests
    .filter((item) => item.risk_level === "high" || item.risk_level === "critical")
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, 6);
  if (loading) return <Loading label="Loading Control Tower…" />;
  if (error) return <ErrorState error={error} />;
  const kpis = analytics?.kpis;
  const funnel = analytics?.funnel;
  const stages = [
    { key: "submitted", label: "Submitted", value: funnel?.submitted ?? 0 },
    { key: "reviewed", label: "Reviewed", value: funnel?.reviewed ?? 0 },
    { key: "passed", label: "Passed", value: funnel?.passed ?? 0 },
    { key: "scheduled", label: "Scheduled", value: funnel?.scheduled ?? 0 },
    { key: "deployed", label: "Deployed", value: funnel?.deployed ?? 0 },
    { key: "closed", label: "Closed", value: funnel?.closed ?? 0 },
  ] as const;
  const issues = (analytics?.issues ?? []).map((item) => ({ name: item.category ?? "Uncategorised", value: item.total ?? 0 }));
  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)"];
  return (
    <div>
      <DashboardHeader title="CAB Control Tower" subtitle="Executive view of change throughput, deployment outcomes, and risk exposure." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Active requests" value={kpis?.active_requests ?? 0} detail="Across the CAB lifecycle" icon={GaugeCircle} to="/requests" />
        <Metric label="Pending review" value={kpis?.pending_review ?? 0} detail="Awaiting CAB action" icon={ClipboardCheck} tone="teal" to="/requests" search={{ scope: "queue" }} />
        <Metric label="Passed" value={kpis?.passed ?? 0} detail="CAB-approved changes" icon={CheckCircle2} tone="success" to="/requests" search={{ lifecycle: "passed" }} />
        <Metric label="Deploy success" value={`${Number(kpis?.deploy_success_rate ?? 0).toFixed(1)}%`} detail="Completed deployment rate" icon={Rocket} tone="success" />
        <Metric label="High risk" value={kpis?.high_risk ?? 0} detail="High and critical changes" icon={ShieldAlert} tone="danger" to="/requests" search={{ scope: "risk" }} />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Change lifecycle funnel</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Select a stage to inspect its requests.</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage, index) => (
            <Link key={stage.key} to="/requests" search={{ lifecycle: stage.key }} className="group bg-card px-4 py-5 hover:bg-surface">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">{stage.label}</span>
                {index < stages.length - 1 && <ArrowRight className="hidden h-4 w-4 text-muted-foreground xl:block" />}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{stage.value}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-teal" style={{ width: `${Math.max(5, stages[0].value ? (stage.value / stages[0].value) * 100 : 0)}%` }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <DashboardSection title="Recent high-risk changes" subtitle="Critical and high-risk requests ranked by score." actionLabel="View all high risk" search={{ scope: "risk" }} flush>
          <HighRiskTable rows={highRisk} />
        </DashboardSection>
        <section className="rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Issue categories</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Findings across CAB records.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[180px_1fr] xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
            <div className="h-44" aria-label="Issue category distribution chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={issues} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {issues.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {issues.map((item, index) => (
                <Link key={item.name} to="/requests" search={{ issue: item.name }} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs hover:bg-surface">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: chartColors[index % chartColors.length] }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono font-medium tabular-nums">{item.value}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardSection({ title, subtitle, actionLabel, search, children, flush = false }: { title: string; subtitle: string; actionLabel: string; search: Record<string, string>; children: React.ReactNode; flush?: boolean }) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div>
        <Button asChild variant="outline" size="sm"><Link to="/requests" search={search}>{actionLabel}<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

function HighRiskTable({ rows }: { rows: CabRequest[] }) {
  if (!rows.length) return <p className="p-8 text-center text-sm text-muted-foreground">No high-risk changes</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Request</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Target deploy</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border hover:bg-surface"><td className="px-5 py-3"><Link to="/requests/$id" params={{ id: row.id }} className="font-medium text-primary hover:underline">{row.request_code}</Link><p className="max-w-xs truncate text-xs text-muted-foreground">{row.topic}</p></td><td className="px-4 py-3">{row.project_code}</td><td className="px-4 py-3"><RiskPill level={row.risk_level} score={row.risk_score} /></td><td className="px-4 py-3"><StatusPill status={row.status} /></td><td className="px-4 py-3">{fmtDate(row.target_deploy_date)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function prioritySort(a: CabRequest, b: CabRequest) {
  const priority: Record<string, number> = { INCIDENT: 5, NOT_APPROVED: 4, PASSED_WITH_CONDITIONS: 3, DOCUMENTS_PENDING: 2, DRAFT: 1 };
  return (priority[b.status] ?? 0) - (priority[a.status] ?? 0) || (b.risk_score ?? 0) - (a.risk_score ?? 0);
}
