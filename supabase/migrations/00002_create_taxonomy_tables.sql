-- Migration: Create industries and specializations tables
-- Two-level taxonomy: Industry → Specialization
-- Used for profile career fields, directory filters, and recommendations.

-- =============================================================================
-- Industries (Level 1)
-- =============================================================================
create table public.industries (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_industries_active_sort on public.industries(is_archived, sort_order);

create trigger on_industries_updated
  before update on public.industries
  for each row
  execute function public.handle_updated_at();

-- =============================================================================
-- Specializations (Level 2)
-- =============================================================================
create table public.specializations (
  id uuid default uuid_generate_v4() primary key,
  industry_id uuid not null references public.industries(id) on delete cascade,
  name text not null,
  slug text not null unique,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_specializations_industry on public.specializations(industry_id);
create index idx_specializations_active_sort on public.specializations(industry_id, is_archived, sort_order);

create trigger on_specializations_updated
  before update on public.specializations
  for each row
  execute function public.handle_updated_at();

-- =============================================================================
-- Row-Level Security: industries
-- =============================================================================
alter table public.industries enable row level security;

-- Authenticated users can read active (non-archived) industries
create policy "industries_select_active"
  on public.industries for select
  using (
    auth.uid() is not null
    and is_archived = false
  );

-- Admins can read all industries (including archived)
create policy "industries_admins_select_all"
  on public.industries for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can insert industries
create policy "industries_admins_insert"
  on public.industries for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update industries
create policy "industries_admins_update"
  on public.industries for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- =============================================================================
-- Row-Level Security: specializations
-- =============================================================================
alter table public.specializations enable row level security;

-- Authenticated users can read active (non-archived) specializations
create policy "specializations_select_active"
  on public.specializations for select
  using (
    auth.uid() is not null
    and is_archived = false
  );

-- Admins can read all specializations (including archived)
create policy "specializations_admins_select_all"
  on public.specializations for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can insert specializations
create policy "specializations_admins_insert"
  on public.specializations for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update specializations
create policy "specializations_admins_update"
  on public.specializations for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
