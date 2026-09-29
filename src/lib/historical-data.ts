import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeAnalytics,
  validateSnapshot,
  type HistFlag,
  type HistIssue,
  type HistRound,
  type Snapshot,
  type Expected,
} from "@/lib/historical";
import type { Database } from "@/integrations/supabase/types";

type Dataset = Database["public"]["Tables"]["hist_datasets"]["Row"];

export type HistoricalSnapshot = {
  dataset: Dataset;
  snapshot: Snapshot;
  analytics: ReturnType<typeof computeAnalytics>;
  validationErrors: string[];
  flags: (HistFlag & { detail?: string | null })[];
};

/** Each request is RLS protected. Load in pages rather than silently truncating at the default API limit. */
async function pageThrough(table: "hist_issues" | "hist_cab_rounds" | "hist_dq_flags", datasetId: string) {
  const result: unknown[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("dataset_id", datasetId)
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    result.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
    // Prevent an accidental runaway query; refuse to display a partial snapshot.
    if (offset >= 99000) throw new Error("Historical dataset exceeds the configured safety limit.");
  }
  return result;
}

/** Never mix the historical snapshot with live operational metrics. */
export function useHistoricalSnapshot(enabled: boolean) {
  return useQuery({
    queryKey: ["historical-cab", "latest-published"],
    enabled,
    queryFn: async (): Promise<HistoricalSnapshot | null> => {
      const { data: dataset, error } = await supabase
        .from("hist_datasets")
        .select("*")
        .eq("published", true)
        .eq("validation_status", "passed")
        .order("snapshot_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!dataset) return null;
      const [issues, rounds, flags] = await Promise.all([
        pageThrough("hist_issues", dataset.id),
        pageThrough("hist_cab_rounds", dataset.id),
        pageThrough("hist_dq_flags", dataset.id),
      ]);
      const snapshot: Snapshot = {
        issues: issues as HistIssue[],
        rounds: rounds as HistRound[],
        flags: flags as HistFlag[],
      };
      const analytics = computeAnalytics(snapshot);
      const rawExpected = dataset.expected_counts;
      // Importer stores only canonical check keys. Ignore unrecognized metadata keys.
      const expected: Expected = {};
      if (rawExpected && typeof rawExpected === "object" && !Array.isArray(rawExpected)) {
        for (const key of ["analyzedIssueRows", "rejectEvents", "rejectedIssueRows", "multiRoundCrs"] as const) {
          const number = rawExpected[key];
          if (typeof number === "number" && Number.isFinite(number)) expected[key] = number;
        }
      }
      return {
        dataset,
        snapshot,
        analytics,
        validationErrors: validateSnapshot(analytics, expected),
        flags: flags as HistoricalSnapshot["flags"],
      };
    },
    staleTime: 60_000,
  });
}
