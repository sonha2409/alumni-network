-- Migration: Fix infinite recursion in admin RLS policies
-- Problem: Admin policies on public.users subquery public.users itself,
--   causing infinite recursion when Postgres evaluates all SELECT policies.
-- Fix: A security definer function bypasses RLS, breaking the cycle.

-- =============================================================================
-- Helper function: check if current user is admin (bypasses RLS)
-- =============================================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- =============================================================================
-- Fix: public.users policies
-- =============================================================================

-- Drop old admin policies
drop policy if exists "admins_select_all" on public.users;
drop policy if exists "admins_update_all" on public.users;

-- Recreate with is_admin()
create policy "admins_select_all"
  on public.users for select
  using (public.is_admin());

create policy "admins_update_all"
  on public.users for update
  using (public.is_admin());

-- =============================================================================
-- Fix: public.industries policies
-- =============================================================================

drop policy if exists "industries_admins_select_all" on public.industries;
drop policy if exists "industries_admins_insert" on public.industries;
drop policy if exists "industries_admins_update" on public.industries;

create policy "industries_admins_select_all"
  on public.industries for select
  using (public.is_admin());

create policy "industries_admins_insert"
  on public.industries for insert
  with check (public.is_admin());

create policy "industries_admins_update"
  on public.industries for update
  using (public.is_admin());

-- =============================================================================
-- Fix: public.specializations policies
-- =============================================================================

drop policy if exists "specializations_admins_select_all" on public.specializations;
drop policy if exists "specializations_admins_insert" on public.specializations;
drop policy if exists "specializations_admins_update" on public.specializations;

create policy "specializations_admins_select_all"
  on public.specializations for select
  using (public.is_admin());

create policy "specializations_admins_insert"
  on public.specializations for insert
  with check (public.is_admin());

create policy "specializations_admins_update"
  on public.specializations for update
  using (public.is_admin());
