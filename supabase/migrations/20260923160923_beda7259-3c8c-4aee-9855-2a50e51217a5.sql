
-- ROLES
CREATE TYPE public.app_role AS ENUM ('developer','cab_reviewer','deployment_coordinator','executive','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  job_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, job_title)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'job_title')
  ON CONFLICT (id) DO NOTHING;
  BEGIN
    r := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'developer');
  EXCEPTION WHEN others THEN r := 'developer';
  END;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, r) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  owner_lead text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects write" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects update" ON public.projects FOR UPDATE TO authenticated USING (true);

-- CAB REQUESTS
CREATE TABLE public.cab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  project_code text NOT NULL,
  project_name text NOT NULL,
  topic text NOT NULL,
  pm_ba_lead text,
  developer_name text,
  developer_id uuid,
  change_type text NOT NULL CHECK (change_type IN ('ingestion','transformation','outbound','mixed')),
  cab_date date,
  target_deploy_date date,
  target_golive_date date,
  description text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','DOCUMENTS_PENDING','READY_FOR_CAB','IN_REVIEW','PASSED_WITH_CONDITIONS',
    'CONDITIONS_VERIFICATION','PASSED','NOT_APPROVED','DEPLOYMENT_BOOKED','DEPLOYING',
    'DEPLOYED','DEPLOY_FAILED','INCIDENT','CLOSED')),
  readiness_score int NOT NULL DEFAULT 0,
  risk_score int,
  risk_level text CHECK (risk_level IN ('low','medium','high','critical')),
  issue_category text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  passed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cab_requests TO authenticated;
GRANT ALL ON public.cab_requests TO service_role;
ALTER TABLE public.cab_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests read" ON public.cab_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "requests insert" ON public.cab_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "requests update" ON public.cab_requests FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER cab_requests_touch BEFORE UPDATE ON public.cab_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- DOCUMENTS
CREATE TABLE public.cab_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('code_artefacts','mop_document','deployment_checklist','qa_test_results','git_merge_request')),
  file_path text,
  file_name text,
  uploaded_at timestamptz,
  uploaded_by uuid,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected','missing')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cab_documents TO authenticated;
GRANT ALL ON public.cab_documents TO service_role;
ALTER TABLE public.cab_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs read" ON public.cab_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs insert" ON public.cab_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "docs update" ON public.cab_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "docs delete" ON public.cab_documents FOR DELETE TO authenticated USING (true);

-- TECHNICAL REVIEWS
CREATE TABLE public.technical_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('ingestion','transformation','outbound')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings text,
  issue_category text,
  reviewer_id uuid,
  reviewer_name text,
  reviewed_at timestamptz DEFAULT now(),
  UNIQUE (request_id, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_reviews TO authenticated;
GRANT ALL ON public.technical_reviews TO service_role;
ALTER TABLE public.technical_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr read" ON public.technical_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "tr insert" ON public.technical_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tr update" ON public.technical_reviews FOR UPDATE TO authenticated USING (true);

-- RISK
CREATE TABLE public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE UNIQUE,
  complexity int NOT NULL DEFAULT 1 CHECK (complexity BETWEEN 1 AND 5),
  dependency int NOT NULL DEFAULT 1 CHECK (dependency BETWEEN 1 AND 5),
  previous_issues int NOT NULL DEFAULT 0 CHECK (previous_issues BETWEEN 0 AND 5),
  score int NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'low' CHECK (level IN ('low','medium','high','critical')),
  notes text,
  assessed_by uuid,
  assessed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_assessments TO authenticated;
GRANT ALL ON public.risk_assessments TO service_role;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "risk read" ON public.risk_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk insert" ON public.risk_assessments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "risk update" ON public.risk_assessments FOR UPDATE TO authenticated USING (true);

-- DECISIONS
CREATE TABLE public.cab_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('passed','passed_with_conditions','not_approved')),
  comment text NOT NULL,
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cab_decisions TO authenticated;
GRANT ALL ON public.cab_decisions TO service_role;
ALTER TABLE public.cab_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dec read" ON public.cab_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dec insert" ON public.cab_decisions FOR INSERT TO authenticated WITH CHECK (true);

-- CONDITIONS
CREATE TABLE public.cab_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  condition_text text NOT NULL,
  assigned_to uuid,
  assigned_to_name text,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','ready_for_verification','verified','rejected')),
  developer_response text,
  evidence_path text,
  evidence_name text,
  verification_result text,
  verified_by uuid,
  verified_by_name text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cab_conditions TO authenticated;
