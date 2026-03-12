-- Migration: Create public.users table
-- This table extends Supabase's auth.users with app-specific fields.
-- A trigger auto-creates a row here whenever a new user signs up via Supabase Auth.

-- Create the public.users table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user'
    check (role in ('user', 'moderator', 'admin')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_users_role on public.users(role);
create index idx_users_verification_status on public.users(verification_status);
create index idx_users_is_active on public.users(is_active);

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_users_updated
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- Auto-create public.users row when a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table public.users enable row level security;

-- 1. Users can read their own row (always, even if inactive)
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

-- 2. Authenticated users can read other active users (for directory, profiles, etc.)
create policy "users_select_active"
  on public.users for select
  using (
    auth.uid() is not null
    and is_active = true
  );

-- 3. Users can update their own row (limited to safe columns via Server Actions;
--    RLS allows the update, but Server Actions control which columns are set)
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4. Insert is handled by the trigger (runs as security definer), so no insert
--    policy is needed for regular users. Service role bypasses RLS for admin ops.

-- 5. Admins can read all users (including inactive) for user management
create policy "admins_select_all"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- 6. Admins can update any user (for role changes, verification, bans)
create policy "admins_update_all"
  on public.users for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
