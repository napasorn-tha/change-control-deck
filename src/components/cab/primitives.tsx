import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_TONE, TONE_CLASS, statusLabel, statusTone } from "@/lib/cab";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof TONE_CLASS;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={statusTone(status)}>{statusLabel(status)}</Pill>;
}

export function RiskPill({ level, score }: { level?: string | null; score?: number | null }) {
  const key = level ?? "unassessed";
  return (
    <Pill tone={RISK_TONE[key] ?? "neutral"}>
      {key === "unassessed" ? "Not assessed" : key.charAt(0).toUpperCase() + key.slice(1)}
      {score != null && key !== "unassessed" ? ` · ${score}` : ""}
    </Pill>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-card shadow-card", className)}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "primary",
  to,
  search,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONE_CLASS;
  to?: string;
  search?: Record<string, string>;
}) {
  const body = (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <span className={cn("mt-3 block h-1 w-10 rounded-full", TONE_CLASS[tone])} />
    </div>
  );
  if (!to) return body;
  return (
    <Link to={to} search={search ?? {}} className="block">
      {body}
    </Link>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
      {error instanceof Error ? error.message : "Something went wrong loading this data."}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "teal",
}: {
  value: number;
  tone?: "teal" | "success" | "warning" | "danger";
}) {
  const bg =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "danger"
          ? "bg-destructive"
          : "bg-teal";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full transition-all", bg)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
