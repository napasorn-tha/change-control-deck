CREATE OR REPLACE FUNCTION public.can_view_history(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid
    AND role IN ('admin','executive','cab_reviewer','deployment_coordinator'))
$$;

CREATE TABLE public.hist_taxonomy (
  code text PRIMARY KEY CHECK (code ~ '^[A-P]$'),
  name text NOT NULL,
  group_code text NOT NULL CHECK (group_code IN ('DATA_QUALITY','CAB_PROCESS','DEPLOYMENT','OTHER')),
  taxonomy_version text NOT NULL DEFAULT 'v1-2026-09-26',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hist_taxonomy TO authenticated;
GRANT ALL ON public.hist_taxonomy TO service_role;
ALTER TABLE public.hist_taxonomy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax read" ON public.hist_taxonomy FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()));
CREATE POLICY "tax admin" ON public.hist_taxonomy FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.hist_taxonomy TO authenticated;

INSERT INTO public.hist_taxonomy (code,name,group_code) VALUES
('A','Data type','DATA_QUALITY'),('B','Naming','DATA_QUALITY'),('C','Data design/Logic','DATA_QUALITY'),
('D','Standard/Structure','DATA_QUALITY'),('E','Impact/Users/Migration','DATA_QUALITY'),('F','QA/Testing','DATA_QUALITY'),
('G','Schedule/Dependency/Alert','DATA_QUALITY'),('H','Documentation','CAB_PROCESS'),('I','Rejected – no reason','CAB_PROCESS'),
('J','Cancelled/Duplicate','OTHER'),('K','Deploy issue/Defect/Config','DEPLOYMENT'),('L','Special approval','CAB_PROCESS'),
('M','Initial data/Cut over','DEPLOYMENT'),('N','Postponed','DEPLOYMENT'),('O','Deploy plan/time','DEPLOYMENT'),('P','Other','OTHER');

CREATE TABLE public.hist_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,
  file_sha256 text NOT NULL UNIQUE,
  snapshot_date date NOT NULL,
  taxonomy_version text NOT NULL,
  expected_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','passed','failed')),
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publish_requires_pass CHECK (NOT published OR validation_status = 'passed')
);
CREATE TRIGGER hist_datasets_touch BEFORE UPDATE ON public.hist_datasets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.hist_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  source_row integer NOT NULL,
  cr_number text NOT NULL,
  original_remark text NOT NULL,
  categorized_summary text,
  primary_category text NOT NULL REFERENCES public.hist_taxonomy(code),
  secondary_category text REFERENCES public.hist_taxonomy(code),
  source_date date,
  date_source text,
  confidence text NOT NULL CHECK (confidence IN ('High','Med','Low')),
  reject_type text CHECK (reject_type IN ('Explicit','Implied')),
  is_rejected boolean NOT NULL DEFAULT false,
  is_special_cab boolean NOT NULL DEFAULT false,
  deployment_outcome_id uuid,
  source_file text NOT NULL,
  taxonomy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, source_row),
  CONSTRAINT reject_type_consistent CHECK ((is_rejected AND reject_type IS NOT NULL) OR (NOT is_rejected AND reject_type IS NULL))
);
CREATE INDEX ON public.hist_issues (dataset_id, primary_category);

CREATE OR REPLACE FUNCTION public.hist_issue_immutable_remark()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.original_remark IS DISTINCT FROM OLD.original_remark OR NEW.cr_number IS DISTINCT FROM OLD.cr_number
     OR NEW.source_row IS DISTINCT FROM OLD.source_row OR NEW.source_file IS DISTINCT FROM OLD.source_file THEN
    RAISE EXCEPTION 'Original historical source fields are immutable; record an override instead';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER hist_issues_immutable BEFORE UPDATE ON public.hist_issues FOR EACH ROW EXECUTE FUNCTION public.hist_issue_immutable_remark();

CREATE TABLE public.hist_cab_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  cr_number text NOT NULL,
  round_no integer NOT NULL CHECK (round_no >= 1),
  cab_date date,
  session text,
  decision text NOT NULL CHECK (decision IN ('APPROVED','APPROVED_WITH_CONDITIONS','REJECTED','PENDING','SPECIAL_APPROVAL','CANCELLED')),
  reject_type text CHECK (reject_type IN ('Explicit','Implied')),
  confidence text NOT NULL DEFAULT 'Med' CHECK (confidence IN ('High','Med','Low')),
  date_source text,
  is_special_cab boolean NOT NULL DEFAULT false,
  source_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, cr_number, round_no)
);

CREATE TABLE public.hist_deployment_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  cr_number text NOT NULL,
  attempt_no integer NOT NULL DEFAULT 1,
  deploy_date date,
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS','PARTIAL_SUCCESS','FAILED','ROLLBACK','POSTPONED','UNKNOWN')),
  source_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, cr_number, attempt_no)
);
ALTER TABLE public.hist_issues ADD CONSTRAINT hist_issues_deploy_fk FOREIGN KEY (deployment_outcome_id) REFERENCES public.hist_deployment_outcomes(id) ON DELETE SET NULL;

CREATE TABLE public.hist_dq_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  cr_number text NOT NULL,
  flag_code text NOT NULL CHECK (flag_code IN ('F1','F2','F3','F4')),
  detail text,
  confirmation_status text NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending','confirmed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, cr_number, flag_code)
);

CREATE TABLE public.hist_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  target_table text NOT NULL CHECK (target_table IN ('hist_issues','hist_cab_rounds','hist_dq_flags','hist_deployment_outcomes')),
  target_id uuid NOT NULL,
  field text NOT NULL,
  original_value text,
  new_value text,
  reason text NOT NULL,
  confirmed_by uuid NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['hist_datasets','hist_issues','hist_cab_rounds','hist_deployment_outcomes','hist_dq_flags','hist_overrides'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "hist admin write" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

CREATE POLICY "hist datasets read" ON public.hist_datasets FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()) AND (published OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "hist issues read" ON public.hist_issues FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()) AND EXISTS (SELECT 1 FROM public.hist_datasets d WHERE d.id = dataset_id AND (d.published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "hist rounds read" ON public.hist_cab_rounds FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()) AND EXISTS (SELECT 1 FROM public.hist_datasets d WHERE d.id = dataset_id AND (d.published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "hist deploy read" ON public.hist_deployment_outcomes FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()) AND EXISTS (SELECT 1 FROM public.hist_datasets d WHERE d.id = dataset_id AND (d.published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "hist flags read" ON public.hist_dq_flags FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()) AND EXISTS (SELECT 1 FROM public.hist_datasets d WHERE d.id = dataset_id AND (d.published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "hist overrides read" ON public.hist_overrides FOR SELECT TO authenticated USING (public.can_view_history(auth.uid()));