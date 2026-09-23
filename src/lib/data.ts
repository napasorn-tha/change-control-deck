import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type CabRequest = T["cab_requests"]["Row"];
export type CabDocument = T["cab_documents"]["Row"];
export type Deployment = T["deployments"]["Row"];
export type Incident = T["incidents"]["Row"];
export type Condition = T["cab_conditions"]["Row"];
export type Decision = T["cab_decisions"]["Row"];
export type TechReview = T["technical_reviews"]["Row"];
export type Risk = T["risk_assessments"]["Row"];
export type ActivityRow = T["activity_log"]["Row"];
export type Project = T["projects"]["Row"];

function must<D>(res: { data: D | null; error: { message: string } | null }): D {
  if (res.error) throw new Error(res.error.message);
  return res.data as D;
}

export function useRequests() {
  return useQuery({
    queryKey: ["requests"],
    queryFn: async () =>
      must(await supabase.from("cab_requests").select("*").order("created_at", { ascending: false })),
  });
}

export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: async () =>
      must(
        await supabase
          .from("deployments")
          .select("*, cab_requests(request_code, topic, project_code, status)")
          .order("window_start", { ascending: true }),
      ),
  });
}

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: async () =>
      must(
        await supabase
          .from("incidents")
          .select("*, cab_requests(request_code, topic, status)")
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => must(await supabase.from("projects").select("*").order("code")),
  });
}

export function useActivity(requestId?: string) {
  return useQuery({
    queryKey: ["activity", requestId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("activity_log")
        .select("*, cab_requests(request_code)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (requestId) q = q.eq("request_id", requestId);
      return must(await q);
    },
  });
}

export function useAllConditions() {
  return useQuery({
    queryKey: ["conditions"],
    queryFn: async () => must(await supabase.from("cab_conditions").select("*")),
  });
}

export function useAllDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () =>
      must(
        await supabase
          .from("cab_documents")
          .select("*, cab_requests(request_code, topic, status, developer_id)")
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useRequestBundle(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const [req, docs, reviews, risk, decisions, conditions, deployments, incidents] =
        await Promise.all([
          supabase.from("cab_requests").select("*").eq("id", id).maybeSingle(),
          supabase.from("cab_documents").select("*").eq("request_id", id),
          supabase.from("technical_reviews").select("*").eq("request_id", id),
          supabase.from("risk_assessments").select("*").eq("request_id", id).maybeSingle(),
          supabase
            .from("cab_decisions")
            .select("*")
            .eq("request_id", id)
            .order("decided_at", { ascending: false }),
          supabase.from("cab_conditions").select("*").eq("request_id", id).order("created_at"),
          supabase
            .from("deployments")
            .select("*")
            .eq("request_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("incidents")
            .select("*")
            .eq("request_id", id)
            .order("created_at", { ascending: false }),
        ]);
      return {
        request: must(req),
        documents: must(docs),
        reviews: must(reviews),
        risk: must(risk),
        decisions: must(decisions),
        conditions: must(conditions),
        deployments: must(deployments),
        incidents: must(incidents),
      };
    },
  });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export async function openStoredFile(path: string) {
  const { data, error } = await supabase.storage.from("cab-documents").createSignedUrl(path, 300);
  if (error || !data) throw new Error(error?.message ?? "Could not open file");
  window.open(data.signedUrl, "_blank", "noopener");
}

export async function uploadFile(path: string, file: File) {
  const { error } = await supabase.storage
    .from("cab-documents")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
