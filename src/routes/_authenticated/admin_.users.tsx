import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type AppRole } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  Pill,
} from "@/components/cab/primitives";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  role: AppRole;
};

const ROLES: AppRole[] = [
  "developer",
  "cab_reviewer",
  "deployment_coordinator",
  "executive",
  "admin",
];

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — CAB360" },
      {
        name: "description",
        content: "Admin role assignment for CAB360 users.",
      },
    ],
  }),
  component: UsersRolesPage,
});

function UsersRolesPage() {
  const { actualRole, user } = useAuth();
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users-roles"],
    enabled: actualRole === "admin",
    queryFn: async (): Promise<UserRow[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw new Error(profilesRes.error.message);
      if (rolesRes.error) throw new Error(rolesRes.error.message);

      const priority: AppRole[] = [
        "admin",
        "executive",
        "cab_reviewer",
        "deployment_coordinator",
        "developer",
      ];

      return (profilesRes.data ?? []).map((profile) => {
        const assigned = (rolesRes.data ?? [])
          .filter((item) => item.user_id === profile.id)
          .map((item) => item.role as AppRole);

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          job_title: profile.job_title,
          role: priority.find((role) => assigned.includes(role)) ?? "developer",
        };
      });
    },
  });

  async function changeRole(userId: string, role: AppRole) {
    if (userId === user?.id) {
      return toast.error("Keep your own account as Admin while managing roles.");
    }

    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) return toast.error(deleteError.message);

    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (insertError) return toast.error(insertError.message);

    await queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
    toast.success(`Role updated to ${ROLE_LABEL[role]}`);
  }

  if (actualRole !== "admin") {
    return (
      <Empty
        title="Admin access required"
        body="Only an Admin can manage CAB360 user roles."
      />
    );
  }

  if (users.isLoading) return <Loading label="Loading users…" />;
  if (users.error) return <ErrorState error={users.error} />;

  const rows = users.data ?? [];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Assign each signed-in team member one CAB360 operating role."
        actions={<Pill tone="primary">Admin only</Pill>}
      />

      <div className="mb-5 rounded-lg border border-border bg-card p-4 text-sm shadow-card">
        <p className="font-medium">How onboarding works</p>
        <p className="mt-1 text-muted-foreground">
          Ask a teammate to sign in once. Their account will appear here, then
          assign the role they should use in CAB360.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Team access</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Job title</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const self = row.id === user?.id;
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">
                      {row.full_name ?? "Unnamed user"}
                      {self && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.job_title ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={row.role}
                        disabled={self}
                        onChange={(e) =>
                          void changeRole(row.id, e.target.value as AppRole)
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
