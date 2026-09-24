import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileStack,
  FolderKanban,
  GaugeCircle,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PlusCircle,
  Rocket,
  ShieldAlert,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type AppRole } from "@/lib/cab";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
};

function navFor(role: AppRole | null): NavItem[] {
  if (role === "cab_reviewer") {
    return [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "CAB Review Queue", to: "/requests", search: { scope: "queue" }, icon: ListChecks },
      {
        label: "Pending Conditions",
        to: "/requests",
        search: { scope: "conditions" },
        icon: ClipboardList,
      },
      { label: "High Risk Changes", to: "/requests", search: { scope: "risk" }, icon: ShieldAlert },
      { label: "Review History", to: "/requests", search: { scope: "history" }, icon: History },
      { label: "Projects", to: "/projects", icon: FolderKanban },
      { label: "Users & Roles", to: "/admin/users", icon: Users },
      { label: "Activity Log", to: "/activity", icon: Activity },
    ];
  }
  if (role === "deployment_coordinator") {
    return [
      { label: "Deployment Dashboard", to: "/dashboard", icon: LayoutDashboard },
      {
        label: "Ready for Booking",
        to: "/requests",
        search: { scope: "booking" },
        icon: ClipboardList,
      },
      { label: "Deployment Calendar", to: "/deployments/calendar", icon: CalendarDays },
      {
        label: "Scheduled Deployments",
        to: "/deployments",
        search: { status: "scheduled" },
        icon: Truck,
      },
      {
        label: "Active Deployments",
        to: "/deployments",
        search: { status: "deploying" },
        icon: Rocket,
      },
      { label: "Incidents", to: "/incidents", icon: AlertTriangle },
      { label: "History", to: "/deployments", search: { status: "completed" }, icon: History },
    ];
  }
  if (role === "executive" || role === "admin") {
    return [
      { label: "CAB Control Tower", to: "/dashboard", icon: GaugeCircle },
      { label: "All CAB Requests", to: "/requests", icon: ListChecks },
      { label: "Deployment Calendar", to: "/deployments/calendar", icon: CalendarDays },
      { label: "Deployments", to: "/deployments", icon: Truck },
      { label: "Incidents", to: "/incidents", icon: AlertTriangle },
      { label: "Projects", to: "/projects", icon: FolderKanban },
      { label: "Activity Log", to: "/activity", icon: Activity },
    ];
  }
  return [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My CAB Requests", to: "/requests", search: { scope: "mine" }, icon: ListChecks },
    { label: "Create CAB Request", to: "/requests/new", icon: PlusCircle },
    { label: "Documents", to: "/documents", icon: FileStack },
    { label: "Projects", to: "/projects", icon: FolderKanban },
    {
      label: "Rework / Actions Required",
      to: "/requests",
      search: { scope: "actions" },
      icon: AlertTriangle,
    },
    { label: "Deployment Status", to: "/deployments", icon: Truck },
    { label: "Deployment Calendar", to: "/deployments/calendar", icon: CalendarDays },
    { label: "Activity History", to: "/activity", icon: History },
  ];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, role, actualRole, demoRole, setDemoRole, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const items = navFor(role);

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || user?.email || "U")
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const sidebar = (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          C3
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">CAB360</p>
          <p className="truncate text-[11px] opacity-70">
            Change Advisory &amp; Deployment Control
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            location.pathname === item.to &&
            (!item.search ||
              Object.entries(item.search).every(
                ([k, v]) => (location.search as Record<string, unknown>)[k] === v,
              ));
          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search ?? {}}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="border-t border-sidebar-border p-3">
        <p className="px-2 text-[11px] uppercase tracking-wider opacity-60">Signed in as</p>
        <p className="truncate px-2 text-sm font-medium">{profile?.full_name || user?.email}</p>
        <p className="truncate px-2 text-xs opacity-70">{role ? ROLE_LABEL[role] : "—"}</p>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
          <button
            className="absolute right-4 top-4 rounded-md bg-card p-2"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-md p-2 hover:bg-secondary lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            {location.pathname !== "/dashboard" && (
              <button
                className="rounded-md p-2 hover:bg-secondary"
                onClick={handleBack}
                aria-label="Go back"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">CAB360</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Intelligent Change Advisory Board &amp; Deployment Control Tower
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {actualRole === "admin" && (
              <div className="flex items-center gap-2">
                {demoRole && (
                  <span className="hidden rounded-full border border-warning/35 bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning-foreground md:inline">
                    Demo view
                  </span>
                )}
                <select
                  aria-label="Demo role view"
                  className="h-8 max-w-[150px] rounded-md border border-input bg-background px-2 text-xs"
                  value={demoRole ?? "admin"}
                  onChange={(e) => setDemoRole(e.target.value === "admin" ? null : (e.target.value as AppRole))}
                >
                  <option value="admin">Admin</option>
                  <option value="developer">View as Developer</option>
                  <option value="cab_reviewer">View as CAB Reviewer</option>
                  <option value="deployment_coordinator">View as Deployment Coordinator</option>
                  <option value="executive">View as Executive</option>
                </select>
              </div>
            )}
            <span className="hidden rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:inline">
              {role ? ROLE_LABEL[role] : "—"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Sign out</span>
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
