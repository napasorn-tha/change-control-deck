-- Historical CAB import: additive RPC. Admin-only, transactional, no real records seeded.
CREATE TABLE IF NOT EXISTS public.hist_import_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.hist_datasets(id) ON DELETE CASCADE,
  sheet_name text NOT NULL CHECK (sheet_name IN ('5_DQ_Flags','6_To_Confirm')),
  source_row integer NOT NULL CHECK (source_row > 0),
  cr_reference text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('observation','pending','confirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, sheet_name, source_row)
);
ALTER TABLE public.hist_import_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hist_import_notes TO authenticated;
GRANT ALL ON public.hist_import_notes TO service_role;
CREATE POLICY "hist notes admin write" ON public.hist_import_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "hist notes published read" ON public.hist_import_notes FOR SELECT TO authenticated
  USING (public.can_view_history(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.hist_datasets d WHERE d.id = dataset_id
      AND (d.published OR public.has_role(auth.uid(),'admin'::public.app_role))
  ));

CREATE OR REPLACE FUNCTION public.hist_import_snapshot(p jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_id uuid;
  e jsonb;
  n_issue integer;
  n_rejected_issue integer;
  n_dq integer;
  n_reject integer;
  n_explicit integer;
  n_implied integer;
  n_multi integer;
  n_f1 integer;
  n_f2 integer;
  n_f3 integer;
  n_f4 integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Historical import requires actual Admin role';
  END IF;
  IF p IS NULL OR octet_length(p::text) > 4000000
     OR jsonb_typeof(p->'issues') <> 'array'
     OR jsonb_typeof(p->'rounds') <> 'array'
     OR jsonb_typeof(p->'flags') <> 'array'
     OR jsonb_typeof(p->'notes') <> 'array'
     OR jsonb_typeof(p->'expected_counts') <> 'object'
     OR COALESCE(p->>'file_sha256','') !~ '^[a-f0-9]{64}$'
     OR COALESCE(p->>'taxonomy_version','') <> 'v1-2026-09-26'
     OR COALESCE(length(p->>'source_file'),0) NOT BETWEEN 5 AND 255 THEN
    RAISE EXCEPTION 'Invalid import envelope';
  END IF;
  IF jsonb_array_length(p->'issues') < 1 OR jsonb_array_length(p->'issues') > 5000
     OR jsonb_array_length(p->'rounds') > 10000
     OR jsonb_array_length(p->'flags') > 10000
     OR jsonb_array_length(p->'notes') > 10000 THEN
    RAISE EXCEPTION 'Invalid historical row counts';
  END IF;

  e := p->'expected_counts';
  INSERT INTO public.hist_datasets(source_file,file_sha256,snapshot_date,taxonomy_version,
         expected_counts,validation_status,imported_by,published)
    VALUES(p->>'source_file',p->>'file_sha256',(p->>'snapshot_date')::date,
         p->>'taxonomy_version',e,'pending',auth.uid(),false)
    RETURNING id INTO v_id;

  INSERT INTO public.hist_issues(dataset_id,source_row,cr_number,original_remark,primary_category,
    secondary_category,source_date,date_source,confidence,is_rejected,reject_type,is_special_cab,
    source_file,taxonomy_version)
  SELECT v_id, x.source_row,x.cr_number,x.original_remark,x.primary_category,
    NULLIF(x.secondary_category,''),x.source_date::date,x.date_source,x.confidence,
    COALESCE(x.is_rejected,false),x.reject_type,COALESCE(x.is_special_cab,false),
    p->>'source_file',p->>'taxonomy_version'
  FROM jsonb_to_recordset(p->'issues') AS x(
    source_row integer, cr_number text, original_remark text, primary_category text,
    secondary_category text, source_date text, date_source text, confidence text,
    is_rejected boolean, reject_type text, is_special_cab boolean);

  INSERT INTO public.hist_cab_rounds(dataset_id,cr_number,round_no,cab_date,session,decision,reject_type,is_special_cab)
  SELECT v_id,x.cr_number,x.round_no,x.cab_date::date,x.session,x.decision,x.reject_type,
    COALESCE(x.is_special_cab,false)
  FROM jsonb_to_recordset(p->'rounds') AS x(
    cr_number text, round_no integer, cab_date text, session text, decision text,
    reject_type text, is_special_cab boolean);

  INSERT INTO public.hist_dq_flags(dataset_id,cr_number,flag_code,detail,confirmation_status)
  SELECT v_id,x.cr_number,x.flag_code,x.detail,COALESCE(NULLIF(x.confirmation_status,''),'pending')
  FROM jsonb_to_recordset(p->'flags') AS x(
    cr_number text, flag_code text, detail text, confirmation_status text);

  INSERT INTO public.hist_import_notes(dataset_id,sheet_name,source_row,cr_reference,label,detail,status)
  SELECT v_id,x.sheet_name,x.source_row,COALESCE(x.cr_reference,''),COALESCE(x.label,''),
    COALESCE(x.detail,''),COALESCE(x.status,'pending')
  FROM jsonb_to_recordset(p->'notes') AS x(
    sheet_name text,source_row integer,cr_reference text,label text,detail text,status text);

  SELECT COUNT(*), COUNT(*) FILTER(WHERE is_rejected),
    COUNT(*) FILTER(WHERE primary_category BETWEEN 'A' AND 'G')
  INTO n_issue,n_rejected_issue,n_dq FROM public.hist_issues WHERE dataset_id=v_id;
  SELECT COUNT(*),COUNT(*) FILTER(WHERE reject_type='Explicit'),COUNT(*) FILTER(WHERE reject_type='Implied')
  INTO n_reject,n_explicit,n_implied FROM (
    SELECT cr_number,cab_date,
      CASE WHEN bool_or(reject_type='Explicit') THEN 'Explicit' ELSE 'Implied' END AS reject_type
    FROM public.hist_cab_rounds WHERE dataset_id=v_id AND decision='REJECTED'
    GROUP BY cr_number,cab_date
  ) t;
  SELECT COUNT(*) INTO n_multi FROM (
    SELECT cr_number FROM public.hist_cab_rounds WHERE dataset_id=v_id GROUP BY cr_number HAVING count(*) > 1
  ) t;
  SELECT COUNT(*) FILTER(WHERE flag_code='F1'), COUNT(*) FILTER(WHERE flag_code='F2'),
         COUNT(*) FILTER(WHERE flag_code='F3'), COUNT(*) FILTER(WHERE flag_code='F4')
  INTO n_f1,n_f2,n_f3,n_f4 FROM public.hist_dq_flags WHERE dataset_id=v_id;

  IF EXISTS (SELECT 1 FROM public.hist_cab_rounds
       WHERE dataset_id=v_id AND decision='REJECTED' AND cab_date IS NULL)
     OR EXISTS (SELECT 1 FROM public.hist_cab_rounds
       WHERE dataset_id=v_id AND decision='REJECTED' AND reject_type IS NULL)
     OR n_issue <> (e->>'analyzedIssueRows')::integer
     OR n_rejected_issue <> (e->>'rejectedIssueRows')::integer
     OR n_dq <> (e->>'dqIssues')::integer
     OR n_reject <> (e->>'rejectEvents')::integer
     OR n_explicit <> (e->>'explicit')::integer
     OR n_implied <> (e->>'implied')::integer
     OR n_multi <> (e->>'multiRoundCrs')::integer
     OR n_f1 <> (e->'flagCounts'->>'F1')::integer
     OR n_f2 <> (e->'flagCounts'->>'F2')::integer
     OR n_f3 <> (e->'flagCounts'->>'F3')::integer
     OR n_f4 <> (e->'flagCounts'->>'F4')::integer THEN
    RAISE EXCEPTION 'Historical workbook reconciliation failed; transaction rolled back';
  END IF;
  UPDATE public.hist_datasets
  SET computed_counts=jsonb_build_object(
    'analyzedIssueRows',n_issue,'rejectedIssueRows',n_rejected_issue,'dqIssues',n_dq,
    'rejectEvents',n_reject,'explicit',n_explicit,'implied',n_implied,
    'multiRoundCrs',n_multi,
    'flagCounts',jsonb_build_object('F1',n_f1,'F2',n_f2,'F3',n_f3,'F4',n_f4)),
    validation_status='passed',validation_errors='[]'::jsonb
  WHERE id=v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.hist_import_snapshot(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hist_import_snapshot(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.hist_publish_snapshot(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_record public.hist_datasets%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only Admin can publish historical CAB data';
  END IF;
  SELECT * INTO v_record FROM public.hist_datasets WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_record.validation_status <> 'passed'
     OR v_record.computed_counts <> v_record.expected_counts THEN
    RAISE EXCEPTION 'Dataset is missing or counts no longer match';
  END IF;
  IF EXISTS(SELECT 1 FROM public.hist_cab_rounds
      WHERE dataset_id=p_id AND decision='REJECTED' AND cab_date IS NULL) THEN
    RAISE EXCEPTION 'A rejected round needs its CAB date confirmed';
  END IF;
  UPDATE public.hist_datasets SET published=true WHERE id=p_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.hist_publish_snapshot(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hist_publish_snapshot(uuid) TO authenticated;
