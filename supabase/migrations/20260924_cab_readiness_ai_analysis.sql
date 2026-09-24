-- CAB360 prototype: QA readiness gate + AI pre-CAB analysis schema

alter table public.cab_requests
  add column if not exists qa_source text,
  add column if not exists qa_test_status text not null default 'PENDING',
  add column if not exists qa_approval_status text not null default 'PENDING';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cab_requests_qa_source_check'
  ) then
    alter table public.cab_requests
      add constraint cab_requests_qa_source_check
      check (qa_source is null or qa_source in ('DQA','END_USER','OTHER'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cab_requests_qa_test_status_check'
  ) then
    alter table public.cab_requests
      add constraint cab_requests_qa_test_status_check
      check (qa_test_status in ('PENDING','PASSED','FAILED'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cab_requests_qa_approval_status_check'
  ) then
    alter table public.cab_requests
      add constraint cab_requests_qa_approval_status_check
      check (qa_approval_status in ('NOT_REQUIRED','PENDING','APPROVED','REJECTED'));
  end if;
end $$;

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cab_requests(id) on delete cascade,
  status text not null default 'NOT_ANALYZED'
    check (status in ('NOT_ANALYZED','READY','PROCESSING','COMPLETED','FAILED')),
  executive_summary text,
  missing_information jsonb not null default '[]'::jsonb,
  inconsistencies jsonb not null default '[]'::jsonb,
  risk_signals jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_analyses enable row level security;

drop policy if exists "ai analyses read" on public.ai_analyses;
create policy "ai analyses read"
  on public.ai_analyses for select
  to authenticated
  using (true);

drop policy if exists "ai analyses insert" on public.ai_analyses;
create policy "ai analyses insert"
  on public.ai_analyses for insert
  to authenticated
  with check (true);

drop policy if exists "ai analyses update" on public.ai_analyses;
create policy "ai analyses update"
  on public.ai_analyses for update
  to authenticated
  using (true);