GRANT ALL ON public.cab_conditions TO service_role;
ALTER TABLE public.cab_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cond read" ON public.cab_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cond insert" ON public.cab_conditions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cond update" ON public.cab_conditions FOR UPDATE TO authenticated USING (true);

-- DEPLOYMENTS
CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sit','uat','pre_production','production')),
  deploy_date date NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  coordinator_name text,
  coordinator_id uuid,
  notes text,
  attempt int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','deploying','completed','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployments TO authenticated;
GRANT ALL ON public.deployments TO service_role;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dep read" ON public.deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "dep insert" ON public.deployments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dep update" ON public.deployments FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER deployments_touch BEFORE UPDATE ON public.deployments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- INCIDENTS
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  deployment_id uuid REFERENCES public.deployments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  root_cause text,
  corrective_action text,
  scope_changed boolean,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','analysing','resolved')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inc read" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "inc insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inc update" ON public.incidents FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.cab_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  from_status text,
  to_status text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act read" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "act insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- VIEWS
CREATE VIEW public.v_cab_kpis WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.cab_requests WHERE status NOT IN ('CLOSED','DEPLOYED')) AS active_requests,
  (SELECT count(*) FROM public.cab_requests WHERE status IN ('READY_FOR_CAB','IN_REVIEW')) AS pending_review,
  (SELECT count(*) FROM public.cab_requests WHERE passed_at IS NOT NULL) AS passed,
  (SELECT count(*) FROM public.cab_requests WHERE risk_level IN ('high','critical') AND status NOT IN ('CLOSED')) AS high_risk,
  COALESCE(ROUND(100.0 * (SELECT count(*) FROM public.deployments WHERE status='completed')
    / NULLIF((SELECT count(*) FROM public.deployments WHERE status IN ('completed','failed')),0), 1), 0) AS deploy_success_rate;

CREATE VIEW public.v_funnel WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.cab_requests WHERE submitted_at IS NOT NULL) AS submitted,
  (SELECT count(*) FROM public.cab_requests WHERE reviewed_at IS NOT NULL) AS reviewed,
  (SELECT count(*) FROM public.cab_requests WHERE passed_at IS NOT NULL) AS passed,
  (SELECT count(DISTINCT request_id) FROM public.deployments) AS scheduled,
  (SELECT count(DISTINCT request_id) FROM public.deployments WHERE status='completed') AS deployed,
  (SELECT count(*) FROM public.cab_requests WHERE status='CLOSED') AS closed;

CREATE VIEW public.v_issue_categories WITH (security_invoker = true) AS
SELECT COALESCE(NULLIF(issue_category,''),'No Finding / No Issue') AS category, count(*) AS total
FROM public.cab_requests GROUP BY 1 ORDER BY 2 DESC;

CREATE VIEW public.v_requests_over_time WITH (security_invoker = true) AS
SELECT to_char(date_trunc('month', created_at),'YYYY-MM') AS month, count(*) AS total
FROM public.cab_requests GROUP BY 1 ORDER BY 1;

CREATE VIEW public.v_turnaround WITH (security_invoker = true) AS
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400.0)::numeric,1) AS avg_cab_days,
  ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - passed_at))/86400.0)::numeric,1) AS avg_passed_to_deploy_days
FROM public.cab_requests WHERE submitted_at IS NOT NULL;

CREATE VIEW public.v_project_stats WITH (security_invoker = true) AS
SELECT project_code, project_name, count(*) AS requests,
  count(*) FILTER (WHERE issue_category IS NOT NULL AND issue_category <> '') AS issues,
  count(*) FILTER (WHERE risk_level IN ('high','critical')) AS high_risk
FROM public.cab_requests GROUP BY 1,2 ORDER BY 3 DESC;

CREATE VIEW public.v_change_type_stats WITH (security_invoker = true) AS
SELECT change_type, count(*) AS total FROM public.cab_requests GROUP BY 1;

CREATE VIEW public.v_risk_distribution WITH (security_invoker = true) AS
SELECT COALESCE(risk_level,'unassessed') AS level, count(*) AS total FROM public.cab_requests GROUP BY 1;

