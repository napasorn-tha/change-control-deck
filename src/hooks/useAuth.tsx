import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/cab";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  actualRole: AppRole | null;
  demoRole: AppRole | null;
  setDemoRole: (role: AppRole | null) => void;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  role: null,
  actualRole: null,
  demoRole: null,
  setDemoRole: () => {},
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [demoRole, setDemoRoleState] = useState<AppRole | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.sessionStorage.getItem("cab360-demo-role") as AppRole | null;
    return saved && saved !== "admin" ? saved : null;
  });
  const [loading, setLoading] = useState(true);

  async function load(userId: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((p as Profile) ?? null);
    const roles = (r ?? []).map((x) => x.role as AppRole);
    const priority: AppRole[] = [
      "admin",
      "executive",
      "cab_reviewer",
      "deployment_coordinator",
      "developer",
    ];
    const resolved = priority.find((x) => roles.includes(x)) ?? "developer";
    setActualRole(resolved);
    if (resolved !== "admin") {
      setDemoRoleState(null);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("cab360-demo-role");
      }
    }
  }

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) void load(s.user.id);
      else {
        setProfile(null);
        setActualRole(null);
        setDemoRoleState(null);
      }
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await load(data.session.user.id);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const role =
    actualRole === "admin" && demoRole && demoRole !== "admin"
      ? demoRole
      : actualRole;

  function setDemoRole(role: AppRole | null) {
    if (actualRole !== "admin") return;
    const next = role && role !== "admin" ? role : null;
    setDemoRoleState(next);
    if (typeof window !== "undefined") {
      if (next) window.sessionStorage.setItem("cab360-demo-role", next);
      else window.sessionStorage.removeItem("cab360-demo-role");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        role,
        actualRole,
        demoRole,
        setDemoRole,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
        refresh: async () => {
          if (session?.user) await load(session.user.id);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useActorName() {
  const { profile, user } = useAuth();
  return profile?.full_name || user?.email || "Unknown user";
}
