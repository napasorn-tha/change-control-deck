import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useDeployments } from "@/lib/data";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/deployments_/calendar",
)({
  head: () => ({
    meta: [
      { title: "Deployment Calendar — CAB360" },
      {
        name: "description",
        content:
          "Calendar view of scheduled and historical Data Warehouse deployments.",
      },
    ],
  }),
  component: DeploymentCalendarPage,
});

function DeploymentCalendarPage() {
  const deployments = useDeployments();
  const [month, setMonth] = useState(new Date());

  if (deployments.isLoading) {
    return <Loading label="Loading deployment calendar…" />;
  }

  if (deployments.error) {
    return <ErrorState error={deployments.error} />;
  }

  const rows = deployments.data ?? [];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [month]);

  const deploymentsByDay = useMemo(() => {
    const map = new Map<string, typeof rows>();

    rows.forEach((deployment) => {
      const key = format(new Date(deployment.deploy_date), "yyyy-MM-dd");
      const current = map.get(key) ?? [];
      current.push(deployment);
      map.set(key, current);
    });

    return map;
  }, [rows]);

  function toneForStatus(
    status: string,
  ): "success" | "danger" | "warning" | "teal" | "neutral" {
    if (status === "completed") return "success";
    if (status === "failed") return "danger";
    if (status === "deploying") return "teal";
    if (status === "scheduled") return "warning";
    return "neutral";
  }

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <PageHeader
        title="Deployment Calendar"
        subtitle="Monthly view of CAB deployment windows and execution status"
      />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />

            <div>
              <h2 className="text-sm font-semibold">
                {format(month, "MMMM yyyy")}
              </h2>

              <p className="text-xs text-muted-foreground">
                {rows.length} deployment record(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous month</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(new Date())}
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <Pill tone="warning">Scheduled</Pill>
            <Pill tone="teal">Deploying</Pill>
            <Pill tone="success">Completed</Pill>
            <Pill tone="danger">Failed</Pill>
            <Pill tone="neutral">Cancelled</Pill>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-5">
            <Empty
              title="No deployments found"
              body="Deployment bookings will appear on the calendar."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-7 border-b border-border bg-surface">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="border-r border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayDeployments = deploymentsByDay.get(key) ?? [];
                  const currentMonth = isSameMonth(day, month);
                  const today = isSameDay(day, new Date());

                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-36 border-b border-r border-border p-2",
                        index % 7 === 6 && "border-r-0",
                        !currentMonth && "bg-muted/30",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                            !currentMonth && "text-muted-foreground",
                            today &&
                              "bg-primary text-primary-foreground",
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {dayDeployments.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {dayDeployments.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {dayDeployments.map((deployment) => (
                          <Link
                            key={deployment.id}
                            to="/requests/$id"
                            params={{ id: deployment.request_id }}
                            className="block rounded-md border border-border bg-background p-2 hover:bg-surface"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-primary">
                                {deployment.cab_requests?.request_code ??
                                  "CAB Request"}
                              </span>

                              <Pill tone={toneForStatus(deployment.status)}>
                                {deployment.status}
                              </Pill>
                            </div>

                            <p className="mt-1 truncate text-xs font-medium">
                              {deployment.cab_requests?.project_code ?? "—"}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {deployment.cab_requests?.topic ?? "—"}
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {format(
                                new Date(deployment.window_start),
                                "HH:mm",
                              )}
                              {" – "}
                              {format(
                                new Date(deployment.window_end),
                                "HH:mm",
                              )}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}