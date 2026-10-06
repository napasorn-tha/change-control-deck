-- Closed-loop deployment intelligence for the CAB360 prototype.
-- Additive only: does not import any company records.
ALTER TABLE public.deployments
  ADD COLUMN IF NOT EXISTS outcome text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deployments_outcome_check'
  ) THEN
    ALTER TABLE public.deployments
      ADD CONSTRAINT deployments_outcome_check
      CHECK (outcome IS NULL OR outcome IN ('SUCCESS','PARTIAL_SUCCESS','FAILED','ROLLBACK','POSTPONED'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.deployment_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  taxonomy_domain text NOT NULL DEFAULT 'DEP' CHECK (taxonomy_domain = 'DEP'),
  taxonomy_version text NOT NULL DEFAULT 'dep-v1-2026-10-07',
  category_code text NOT NULL CHECK (category_code IN ('A','B','C','D','E','F','G')),
  issue_text text NOT NULL CHECK (length(btrim(issue_text)) > 0),
  root_cause text,
  resolution text,
  resolution_status text NOT NULL DEFAULT 'open'
    CHECK (resolution_status IN ('open','resolved','follow_up')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  source_kind text NOT NULL DEFAULT 'operational'
    CHECK (source_kind IN ('operational','historical_import')),
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((resolution_status = 'resolved' AND resolution IS NOT NULL) OR resolution_status <> 'resolved')
);
CREATE INDEX IF NOT EXISTS deployment_issues_request_idx ON public.deployment_issues(request_id);
CREATE INDEX IF NOT EXISTS deployment_issues_deployment_idx ON public.deployment_issues(deployment_id);
CREATE INDEX IF NOT EXISTS deployment_issues_category_idx ON public.deployment_issues(category_code);
CREATE INDEX IF NOT EXISTS deployment_issues_status_idx ON public.deployment_issues(resolution_status);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  deployment_id uuid REFERENCES public.deployments(id) ON DELETE SET NULL,
  external_ref text,
  request_type text NOT NULL CHECK (request_type IN ('PATCH_DATA','UPDATE_CONFIG','REPROCESS','OTHER')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  environment text NOT NULL DEFAULT 'production',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  needed_by timestamptz,
  preferred_window text,
  estimated_duration_minutes integer CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0),
  objective text NOT NULL CHECK (length(btrim(objective)) > 0),
  target_objects jsonb NOT NULL DEFAULT '[]'::jsonb,
  execution_steps text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_request_idx ON public.service_requests(request_id);
CREATE INDEX IF NOT EXISTS service_requests_deployment_idx ON public.service_requests(deployment_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests(status);

ALTER TABLE public.deployment_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployment_issues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.deployment_issues TO service_role;
GRANT ALL ON public.service_requests TO service_role;

DROP POLICY IF EXISTS "deployment issues read" ON public.deployment_issues;
CREATE POLICY "deployment issues read" ON public.deployment_issues FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "deployment issues write" ON public.deployment_issues;
CREATE POLICY "deployment issues write" ON public.deployment_issues FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'deployment_coordinator'::public.app_role)
    OR public.has_role(auth.uid(),'developer'::public.app_role)
    OR public.has_role(auth.uid(),'cab_reviewer'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'deployment_coordinator'::public.app_role)
    OR public.has_role(auth.uid(),'developer'::public.app_role)
    OR public.has_role(auth.uid(),'cab_reviewer'::public.app_role)
  );

DROP POLICY IF EXISTS "service requests read" ON public.service_requests;
CREATE POLICY "service requests read" ON public.service_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service requests write" ON public.service_requests;
CREATE POLICY "service requests write" ON public.service_requests FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'deployment_coordinator'::public.app_role)
    OR public.has_role(auth.uid(),'developer'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'deployment_coordinator'::public.app_role)
    OR public.has_role(auth.uid(),'developer'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.touch_deployment_intelligence_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS touch_deployment_issues_updated_at ON public.deployment_issues;
CREATE TRIGGER touch_deployment_issues_updated_at
BEFORE UPDATE ON public.deployment_issues
FOR EACH ROW EXECUTE FUNCTION public.touch_deployment_intelligence_updated_at();

DROP TRIGGER IF EXISTS touch_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER touch_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_deployment_intelligence_updated_at();