CREATE VIEW public.v_deployment_trend WITH (security_invoker = true) AS
SELECT to_char(date_trunc('month', deploy_date),'YYYY-MM') AS month,
  count(*) FILTER (WHERE status='completed') AS completed,
  count(*) FILTER (WHERE status='failed') AS failed
FROM public.deployments GROUP BY 1 ORDER BY 1;

GRANT SELECT ON public.v_cab_kpis, public.v_funnel, public.v_issue_categories,
  public.v_requests_over_time, public.v_turnaround, public.v_project_stats,
  public.v_change_type_stats, public.v_risk_distribution, public.v_deployment_trend TO authenticated;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.cab_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cab_conditions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deployments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cab_documents;

-- ===================== DEMO DATA =====================
INSERT INTO public.projects (code, name, owner_lead) VALUES
 ('DWH-CRM','CRM Data Ingestion Platform','Pimchanok S.'),
 ('DWH-FIN','Finance Data Mart','Anan K.'),
 ('DWH-RISK','Risk & Compliance Outbound','Kittipong T.'),
 ('DWH-MKT','Marketing 360 Transformation','Napasorn T.'),
 ('DWH-OPS','Operations Reporting','Somchai P.');

INSERT INTO public.cab_requests
 (request_code, project_code, project_name, topic, pm_ba_lead, developer_name, change_type, cab_date, target_deploy_date, target_golive_date, description, status, readiness_score, risk_score, risk_level, issue_category, submitted_at, reviewed_at, passed_at, closed_at, created_at)
