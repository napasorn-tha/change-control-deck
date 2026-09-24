import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { useActivity } from "@/lib/data";
import { fmtDateTime, statusLabel } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — CAB360" },
      {
        name: "description",
        content: "Audit trail of CAB360 workflow actions and status transitions.",
      },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const activity = useActivity();

  if (activity.isLoading) {
    return <Loading label="Loading activity history…" />;
  }

  if (activity.error) {
    return <ErrorState error={activity.error} />;
  }

  const rows = activity.data ?? [];

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle={`${rows.length} recent workflow event(s)`}
      />

      {rows.length === 0 ? (
        <Empty
          title="No activity found"
          body="Workflow actions will appear here as CAB requests are processed."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                System Activity & Audit Trail
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Recent CAB actions, actors and workflow status transitions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-4 py-3">CAB Request</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status Change</th>
                  <th className="px-4 py-3">Comment</th>
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
                      {item.request_id && item.cab_requests?.request_code ? (
                        <Link
                          to="/requests/$id"
                          params={{ id: item.request_id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.cab_requests.request_code}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.actor_name ?? "System"}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {item.action}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.from_status ? (
                          <Pill tone="neutral">
                            {statusLabel(item.from_status)}
                          </Pill>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}

                        {item.to_status && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <Pill tone="info">
                              {statusLabel(item.to_status)}
                            </Pill>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      {item.comment ?? "—"}
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