import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { useDeployments } from "@/lib/data";
import { ENVIRONMENTS, fmtDate, fmtDateTime } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";

type DeploymentStatus =
  | "scheduled"
  | "deploying"
  | "completed"
  | "failed"
  | "cancelled";

const DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  "scheduled",
  "deploying",
  "completed",
  "failed",
  "cancelled",
];

export const Route = createFileRoute("/_authenticated/deployments")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { status?: DeploymentStatus } => ({
    status: DEPLOYMENT_STATUSES.includes(
      search["status"] as DeploymentStatus,
    )
      ? (search["status"] as DeploymentStatus)
      : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Deployments — CAB360" },
      {
        name: "description",
        content: "Deployment schedule and execution history for CAB360.",
      },
    ],
  }),

  component: DeploymentsPage,
});

function DeploymentsPage() {
  const { status: statusFromUrl } = Route.useSearch();
  const deployments = useDeployments();

  const [status, setStatus] = useState(statusFromUrl ?? "");
  const [environment, setEnvironment] = useState("");

  if (deployments.isLoading) {
    return <Loading label="Loading deployments…" />;
  }

  if (deployments.error) {
    return <ErrorState error={deployments.error} />;
  }

  const rows = useMemo(() => {
    let result = deployments.data ?? [];

    if (status) {
      result = result.filter((item) => item.status === status);
    }

    if (environment) {
      result = result.filter(
        (item) => item.environment === environment,
      );
    }

    return result;
  }, [deployments.data, status, environment]);

  function statusTone(
    value: string,
  ): "success" | "warning" | "danger" | "teal" | "neutral" {
    if (value === "completed") return "success";
    if (value === "failed") return "danger";
    if (value === "deploying") return "teal";
    if (value === "scheduled") return "warning";
    return "neutral";
  }

  function environmentLabel(value: string) {
    return (
      ENVIRONMENTS.find((item) => item.value === value)?.label ?? value
    );
  }

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle={`${rows.length} deployment record(s)`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="deploying">Deploying</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value)}
        >
          <option value="">All environments</option>

          {ENVIRONMENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No deployments found"
          body="Try changing the status or environment filter."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />

              <h2 className="text-sm font-semibold">
                Deployment Register
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Scheduled and historical deployment attempts across CAB
              requests.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">CAB Request</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Deploy Date</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Coordinator</th>
                  <th className="px-4 py-3">Attempt</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-surface"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to="/requests/$id"
                        params={{ id: item.request_id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.cab_requests?.request_code ?? "Open Request"}
                      </Link>
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {item.cab_requests?.project_code ?? "—"}
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      {item.cab_requests?.topic ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <Pill tone="neutral">
                        {environmentLabel(item.environment)}
                      </Pill>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {fmtDate(item.deploy_date)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <div>{fmtDateTime(item.window_start)}</div>
                      <div className="text-xs">
                        → {fmtDateTime(item.window_end)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {item.coordinator_name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-center font-mono">
                      {item.attempt}
                    </td>

                    <td className="px-4 py-3">
                      <Pill tone={statusTone(item.status)}>
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}