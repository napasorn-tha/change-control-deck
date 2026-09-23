import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useActorName } from "@/hooks/useAuth";
import { useProjects, useRequests } from "@/lib/data";
import { CHANGE_TYPES, DOC_TYPES, logActivity, nextRequestCode } from "@/lib/cab";
import { Card, PageHeader } from "@/components/cab/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/requests/new")({
  head: () => ({
    meta: [
      { title: "Create CAB Request — CAB360" },
      { name: "description", content: "Register a new change for CAB review." },
      { property: "og:title", content: "Create CAB Request — CAB360" },
      { property: "og:description", content: "Register a new change for CAB review." },
    ],
  }),
  component: NewRequest,
});

function NewRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = useActorName();
  const projects = useProjects();
  const requests = useRequests();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    project_id: "",
    topic: "",
    pm_ba_lead: "",
    change_type: "ingestion",
    cab_date: "",
    target_deploy_date: "",
    target_golive_date: "",
    description: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const project = projects.data?.find((p) => p.id === f.project_id);
    if (!project) return toast.error("Choose a project");
    if (!f.topic.trim()) return toast.error("Topic is required");
    setBusy(true);
    try {
      const code = nextRequestCode((requests.data ?? []).map((r) => r.request_code));
      const { data, error } = await supabase
        .from("cab_requests")
        .insert({
          request_code: code,
          project_id: project.id,
          project_code: project.code,
          project_name: project.name,
          topic: f.topic.trim(),
          pm_ba_lead: f.pm_ba_lead || null,
          change_type: f.change_type,
          cab_date: f.cab_date || null,
          target_deploy_date: f.target_deploy_date || null,
          target_golive_date: f.target_golive_date || null,
          description: f.description || null,
          developer_id: user?.id ?? null,
          developer_name: actor,
          status: "DRAFT",
        })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("cab_documents")
        .insert(DOC_TYPES.map((d) => ({ request_id: data.id, doc_type: d.value, review_status: "missing" })));
      await logActivity({ request_id: data.id, actor_id: user?.id, actor_name: actor, action: "Request created", to_status: "DRAFT" });
      toast.success(`${code} created — upload the required documents next`);
      void navigate({ to: "/requests/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Create CAB Request" subtitle="Step 1 · CAB Registration. Documents are uploaded on the next screen." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Project</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.project_id} onChange={set("project_id")}>
              <option value="">Select project…</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Topic / change title</Label>
            <Input className="mt-1" value={f.topic} onChange={set("topic")} />
          </div>
          <div>
            <Label>PM / BA lead</Label>
            <Input className="mt-1" value={f.pm_ba_lead} onChange={set("pm_ba_lead")} />
          </div>
          <div>
            <Label>Change type</Label>
            <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.change_type} onChange={set("change_type")}>
              {CHANGE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>CAB date</Label>
            <Input type="date" className="mt-1" value={f.cab_date} onChange={set("cab_date")} />
          </div>
          <div>
            <Label>Target deploy date</Label>
            <Input type="date" className="mt-1" value={f.target_deploy_date} onChange={set("target_deploy_date")} />
          </div>
          <div>
            <Label>Target go-live date</Label>
            <Input type="date" className="mt-1" value={f.target_golive_date} onChange={set("target_golive_date")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea className="mt-1" rows={4} value={f.description} onChange={set("description")} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create request"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
