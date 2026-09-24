import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";

import { useProjects } from "@/lib/data";
import { fmtDate } from "@/lib/cab";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "@/components/cab/primitives";

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