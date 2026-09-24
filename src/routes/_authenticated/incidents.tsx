import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { useIncidents } from "@/lib/data";
import { fmtDateTime } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";

type IncidentStatus = "open" | "analysing" | "resolved";

export const Route = createFileRoute("/_authenticated/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents — CAB360" },
      {
        name: "description",
        content: "Deployment incidents and root cause analysis in CAB360.",
      },
    ],
  }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const incidents = useIncidents();
  const [status, setStatus] = useState("");

  if (incidents.isLoading) {
    return <Loading label="Loading incidents…" />;
  }

  if (incidents.error) {
    return <ErrorState error={incidents.error} />;
  }

  const rows = (incidents.data ?? []).filter(
    (item) => !status || item.status === status,
  );

  function statusTone(
    value: string,
  ): "danger" | "warning" | "success" | "neutral" {
    if (value === "open") return "danger";
    if (value === "analysing") return "warning";
    if (value === "resolved") return "success";
    return "neutral";
  }

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle={`${rows.length} deployment incident(s)`}
      />

      <div className="mb-4">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="analysing">Analysing</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No incidents found"
          body="Deployment incidents and root cause analysis records will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold">
                Incident & Root Cause Register
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Failed deployment incidents, RCA findings and corrective actions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-4 py-3">CAB Request</th>
                  <th className="px-4 py-3">Incident</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Root Cause</th>
                  <th className="px-4 py-3">Corrective Action</th>
                  <th className="px-4 py-3">Scope / Design Changed?</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-surface"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {fmtDateTime(item.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        to="/requests/$id"
                        params={{ id: item.request_id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.cab_requests?.request_code ?? "Open Request"}
                      </Link>

                      {item.cab_requests?.topic && (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                          {item.cab_requests.topic}
                        </p>
                      )}
                    </td>

                    <td className="max-w-sm px-4 py-3">
                      <p className="font-medium">{item.title}</p>

                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Pill tone={statusTone(item.status)}>
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </Pill>
                    </td>

                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {item.root_cause ?? "Pending RCA"}
                    </td>

                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {item.corrective_action ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {item.scope_changed === true ? (
                        <Pill tone="danger">Yes — CAB review required</Pill>
                      ) : item.scope_changed === false ? (
                        <Pill tone="success">No — Re-deployment allowed</Pill>
                      ) : (
                        <Pill tone="warning">Pending assessment</Pill>
                      )}
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