VALUES
 ('CAB-2026-001','DWH-CRM','CRM Data Ingestion Platform','Add Salesforce incremental ingestion','Pimchanok S.','Arun W.','ingestion','2026-09-10','2026-09-18','2026-09-25','New incremental CDC pipeline for Salesforce accounts and contacts.','CLOSED',100,34,'medium','No Finding / No Issue', now()-interval '30 day', now()-interval '28 day', now()-interval '28 day', now()-interval '20 day', now()-interval '32 day'),
 ('CAB-2026-002','DWH-FIN','Finance Data Mart','GL transformation logic revision','Anan K.','Nuttapong L.','transformation','2026-09-12','2026-09-20','2026-09-28','Rework of GL aggregation and currency conversion logic.','CLOSED',100,52,'high','Data Type Standard', now()-interval '27 day', now()-interval '25 day', now()-interval '24 day', now()-interval '16 day', now()-interval '29 day'),
 ('CAB-2026-003','DWH-RISK','Risk & Compliance Outbound','Regulatory outbound file v2','Kittipong T.','Supattra C.','outbound','2026-09-22','2026-09-30','2026-10-05','New data contract for regulator outbound extract.','IN_REVIEW',100,71,'high','Data Contract Gap', now()-interval '6 day', NULL, NULL, NULL, now()-interval '9 day'),
 ('CAB-2026-004','DWH-MKT','Marketing 360 Transformation','Customer segmentation model refresh','Napasorn T.','Chaiwat R.','transformation','2026-09-24','2026-10-02','2026-10-09','Refresh of segmentation transformation and lineage documentation.','READY_FOR_CAB',100,28,'low',NULL, now()-interval '3 day', NULL, NULL, NULL, now()-interval '5 day'),
 ('CAB-2026-005','DWH-OPS','Operations Reporting','Ops daily snapshot ingestion','Somchai P.','Arun W.','ingestion','2026-09-25','2026-10-03','2026-10-10','Daily snapshot ingestion from operations Oracle source.','DOCUMENTS_PENDING',80,NULL,NULL,NULL, NULL, NULL, NULL, NULL, now()-interval '2 day'),
 ('CAB-2026-006','DWH-CRM','CRM Data Ingestion Platform','Contact schema change handling','Pimchanok S.','Nuttapong L.','mixed','2026-09-18','2026-09-26','2026-10-01','Schema evolution handling for contact source tables.','PASSED_WITH_CONDITIONS',100,58,'high','Naming Standard', now()-interval '10 day', now()-interval '8 day', NULL, NULL, now()-interval '12 day'),
 ('CAB-2026-007','DWH-FIN','Finance Data Mart','Cost centre outbound feed','Anan K.','Supattra C.','outbound','2026-09-16','2026-09-24','2026-09-30','New outbound feed to finance consolidation system.','NOT_APPROVED',100,66,'high','Lineage Validation', now()-interval '11 day', now()-interval '9 day', NULL, NULL, now()-interval '13 day'),
 ('CAB-2026-008','DWH-MKT','Marketing 360 Transformation','Campaign attribution rebuild','Napasorn T.','Chaiwat R.','transformation','2026-09-14','2026-09-21','2026-09-27','Rebuild of attribution transformation layer.','PASSED',100,44,'medium','No Finding / No Issue', now()-interval '14 day', now()-interval '12 day', now()-interval '12 day', NULL, now()-interval '16 day'),
 ('CAB-2026-009','DWH-RISK','Risk & Compliance Outbound','Exposure mart ingestion tuning','Kittipong T.','Arun W.','ingestion','2026-09-11','2026-09-19','2026-09-26','Performance tuning for exposure ingestion jobs.','DEPLOYMENT_BOOKED',100,39,'medium','Source Connectivity', now()-interval '18 day', now()-interval '16 day', now()-interval '16 day', NULL, now()-interval '20 day'),
 ('CAB-2026-010','DWH-OPS','Operations Reporting','SLA breach outbound alerting','Somchai P.','Supattra C.','outbound','2026-09-08','2026-09-15','2026-09-22','Outbound alerting for SLA breaches to ops platform.','INCIDENT',100,78,'critical','Data Type Compatibility', now()-interval '22 day', now()-interval '20 day', now()-interval '20 day', NULL, now()-interval '24 day'),
 ('CAB-2026-011','DWH-CRM','CRM Data Ingestion Platform','Lead source harmonisation','Pimchanok S.','Chaiwat R.','transformation','2026-09-05','2026-09-12','2026-09-19','Harmonise lead source values across CRM feeds.','CLOSED',100,22,'low','Lineage Documentation Gap', now()-interval '26 day', now()-interval '24 day', now()-interval '24 day', now()-interval '14 day', now()-interval '28 day'),
 ('CAB-2026-012','DWH-FIN','Finance Data Mart','Budget ingestion from SAP','Anan K.','Nuttapong L.','ingestion','2026-09-26','2026-10-05','2026-10-12','New SAP budget extract ingestion.','READY_FOR_CAB',100,49,'medium',NULL, now()-interval '1 day', NULL, NULL, NULL, now()-interval '4 day'),
 ('CAB-2026-013','DWH-MKT','Marketing 360 Transformation','Consent flag outbound','Napasorn T.','Supattra C.','outbound','2026-09-20','2026-09-28','2026-10-04','Outbound of consent flags to campaign tool.','DEPLOYED',100,31,'low','No Finding / No Issue', now()-interval '16 day', now()-interval '14 day', now()-interval '14 day', NULL, now()-interval '18 day'),
 ('CAB-2026-014','DWH-OPS','Operations Reporting','Asset master mixed change','Somchai P.','Arun W.','mixed','2026-09-28','2026-10-08','2026-10-15','Asset master ingestion plus transformation updates.','DRAFT',20,NULL,NULL,NULL,NULL,NULL,NULL,NULL, now()-interval '1 day');

UPDATE public.cab_requests r SET project_id = p.id FROM public.projects p WHERE p.code = r.project_code;

-- documents: all complete except 005 (missing QA) and 014 (mostly missing)
INSERT INTO public.cab_documents (request_id, doc_type, file_name, uploaded_at, review_status)
SELECT r.id, d.doc_type, 'demo-'||d.doc_type||'.pdf', r.created_at + interval '1 day', 'approved'
FROM public.cab_requests r
CROSS JOIN (VALUES ('code_artefacts'),('mop_document'),('deployment_checklist'),('qa_test_results'),('git_merge_request')) AS d(doc_type)
WHERE r.request_code NOT IN ('CAB-2026-005','CAB-2026-014');

INSERT INTO public.cab_documents (request_id, doc_type, file_name, uploaded_at, review_status, comment)
SELECT r.id, d.doc_type, 'demo-'||d.doc_type||'.pdf', r.created_at + interval '1 day', 'approved', NULL
FROM public.cab_requests r
CROSS JOIN (VALUES ('code_artefacts'),('mop_document'),('deployment_checklist'),('git_merge_request')) AS d(doc_type)
WHERE r.request_code = 'CAB-2026-005';

INSERT INTO public.cab_documents (request_id, doc_type, review_status, comment)
SELECT r.id, 'qa_test_results', 'missing', 'QA test results not uploaded yet'
FROM public.cab_requests r WHERE r.request_code = 'CAB-2026-005';

