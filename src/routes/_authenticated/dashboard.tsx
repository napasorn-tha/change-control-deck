import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome to CAB360.</p>
    </div>
  );
}
