import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  GaugeCircle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAB360 — Intelligent Change Advisory Board & Deployment Control Tower" },
      {
        name: "description",
        content:
          "Centralised CAB registration, document readiness checks, risk assessment, conditional approvals, deployment scheduling and real-time executive reporting.",
      },
      {
        property: "og:title",
        content: "CAB360 — Intelligent Change Advisory Board & Deployment Control Tower",
      },
      {
        property: "og:description",
        content:
          "Digitise the Change Advisory Board workflow for data ingestion, transformation and outbound changes.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ClipboardCheck,
    title: "Centralised registration",
    body: "One register for every ingestion, transformation and outbound change request.",
  },
  {
    icon: ShieldCheck,
    title: "Automatic readiness check",
    body: "Five required artefacts scored before a request can reach the CAB queue.",
  },
  {
    icon: Workflow,
    title: "Correct decision paths",
    body: "Passed, passed with conditions and not approved each follow their own route.",
  },
  {
    icon: CalendarClock,
    title: "Deployment scheduling",
    body: "Booking with conflict detection, calendar, execution tracking and incidents.",
  },
  {
    icon: Activity,
    title: "Full audit trail",
    body: "Every status transition recorded with actor, timestamp and comment.",
  },
  {
    icon: GaugeCircle,
    title: "Executive control tower",
    body: "Live KPIs, lifecycle funnel, issue categories and deployment success trend.",
  },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
              C3
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">CAB360</p>
              <p className="text-xs text-muted-foreground">Deployment Control Tower</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
          Data Warehouse Change Governance
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Intelligent Change Advisory Board &amp; Deployment Control Tower
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground">
          CAB360 replaces manual registration, document chasing and email coordination with one
          governed workflow — from request creation and readiness checks through CAB review, risk
          assessment, conditional approval, deployment scheduling and root cause analysis.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Sign in to CAB360</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create an account
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-5 shadow-card"
            >
              <f.icon className="h-5 w-5 text-teal" />
              <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