INSERT INTO public.cab_documents (request_id, doc_type, file_name, uploaded_at, review_status)
SELECT r.id, 'code_artefacts', 'demo-code_artefacts.zip', now(), 'pending'
FROM public.cab_requests r WHERE r.request_code = 'CAB-2026-014';

INSERT INTO public.risk_assessments (request_id, complexity, dependency, previous_issues, score, level, notes)
SELECT r.id,
  GREATEST(1, LEAST(5, (r.risk_score/20)+1)),
  GREATEST(1, LEAST(5, (r.risk_score/25)+1)),
  CASE WHEN r.risk_score > 60 THEN 2 ELSE 0 END,
  r.risk_score, r.risk_level, 'Assessed during CAB technical review.'
FROM public.cab_requests r WHERE r.risk_score IS NOT NULL;

INSERT INTO public.technical_reviews (request_id, section, checklist, findings, issue_category, reviewer_name)
SELECT r.id, 'ingestion',
 '{"source_connectivity":"pass","schema_readiness":"pass","data_type_compatibility":"pass","load_strategy":"pass","data_volume":"pass","error_handling":"pass"}'::jsonb,
 'Source connectivity and incremental strategy validated.', NULL, 'Wanida S.'
FROM public.cab_requests r WHERE r.change_type IN ('ingestion','mixed') AND r.reviewed_at IS NOT NULL;

INSERT INTO public.technical_reviews (request_id, section, checklist, findings, issue_category, reviewer_name)
SELECT r.id, 'transformation',
 '{"business_logic":"pass","data_quality":"pass","naming_standards":"pass","data_types":"pass","dependency":"pass","lineage":"pass"}'::jsonb,
 'Business logic and lineage reviewed.', r.issue_category, 'Wanida S.'
FROM public.cab_requests r WHERE r.change_type IN ('transformation','mixed') AND r.reviewed_at IS NOT NULL;

INSERT INTO public.technical_reviews (request_id, section, checklist, findings, issue_category, reviewer_name)
SELECT r.id, 'outbound',
 '{"target_interface":"pass","consumer_dependency":"pass","data_contract":"pass","validation":"pass","delivery_schedule":"pass","failure_handling":"pass"}'::jsonb,
 'Data contract and delivery schedule confirmed with consumer.', r.issue_category, 'Wanida S.'
FROM public.cab_requests r WHERE r.change_type = 'outbound' AND r.reviewed_at IS NOT NULL;

INSERT INTO public.cab_decisions (request_id, decision, comment, decided_by_name, decided_at)
SELECT r.id,
  CASE WHEN r.status='NOT_APPROVED' THEN 'not_approved'
       WHEN r.status='PASSED_WITH_CONDITIONS' THEN 'passed_with_conditions'
       ELSE 'passed' END,
  CASE WHEN r.status='NOT_APPROVED' THEN 'Lineage validation incomplete; resubmit after correction.'
       WHEN r.status='PASSED_WITH_CONDITIONS' THEN 'Approved subject to naming standard corrections and updated MOP.'
       ELSE 'Approved by CAB. No blocking findings.' END,
  'Wanida S.', r.reviewed_at
FROM public.cab_requests r WHERE r.reviewed_at IS NOT NULL;

INSERT INTO public.cab_conditions (request_id, condition_text, assigned_to_name, status, developer_response, verification_result, verified_by_name, verified_at)
SELECT r.id, 'Rename staging columns to match DWH naming standard', 'Nuttapong L.', 'verified', 'Columns renamed and redeployed to SIT.', 'Verified against naming standard checklist.', 'Wanida S.', now()-interval '6 day'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-006';
INSERT INTO public.cab_conditions (request_id, condition_text, assigned_to_name, status, developer_response)
SELECT r.id, 'Update MOP with rollback steps for schema evolution', 'Nuttapong L.', 'ready_for_verification', 'MOP v1.3 uploaded with rollback section.'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-006';
INSERT INTO public.cab_conditions (request_id, condition_text, assigned_to_name, status)
SELECT r.id, 'Provide data quality test evidence for contact merge', 'Nuttapong L.', 'open'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-006';

INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, started_at, completed_at, notes)
SELECT r.id, 'production', (now()-interval '20 day')::date, now()-interval '20 day', now()-interval '20 day'+interval '3 hour', 'Preecha M.', 'completed', 1, now()-interval '20 day', now()-interval '20 day'+interval '2 hour', 'Deployed without issues.'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-001';
INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, started_at, completed_at)
SELECT r.id, 'production', (now()-interval '16 day')::date, now()-interval '16 day', now()-interval '16 day'+interval '3 hour', 'Preecha M.', 'completed', 1, now()-interval '16 day', now()-interval '16 day'+interval '1 hour'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-002';
INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, started_at, completed_at)
SELECT r.id, 'production', (now()-interval '14 day')::date, now()-interval '14 day', now()-interval '14 day'+interval '2 hour', 'Preecha M.', 'completed', 1, now()-interval '14 day', now()-interval '14 day'+interval '1 hour'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-011';
INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, started_at, completed_at)
SELECT r.id, 'production', (now()-interval '5 day')::date, now()-interval '5 day', now()-interval '5 day'+interval '2 hour', 'Preecha M.', 'completed', 1, now()-interval '5 day', now()-interval '5 day'+interval '1 hour'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-013';
INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, notes)
SELECT r.id, 'production', (now()+interval '3 day')::date, now()+interval '3 day', now()+interval '3 day'+interval '3 hour', 'Preecha M.', 'scheduled', 1, 'Night window, requires DBA standby.'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-009';
INSERT INTO public.deployments (request_id, environment, deploy_date, window_start, window_end, coordinator_name, status, attempt, started_at, completed_at, notes)
SELECT r.id, 'production', (now()-interval '9 day')::date, now()-interval '9 day', now()-interval '9 day'+interval '3 hour', 'Preecha M.', 'failed', 1, now()-interval '9 day', now()-interval '9 day'+interval '1 hour', 'Outbound file rejected by consumer due to data type mismatch.'
FROM public.cab_requests r WHERE r.request_code='CAB-2026-010';

INSERT INTO public.incidents (request_id, deployment_id, title, description, root_cause, corrective_action, scope_changed, status)
SELECT d.request_id, d.id, 'SLA outbound file rejected in production',
 'Consumer system rejected the outbound alert file during the production window.',
 'Decimal precision mismatch between DWH column and consumer data contract.',
 'Align column precision and add contract validation step before delivery.', false, 'analysing'
FROM public.deployments d JOIN public.cab_requests r ON r.id=d.request_id WHERE r.request_code='CAB-2026-010';

INSERT INTO public.activity_log (request_id, actor_name, action, from_status, to_status, comment, created_at)
SELECT r.id, COALESCE(r.developer_name,'System'), 'Request created', NULL, 'DRAFT', 'CAB request registered.', r.created_at FROM public.cab_requests r;
INSERT INTO public.activity_log (request_id, actor_name, action, from_status, to_status, comment, created_at)
SELECT r.id, COALESCE(r.developer_name,'System'), 'Documents uploaded', 'DRAFT', 'DOCUMENTS_PENDING', 'Required documents uploaded.', r.created_at + interval '1 day' FROM public.cab_requests r WHERE r.request_code <> 'CAB-2026-014';
INSERT INTO public.activity_log (request_id, actor_name, action, from_status, to_status, comment, created_at)
SELECT r.id, COALESCE(r.developer_name,'System'), 'Submitted to CAB', 'READY_FOR_CAB', 'READY_FOR_CAB', 'Readiness check passed, submitted to CAB queue.', r.submitted_at FROM public.cab_requests r WHERE r.submitted_at IS NOT NULL;
INSERT INTO public.activity_log (request_id, actor_name, action, from_status, to_status, comment, created_at)
SELECT r.id, 'Wanida S.', 'CAB decision recorded', 'IN_REVIEW', r.status, 'Decision recorded by CAB reviewer.', r.reviewed_at FROM public.cab_requests r WHERE r.reviewed_at IS NOT NULL;
INSERT INTO public.activity_log (request_id, actor_name, action, from_status, to_status, comment, created_at)
SELECT d.request_id, COALESCE(d.coordinator_name,'Coordinator'), 'Deployment '||d.status, 'PASSED', CASE WHEN d.status='completed' THEN 'DEPLOYED' WHEN d.status='failed' THEN 'DEPLOY_FAILED' ELSE 'DEPLOYMENT_BOOKED' END, COALESCE(d.notes,'Deployment record updated.'), COALESCE(d.completed_at, d.window_start) FROM public.deployments d;
