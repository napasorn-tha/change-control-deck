import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "signup" | "signin" | undefined } => ({
    mode: search["mode"] === "signup" ? "signup" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CAB360" },
      { name: "description", content: "Sign in to the CAB360 change advisory board platform." },
      { property: "og:title", content: "Sign in — CAB360" },
      { property: "og:description", content: "Access the CAB360 deployment control tower." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created");
          void navigate({ to: "/dashboard" });
        } else {
          toast.success("Account created — check your email to confirm it before signing in.");
          setIsSignup(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        void navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            C3
          </div>
          <div>
            <p className="font-semibold">CAB360</p>
            <p className="text-xs opacity-75">Deployment Control Tower</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-3xl font-bold leading-snug">
            Governed change, from registration to deployment.
          </h1>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Readiness checks, CAB review, risk scoring, conditional approvals, deployment
            scheduling and root cause analysis — in one operational system.
          </p>
        </div>
        <p className="text-xs opacity-60">Data Ingestion · Transformation · Outbound</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-7 shadow-panel">
          <h2 className="text-lg font-semibold">
            {isSignup ? "Create your CAB360 account" : "Sign in to CAB360"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Create your account. An Admin will assign your CAB360 role."
              : "Use your work email address."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {isSignup && (
              <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                New accounts start as Developer. An Admin can assign a different role after the first sign-in.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to CAB360?"}{" "}
            <button
              type="button"
              className="font-medium text-teal hover:underline"
              onClick={() => setIsSignup((v) => !v)}
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">
              Back to overview
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
