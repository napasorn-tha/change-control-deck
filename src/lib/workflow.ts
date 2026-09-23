import { supabase } from "@/integrations/supabase/client";
import { logActivity, type AppRole, type CabStatus } from "@/lib/cab";

export type Actor = { id: string | null; name: string; role: AppRole | null };

export function can(role: AppRole | null, ...allowed: AppRole[]) {
  return role === "admin" || (role != null && allowed.includes(role));
}

/**
 * Allowed status transitions. Enforces the three separate CAB outcomes:
 *  PASSED → booking; PASSED_WITH_CONDITIONS → rework → verify → PASSED;
 *  NOT_APPROVED → developer fix → resubmit → CAB review again.
 */
export const TRANSITIONS: Record<CabStatus, CabStatus[]> = {
  DRAFT: ["DOCUMENTS_PENDING", "READY_FOR_CAB"],
  DOCUMENTS_PENDING: ["READY_FOR_CAB"],
  READY_FOR_CAB: ["IN_REVIEW"],
  IN_REVIEW: ["PASSED", "PASSED_WITH_CONDITIONS", "NOT_APPROVED"],
  PASSED_WITH_CONDITIONS: ["CONDITIONS_VERIFICATION"],
  CONDITIONS_VERIFICATION: ["PASSED", "PASSED_WITH_CONDITIONS"],
  PASSED: ["DEPLOYMENT_BOOKED"],
  NOT_APPROVED: ["DOCUMENTS_PENDING", "READY_FOR_CAB"],
  DEPLOYMENT_BOOKED: ["DEPLOYING", "PASSED"],
  DEPLOYING: ["DEPLOYED", "DEPLOY_FAILED"],
  DEPLOYED: ["CLOSED"],
  DEPLOY_FAILED: ["INCIDENT"],
  INCIDENT: ["PASSED", "DOCUMENTS_PENDING"],
  CLOSED: [],
};

export async function transition(
  requestId: string,
  from: string,
  to: CabStatus,
  actor: Actor,
  action: string,
  comment?: string | null,
  extra: Record<string, unknown> = {},
) {
  const allowed = TRANSITIONS[from as CabStatus] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Not allowed: ${from} → ${to}`);
  }
  const { error } = await supabase
    .from("cab_requests")
    .update({ status: to, ...extra })
    .eq("id", requestId)
    .eq("status", from);
  if (error) throw new Error(error.message);
  await logActivity({
    request_id: requestId,
    actor_id: actor.id,
    actor_name: actor.name,
    action,
    from_status: from,
    to_status: to,
    comment: comment ?? null,
  });
}
