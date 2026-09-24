import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FolderKanban } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useInvalidateAll, useProjects } from "@/lib/data";
import { fmtDate } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "@/components/cab/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — CAB360" },
      {
        name: "description",
        content: "Data Warehouse projects registered in CAB360.",
      },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useProjects();
  const refresh = useInvalidateAll();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ownerLead, setOwnerLead] = useState("");
  const [saving, setSaving] = useState(false);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const projectCode = code.trim().toUpperCase();
    const projectName = name.trim();

    if (!projectCode || !projectName) {
      return toast.error("Project code and project name are required");
    }

    setSaving(true);
    const { error } = await supabase.from("projects").insert({
      code: projectCode,
      name: projectName,
      owner_lead: ownerLead.trim() || null,
    });

    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    setCode("");
    setName("");
    setOwnerLead("");
    await refresh();
    setSaving(false);
    toast.success("Project added");
  }

  if (projects.isLoading) {
    return <Loading label="Loading projects…" />;
  }

  if (projects.error) {
    return <ErrorState error={projects.error} />;
  }

  const rows = projects.data ?? [];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${rows.length} Data Warehouse project(s) registered in CAB360`}
      />

      <div className="mb-5 rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Add Project</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Register a new Data Warehouse project so it becomes available when creating a CAB request.
          </p>
        </div>

        <form onSubmit={addProject} className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Project Code</Label>
            <Input
              className="mt-1"
              placeholder="e.g. DWH-NEW"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <Label>Project Name</Label>
            <Input
              className="mt-1"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Owner / Lead</Label>
            <Input
              className="mt-1"
              placeholder="Optional"
              value={ownerLead}
              onChange={(e) => setOwnerLead(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add Project"}
            </Button>
          </div>
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty
          title="No projects found"
          body="Projects registered in CAB360 will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                Project Directory
              </h2>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Projects currently available for CAB requests and deployment
              tracking.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Project Code</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Owner / Lead</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((project) => (
                  <tr
                    key={project.id}
                    className="border-t border-border hover:bg-surface"
                  >
                    <td className="px-5 py-3 font-medium text-primary">
                      {project.code}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {project.name}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {project.owner_lead ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(project.created_at)}
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