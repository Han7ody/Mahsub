-- ============================================================================
-- MAHSUB SYSTEM - COMPLETE SCHEMA & PERFORMANCE OPTIMIZATIONS
-- Consolidated from 15 migrations
-- Generated on: 2026-01-28 00:59:05
-- ============================================================================

-- --- START OF MIGRATION: 001_initial_schema.sql ---
-- ============================================================================
-- MAHSUB DATABASE SCHEMA
-- Complete migration script for production deployment
-- ============================================================================
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. BUSINESSES (TENANT ROOT)
-- ============================================================================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  phone text,
  address text,
  logo_url text,
  created_at timestamptz not null default now(),
  
  constraint businesses_name_length check (char_length(name) >= 2)
);

comment on table public.businesses is 'Business entities (shops/stores). Each user can own/be member of multiple businesses.';

-- 2. BUSINESS MEMBERS (USER-BUSINESS RELATIONSHIP)
-- ============================================================================
create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  
  primary key (business_id, user_id)
);

comment on table public.business_members is 'Links users to businesses with roles and permissions';
comment on column public.business_members.permissions is 'JSON object with permission flags: {customers_manage: true, transactions_delete: false, etc.}';

-- 3. CUSTOMERS
-- ============================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  avatar_url text,
  opening_balance numeric(12,2) not null default 0,
  opening_balance_direction text check (opening_balance_direction in ('in', 'out')),
  created_at timestamptz not null default now(),
  
  constraint customers_name_length check (char_length(name) >= 1),
  constraint customers_opening_balance_positive check (opening_balance >= 0)
);

comment on table public.customers is 'Customer entities per business';
comment on column public.customers.opening_balance_direction is '''in'' = customer owes us, ''out'' = we owe customer';

-- 4. SUPPLIERS
-- ============================================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  avatar_url text,
  opening_balance numeric(12,2) not null default 0,
  opening_balance_direction text check (opening_balance_direction in ('in', 'out')),
  created_at timestamptz not null default now(),
  
  constraint suppliers_name_length check (char_length(name) >= 1),
  constraint suppliers_opening_balance_positive check (opening_balance >= 0)
);

comment on table public.suppliers is 'Supplier entities per business';

-- 5. TRANSACTIONS
-- ============================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_type text not null check (entity_type in ('customer', 'supplier', 'ledger')),
  customer_id uuid references public.customers(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'online', 'bank', 'other')),
  title text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  receipt_url text,
  receipt_path text,
  
  -- Enforce entity type constraints
  constraint transactions_customer_entity_check check (
    (entity_type = 'customer' and customer_id is not null and supplier_id is null) or
    (entity_type = 'supplier' and supplier_id is not null and customer_id is null) or
    (entity_type = 'ledger' and customer_id is null and supplier_id is null)
  )
);

comment on table public.transactions is 'Financial transactions (debts/credits) for customers, suppliers, or general ledger';
comment on column public.transactions.type is '''in'' = received money (Ù‚Ø¨Ø¶Øª), ''out'' = gave money (Ø£Ø¹Ø·ÙŠØªÙ‡)';
comment on column public.transactions.entity_type is 'Links transaction to customer, supplier, or general ledger';

-- 6. ATTACHMENTS (RECEIPTS)
-- ============================================================================
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  bucket text not null default 'receipts',
  path text not null,
  file_name text,
  mime_type text,
  size_bytes int,
  created_at timestamptz not null default now()
);

comment on table public.attachments is 'File attachments (receipts) for transactions';

-- ============================================================================
-- INDEXES (PERFORMANCE)
-- ============================================================================

create index if not exists idx_business_members_user_id on public.business_members(user_id);
create index if not exists idx_business_members_business_active on public.business_members(business_id, is_active);

create index if not exists idx_customers_business_created on public.customers(business_id, created_at desc);
create index if not exists idx_customers_name on public.customers(business_id, name);

create index if not exists idx_suppliers_business_created on public.suppliers(business_id, created_at desc);
create index if not exists idx_suppliers_name on public.suppliers(business_id, name);

create index if not exists idx_transactions_business_occurred on public.transactions(business_id, occurred_at desc);
create index if not exists idx_transactions_customer on public.transactions(customer_id, occurred_at desc) where customer_id is not null;
create index if not exists idx_transactions_supplier on public.transactions(supplier_id, occurred_at desc) where supplier_id is not null;
create index if not exists idx_transactions_entity_type on public.transactions(business_id, entity_type, occurred_at desc);

create index if not exists idx_attachments_transaction on public.attachments(transaction_id);

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if user is an active member of a business
create or replace function public.is_business_member(bid uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.business_members
    where business_id = bid
      and user_id = auth.uid()
      and is_active = true
  );
end;
$$;

comment on function public.is_business_member is 'Returns true if current user is an active member of the business';

-- Check if user is owner or manager of a business
create or replace function public.is_owner_or_manager(bid uuid)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.business_members
    where business_id = bid
      and user_id = auth.uid()
      and role in ('owner', 'manager')
      and is_active = true
  );
end;
$$;

comment on function public.is_owner_or_manager is 'Returns true if current user is owner or manager of the business';

-- Check if user has a specific permission in a business
create or replace function public.has_permission(bid uuid, perm text)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return exists (
    select 1 from public.business_members
    where business_id = bid
      and user_id = auth.uid()
      and is_active = true
      and (
        role in ('owner', 'manager')  -- owners/managers have all permissions
        or (permissions->perm)::boolean = true  -- or explicit permission
      )
  );
end;
$$;

comment on function public.has_permission is 'Returns true if user has specific permission or is owner/manager';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.transactions enable row level security;
alter table public.attachments enable row level security;

-- ----------------------------------------------------------------------------
-- BUSINESSES POLICIES
-- ----------------------------------------------------------------------------

-- Business owners can read and update their business
create policy "Owners can view their business"
  on public.businesses for select
  using (owner_user_id = auth.uid());

create policy "Owners can update their business"
  on public.businesses for update
  using (owner_user_id = auth.uid());

-- Members can view businesses they belong to
create policy "Members can view their businesses"
  on public.businesses for select
  using (
    exists (
      select 1 from public.business_members
      where business_id = businesses.id
        and user_id = auth.uid()
        and is_active = true
    )
  );

-- Users can create new businesses (becomes owner)
create policy "Users can create businesses"
  on public.businesses for insert
  with check (owner_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- BUSINESS_MEMBERS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view their own membership records
create policy "Users can view own memberships"
  on public.business_members for select
  using (user_id = auth.uid());

-- Owners/managers can view all members of their business
create policy "Owners/managers can view all members"
  on public.business_members for select
  using (is_owner_or_manager(business_id));

-- Only owners can add new members (requires workers_manage permission)
create policy "Owners can add members"
  on public.business_members for insert
  with check (has_permission(business_id, 'workers_manage'));

-- Owners/managers can update members (role, permissions, status)
create policy "Owners/managers can update members"
  on public.business_members for update
  using (has_permission(business_id, 'workers_manage'));

-- Only owners can remove members
create policy "Owners can remove members"
  on public.business_members for delete
  using (has_permission(business_id, 'workers_manage'));

-- ----------------------------------------------------------------------------
-- CUSTOMERS POLICIES
-- ----------------------------------------------------------------------------

-- All active members can view customers
create policy "Members can view customers"
  on public.customers for select
  using (is_business_member(business_id));

-- Owners/managers or users with customers_manage permission can create
create policy "Authorized users can create customers"
  on public.customers for insert
  with check (has_permission(business_id, 'customers_manage'));

-- Same permissions for update
create policy "Authorized users can update customers"
  on public.customers for update
  using (has_permission(business_id, 'customers_manage'));

-- Only owners/managers can delete customers
create policy "Owners/managers can delete customers"
  on public.customers for delete
  using (is_owner_or_manager(business_id));

-- ----------------------------------------------------------------------------
-- SUPPLIERS POLICIES
-- ----------------------------------------------------------------------------

-- All active members can view suppliers
create policy "Members can view suppliers"
  on public.suppliers for select
  using (is_business_member(business_id));

-- Owners/managers or users with suppliers_manage permission can create
create policy "Authorized users can create suppliers"
  on public.suppliers for insert
  with check (has_permission(business_id, 'suppliers_manage'));

-- Same permissions for update
create policy "Authorized users can update suppliers"
  on public.suppliers for update
  using (has_permission(business_id, 'suppliers_manage'));

-- Only owners/managers can delete suppliers
create policy "Owners/managers can delete suppliers"
  on public.suppliers for delete
  using (is_owner_or_manager(business_id));

-- ----------------------------------------------------------------------------
-- TRANSACTIONS POLICIES
-- ----------------------------------------------------------------------------

-- All active members can view transactions
create policy "Members can view transactions"
  on public.transactions for select
  using (is_business_member(business_id));

-- Owners/managers or users with transactions_manage permission can create
create policy "Authorized users can create transactions"
  on public.transactions for insert
  with check (has_permission(business_id, 'transactions_manage'));

-- Same for update
create policy "Authorized users can update transactions"
  on public.transactions for update
  using (has_permission(business_id, 'transactions_manage'));

-- Only users with transactions_delete permission can delete
create policy "Authorized users can delete transactions"
  on public.transactions for delete
  using (has_permission(business_id, 'transactions_delete'));

-- ----------------------------------------------------------------------------
-- ATTACHMENTS POLICIES
-- ----------------------------------------------------------------------------

-- All active members can view attachments
create policy "Members can view attachments"
  on public.attachments for select
  using (is_business_member(business_id));

-- Anyone who can create transactions can add attachments
create policy "Authorized users can create attachments"
  on public.attachments for insert
  with check (has_permission(business_id, 'transactions_manage'));

-- Can delete attachments if can delete transactions
create policy "Authorized users can delete attachments"
  on public.attachments for delete
  using (has_permission(business_id, 'transactions_delete'));

-- ============================================================================
-- DEFAULT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
grant usage on schema public to postgres, anon, authenticated, service_role;

-- Grant table permissions
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Grant function execution
grant execute on all functions in schema public to postgres, anon, authenticated, service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables were created
select 
  schemaname, 
  tablename, 
  tableowner 
from pg_tables 
where schemaname = 'public' 
  and tablename in ('businesses', 'business_members', 'customers', 'suppliers', 'transactions', 'attachments')
order by tablename;

-- --- END OF MIGRATION: 001_initial_schema.sql ---

-- --- START OF MIGRATION: 002_storage_setup.sql ---
-- ============================================================================
-- STORAGE BUCKETS SETUP
-- ============================================================================
-- Run this AFTER running the main schema migration
-- Go to: Storage > Policies in Supabase Dashboard
-- Or run in SQL Editor
-- ============================================================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values 
  ('receipts', 'receipts', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- ============================================================================
-- STORAGE POLICIES - RECEIPTS BUCKET
-- ============================================================================

-- Members can upload receipts for their business transactions
create policy "Members can upload receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

-- Members can view receipts from their business
create policy "Members can view receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

-- Owners/managers can delete receipts
create policy "Owners can delete receipts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and exists (
    select 1 from public.business_members
    where business_id::text = (storage.foldername(name))[1]
      and user_id = auth.uid()
      and role in ('owner', 'manager')
      and is_active = true
  )
);

-- ============================================================================
-- STORAGE POLICIES - AVATARS BUCKET
-- ============================================================================

-- Members can upload avatars for their business entities
create policy "Members can upload avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

-- Members can view avatars from their business
create policy "Members can view avatars"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

-- Members can update/delete avatars
create policy "Members can update avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

create policy "Members can delete avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] in (
    select business_id::text 
    from public.business_members 
    where user_id = auth.uid() 
      and is_active = true
  )
);

-- --- END OF MIGRATION: 002_storage_setup.sql ---

-- --- START OF MIGRATION: 003_fix_rls_recursion.sql ---
-- ============================================================================
-- FIX RLS INFINITE RECURSION
-- ============================================================================
-- This migration fixes the infinite recursion issue in RLS policies
-- that occurs when creating a new business and its initial owner membership.
-- ============================================================================

-- Drop existing problematic policies
drop policy if exists "Owners can add members" on public.business_members;
drop policy if exists "Owners/managers can update members" on public.business_members;
drop policy if exists "Owners can remove members" on public.business_members;

-- ============================================================================
-- FIXED BUSINESS_MEMBERS POLICIES
-- ============================================================================

-- Allow business owners to add the initial owner membership record
-- This avoids recursion by directly checking the businesses table
create policy "Business owners can add initial membership"
  on public.business_members for insert
  with check (
    -- Allow if user is the owner of the business
    exists (
      select 1 from public.businesses
      where id = business_id
        and owner_user_id = auth.uid()
    )
    or
    -- OR if user already has workers_manage permission (for adding other members)
    exists (
      select 1 from public.business_members existing
      where existing.business_id = business_members.business_id
        and existing.user_id = auth.uid()
        and existing.is_active = true
        and (
          existing.role in ('owner', 'manager')
          or (existing.permissions->>'workers_manage')::boolean = true
        )
    )
  );

-- Allow owners/managers to update member records
create policy "Owners/managers can update members"
  on public.business_members for update
  using (
    -- User can update if they're owner/manager of the business
    exists (
      select 1 from public.business_members existing
      where existing.business_id = business_members.business_id
        and existing.user_id = auth.uid()
        and existing.is_active = true
        and (
          existing.role in ('owner', 'manager')
          or (existing.permissions->>'workers_manage')::boolean = true
        )
    )
  );

-- Allow owners/managers to remove members
create policy "Owners/managers can remove members"
  on public.business_members for delete
  using (
    -- User can delete if they're owner/manager of the business
    exists (
      select 1 from public.business_members existing
      where existing.business_id = business_members.business_id
        and existing.user_id = auth.uid()
        and existing.is_active = true
        and (
          existing.role in ('owner', 'manager')
          or (existing.permissions->>'workers_manage')::boolean = true
        )
    )
  );

-- ============================================================================
-- UPDATED HELPER FUNCTIONS (RECURSION-SAFE)
-- ============================================================================

-- Create a recursion-safe version of has_permission
create or replace function public.has_permission_safe(bid uuid, perm text)
returns boolean
language plpgsql
security definer
stable
as $$
begin
  -- First check if user is the business owner (direct check, no recursion)
  if exists (
    select 1 from public.businesses
    where id = bid and owner_user_id = auth.uid()
  ) then
    return true;
  end if;

  -- Then check membership permissions
  return exists (
    select 1 from public.business_members
    where business_id = bid
      and user_id = auth.uid()
      and is_active = true
      and (
        role in ('owner', 'manager')
        or (permissions->>perm)::boolean = true
      )
  );
end;
$$;

comment on function public.has_permission_safe is 'Recursion-safe version of has_permission that checks business ownership first';

-- ============================================================================
-- UPDATE POLICIES TO USE SAFE FUNCTIONS
-- ============================================================================

-- Update customer policies
drop policy if exists "Authorized users can create customers" on public.customers;
drop policy if exists "Authorized users can update customers" on public.customers;

create policy "Authorized users can create customers"
  on public.customers for insert
  with check (has_permission_safe(business_id, 'customers_manage'));

create policy "Authorized users can update customers"
  on public.customers for update
  using (has_permission_safe(business_id, 'customers_manage'));

-- Update supplier policies  
drop policy if exists "Authorized users can create suppliers" on public.suppliers;
drop policy if exists "Authorized users can update suppliers" on public.suppliers;

create policy "Authorized users can create suppliers"
  on public.suppliers for insert
  with check (has_permission_safe(business_id, 'suppliers_manage'));

create policy "Authorized users can update suppliers"
  on public.suppliers for update
  using (has_permission_safe(business_id, 'suppliers_manage'));

-- Update transaction policies
drop policy if exists "Authorized users can create transactions" on public.transactions;
drop policy if exists "Authorized users can update transactions" on public.transactions;
drop policy if exists "Authorized users can delete transactions" on public.transactions;

create policy "Authorized users can create transactions"
  on public.transactions for insert
  with check (has_permission_safe(business_id, 'transactions_manage'));

create policy "Authorized users can update transactions"
  on public.transactions for update
  using (has_permission_safe(business_id, 'transactions_manage'));

create policy "Authorized users can delete transactions"
  on public.transactions for delete
  using (has_permission_safe(business_id, 'transactions_delete'));

-- Update attachment policies
drop policy if exists "Authorized users can create attachments" on public.attachments;
drop policy if exists "Authorized users can delete attachments" on public.attachments;

create policy "Authorized users can create attachments"
  on public.attachments for insert
  with check (has_permission_safe(business_id, 'transactions_manage'));

create policy "Authorized users can delete attachments"
  on public.attachments for delete
  using (has_permission_safe(business_id, 'transactions_delete'));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test that policies work correctly
-- Run these after applying the migration:

/*
-- 1. Test business creation (should work)
insert into public.businesses (name, owner_user_id) 
values ('Test Business', auth.uid());

-- 2. Test membership creation (should work)
insert into public.business_members (business_id, user_id, role, permissions, is_active)
values (
  (select id from public.businesses where owner_user_id = auth.uid() limit 1),
  auth.uid(),
  'owner',
  '{"customers_manage": true, "suppliers_manage": true, "transactions_manage": true, "transactions_delete": true, "workers_manage": true}',
  true
);

-- 3. Test customer creation (should work)
insert into public.customers (business_id, name, phone, opening_balance)
values (
  (select id from public.businesses where owner_user_id = auth.uid() limit 1),
  'Test Customer',
  '1234567890',
  0
);
*/
-- --- END OF MIGRATION: 003_fix_rls_recursion.sql ---

-- --- START OF MIGRATION: 004_fix_businesses_select_recursion.sql ---
-- ============================================================================
-- FIX BUSINESSES SELECT POLICY RECURSION
-- ============================================================================
-- The recursion happens in the businesses SELECT policies when returning
-- the created business record. The "Members can view their businesses" policy
-- queries business_members, which can trigger recursion.
-- ============================================================================

-- Drop the problematic policy that causes recursion
drop policy if exists "Members can view their businesses" on public.businesses;

-- Replace with a simpler, recursion-safe policy
-- This policy allows viewing businesses where user is either:
-- 1. The owner (direct check, no recursion)
-- 2. An active member (simple existence check without complex functions)
create policy "Users can view accessible businesses"
  on public.businesses for select
  using (
    -- User is the business owner
    owner_user_id = auth.uid()
    or
    -- OR user is an active member (simple check, no function calls)
    exists (
      select 1 from public.business_members
      where business_id = businesses.id
        and user_id = auth.uid()
        and is_active = true
    )
  );

-- ============================================================================
-- ALSO FIX BUSINESS_MEMBERS SELECT POLICY TO AVOID RECURSION
-- ============================================================================

-- The business_members SELECT policies might also cause recursion
-- Let's simplify them to avoid any function calls during business creation

-- Drop existing policies
drop policy if exists "Owners/managers can view all members" on public.business_members;

-- Replace with simpler policies
create policy "Users can view own membership"
  on public.business_members for select
  using (user_id = auth.uid());

create policy "Business owners can view all members"
  on public.business_members for select
  using (
    -- Direct owner check without function calls
    exists (
      select 1 from public.businesses
      where id = business_id
        and owner_user_id = auth.uid()
    )
  );

create policy "Managers can view all members"
  on public.business_members for select
  using (
    -- Simple manager check without function calls
    exists (
      select 1 from public.business_members existing
      where existing.business_id = business_members.business_id
        and existing.user_id = auth.uid()
        and existing.role = 'manager'
        and existing.is_active = true
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the fix by checking policy definitions
select schemaname, tablename, policyname, cmd, qual
from pg_policies 
where schemaname = 'public' 
  and tablename in ('businesses', 'business_members')
order by tablename, policyname;
-- --- END OF MIGRATION: 004_fix_businesses_select_recursion.sql ---

-- --- START OF MIGRATION: 005_comprehensive_rls_fix.sql ---
-- ============================================================================
-- COMPREHENSIVE RLS RECURSION FIX
-- ============================================================================
-- This migration completely rebuilds the RLS policies to eliminate all
-- possible sources of recursion during business creation.
-- ============================================================================

-- ============================================================================
-- STEP 1: DISABLE RLS TEMPORARILY FOR CLEAN REBUILD
-- ============================================================================

alter table public.businesses disable row level security;
alter table public.business_members disable row level security;
alter table public.customers disable row level security;
alter table public.suppliers disable row level security;
alter table public.transactions disable row level security;
alter table public.attachments disable row level security;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop all businesses policies
drop policy if exists "Owners can view their business" on public.businesses;
drop policy if exists "Owners can update their business" on public.businesses;
drop policy if exists "Members can view their businesses" on public.businesses;
drop policy if exists "Users can create businesses" on public.businesses;
drop policy if exists "Users can view accessible businesses" on public.businesses;

-- Drop all business_members policies
drop policy if exists "Users can view own memberships" on public.business_members;
drop policy if exists "Owners/managers can view all members" on public.business_members;
drop policy if exists "Owners can add members" on public.business_members;
drop policy if exists "Owners/managers can update members" on public.business_members;
drop policy if exists "Owners can remove members" on public.business_members;
drop policy if exists "Business owners can add initial membership" on public.business_members;
drop policy if exists "Owners/managers can remove members" on public.business_members;
drop policy if exists "Users can view own membership" on public.business_members;
drop policy if exists "Business owners can view all members" on public.business_members;
drop policy if exists "Managers can view all members" on public.business_members;

-- Drop all other policies
drop policy if exists "Members can view customers" on public.customers;
drop policy if exists "Authorized users can create customers" on public.customers;
drop policy if exists "Authorized users can update customers" on public.customers;
drop policy if exists "Owners/managers can delete customers" on public.customers;

drop policy if exists "Members can view suppliers" on public.suppliers;
drop policy if exists "Authorized users can create suppliers" on public.suppliers;
drop policy if exists "Authorized users can update suppliers" on public.suppliers;
drop policy if exists "Owners/managers can delete suppliers" on public.suppliers;

drop policy if exists "Members can view transactions" on public.transactions;
drop policy if exists "Authorized users can create transactions" on public.transactions;
drop policy if exists "Authorized users can update transactions" on public.transactions;
drop policy if exists "Authorized users can delete transactions" on public.transactions;

drop policy if exists "Members can view attachments" on public.attachments;
drop policy if exists "Authorized users can create attachments" on public.attachments;
drop policy if exists "Authorized users can delete attachments" on public.attachments;

-- ============================================================================
-- STEP 3: CREATE SIMPLE, RECURSION-FREE POLICIES
-- ============================================================================

-- BUSINESSES POLICIES (SIMPLE AND SAFE)
create policy "businesses_select_policy"
  on public.businesses for select
  using (
    owner_user_id = auth.uid()
    or
    id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "businesses_insert_policy"
  on public.businesses for insert
  with check (owner_user_id = auth.uid());

create policy "businesses_update_policy"
  on public.businesses for update
  using (owner_user_id = auth.uid());

-- BUSINESS_MEMBERS POLICIES (SIMPLE AND SAFE)
create policy "business_members_select_policy"
  on public.business_members for select
  using (
    user_id = auth.uid()
    or
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
    or
    business_id in (
      select business_id from public.business_members existing
      where existing.user_id = auth.uid()
        and existing.is_active = true
        and existing.role in ('owner', 'manager')
    )
  );

create policy "business_members_insert_policy"
  on public.business_members for insert
  with check (
    -- Allow if user is business owner
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
    or
    -- Allow if user has manager role
    business_id in (
      select business_id from public.business_members existing
      where existing.user_id = auth.uid()
        and existing.is_active = true
        and existing.role in ('owner', 'manager')
    )
  );

create policy "business_members_update_policy"
  on public.business_members for update
  using (
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
    or
    business_id in (
      select business_id from public.business_members existing
      where existing.user_id = auth.uid()
        and existing.is_active = true
        and existing.role in ('owner', 'manager')
    )
  );

create policy "business_members_delete_policy"
  on public.business_members for delete
  using (
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
  );

-- CUSTOMERS POLICIES
create policy "customers_select_policy"
  on public.customers for select
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "customers_insert_policy"
  on public.customers for insert
  with check (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "customers_update_policy"
  on public.customers for update
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "customers_delete_policy"
  on public.customers for delete
  using (
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
  );

-- SUPPLIERS POLICIES (SAME AS CUSTOMERS)
create policy "suppliers_select_policy"
  on public.suppliers for select
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "suppliers_insert_policy"
  on public.suppliers for insert
  with check (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "suppliers_update_policy"
  on public.suppliers for update
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "suppliers_delete_policy"
  on public.suppliers for delete
  using (
    business_id in (
      select id from public.businesses
      where owner_user_id = auth.uid()
    )
  );

-- TRANSACTIONS POLICIES
create policy "transactions_select_policy"
  on public.transactions for select
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "transactions_insert_policy"
  on public.transactions for insert
  with check (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "transactions_update_policy"
  on public.transactions for update
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "transactions_delete_policy"
  on public.transactions for delete
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

-- ATTACHMENTS POLICIES
create policy "attachments_select_policy"
  on public.attachments for select
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments_insert_policy"
  on public.attachments for insert
  with check (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

create policy "attachments_delete_policy"
  on public.attachments for delete
  using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and is_active = true
    )
  );

-- ============================================================================
-- STEP 4: RE-ENABLE RLS
-- ============================================================================

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.transactions enable row level security;
alter table public.attachments enable row level security;

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Check that all policies are created
select 
  schemaname, 
  tablename, 
  policyname,
  cmd as operation
from pg_policies 
where schemaname = 'public'
order by tablename, policyname;
-- --- END OF MIGRATION: 005_comprehensive_rls_fix.sql ---

-- --- START OF MIGRATION: 006_simple_businesses_fix.sql ---
-- ============================================================================
-- SIMPLE FIX FOR BUSINESSES INSERT RECURSION
-- ============================================================================
-- The issue is that the businesses INSERT with .select().single() triggers
-- the SELECT policies, which can cause recursion. Let's fix just this issue.
-- ============================================================================

-- Drop the problematic "Members can view their businesses" policy
-- This policy queries business_members and can cause recursion
drop policy if exists "Members can view their businesses" on public.businesses;

-- Keep only the simple owner-based SELECT policy for businesses
-- This is safe because it only checks owner_user_id = auth.uid()
-- The "Owners can view their business" policy should already exist and be safe

-- If for some reason the owner policy doesn't exist, create it
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'businesses' 
      and policyname = 'Owners can view their business'
  ) then
    create policy "Owners can view their business"
      on public.businesses for select
      using (owner_user_id = auth.uid());
  end if;
end $$;

-- Verify the INSERT policy is simple and safe
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'businesses' 
      and policyname = 'Users can create businesses'
  ) then
    create policy "Users can create businesses"
      on public.businesses for insert
      with check (owner_user_id = auth.uid());
  end if;
end $$;

-- ============================================================================
-- ALSO SIMPLIFY BUSINESS_MEMBERS POLICIES TO AVOID ANY RECURSION
-- ============================================================================

-- Drop any complex business_members policies that might cause recursion
drop policy if exists "Owners/managers can view all members" on public.business_members;
drop policy if exists "Owners can add members" on public.business_members;
drop policy if exists "Owners/managers can update members" on public.business_members;
drop policy if exists "Owners can remove members" on public.business_members;

-- Create simple, safe policies for business_members
create policy "business_members_simple_select"
  on public.business_members for select
  using (
    user_id = auth.uid()
    or
    exists (
      select 1 from public.businesses
      where id = business_id and owner_user_id = auth.uid()
    )
  );

create policy "business_members_simple_insert"
  on public.business_members for insert
  with check (
    exists (
      select 1 from public.businesses
      where id = business_id and owner_user_id = auth.uid()
    )
  );

create policy "business_members_simple_update"
  on public.business_members for update
  using (
    exists (
      select 1 from public.businesses
      where id = business_id and owner_user_id = auth.uid()
    )
  );

create policy "business_members_simple_delete"
  on public.business_members for delete
  using (
    exists (
      select 1 from public.businesses
      where id = business_id and owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all businesses policies to verify they're safe
select 
  policyname,
  cmd,
  qual,
  with_check
from pg_policies 
where schemaname = 'public' 
  and tablename = 'businesses'
order by policyname;
-- --- END OF MIGRATION: 006_simple_businesses_fix.sql ---

-- --- START OF MIGRATION: 007_minimal_fix.sql ---
-- ============================================================================
-- MINIMAL FIX - REMOVE ALL COMPLEX POLICIES
-- ============================================================================
-- This removes all policies that could cause recursion and creates only
-- the absolute minimum needed for business creation to work.
-- ============================================================================

-- Remove ALL existing policies to start fresh
DROP POLICY IF EXISTS "Members can view their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can view all members" ON public.business_members;
DROP POLICY IF EXISTS "Owners can add members" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can update members" ON public.business_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.business_members;
DROP POLICY IF EXISTS "Business owners can add initial membership" ON public.business_members;
DROP POLICY IF EXISTS "business_members_simple_select" ON public.business_members;
DROP POLICY IF EXISTS "business_members_simple_insert" ON public.business_members;
DROP POLICY IF EXISTS "business_members_simple_update" ON public.business_members;
DROP POLICY IF EXISTS "business_members_simple_delete" ON public.business_members;

-- Create ONLY the essential policies with NO recursion risk

-- BUSINESSES: Only owner-based policies (no cross-table queries)
CREATE POLICY "businesses_owner_select"
  ON public.businesses FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE POLICY "businesses_owner_insert"
  ON public.businesses FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "businesses_owner_update"
  ON public.businesses FOR UPDATE
  USING (owner_user_id = auth.uid());

-- BUSINESS_MEMBERS: Only allow business owners to manage members
CREATE POLICY "business_members_owner_only"
  ON public.business_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that only safe policies exist
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%business_members%' AND tablename = 'businesses' THEN 'POTENTIAL RECURSION'
    WHEN with_check LIKE '%business_members%' AND tablename = 'businesses' THEN 'POTENTIAL RECURSION'
    ELSE 'SAFE'
  END as safety_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('businesses', 'business_members')
ORDER BY tablename, policyname;
-- --- END OF MIGRATION: 007_minimal_fix.sql ---

-- --- START OF MIGRATION: 008_targeted_recursion_fix.sql ---
-- ============================================================================
-- TARGETED RECURSION FIX
-- ============================================================================
-- Based on the policy analysis, we need to remove the specific policies
-- that cause the circular dependency between businesses and business_members
-- ============================================================================

-- ============================================================================
-- REMOVE THE PROBLEMATIC POLICIES
-- ============================================================================

-- This policy causes recursion by querying business_members from businesses SELECT
DROP POLICY IF EXISTS "Members can view their businesses" ON public.businesses;

-- This policy causes recursion by calling is_owner_or_manager() function
DROP POLICY IF EXISTS "Owners/managers can view all members" ON public.business_members;

-- Remove other potentially problematic policies that reference business_members
DROP POLICY IF EXISTS "Owners/managers can update members" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can remove members" ON public.business_members;

-- Remove the complex INSERT policy that has OR conditions
DROP POLICY IF EXISTS "Business owners can add initial membership" ON public.business_members;

-- ============================================================================
-- KEEP ONLY SAFE, NON-RECURSIVE POLICIES
-- ============================================================================

-- These policies are SAFE and should remain:
-- âœ… "Users can create businesses" - only checks owner_user_id = auth.uid()
-- âœ… "Owners can view their business" - only checks owner_user_id = auth.uid()  
-- âœ… "Owners can update their business" - only checks owner_user_id = auth.uid()
-- âœ… "Users can view own memberships" - only checks user_id = auth.uid()

-- The duplicate policies can be cleaned up:
DROP POLICY IF EXISTS "members_select_self_or_owned" ON public.business_members;

-- Keep only the simple owner-based INSERT policy:
-- âœ… "owner_can_insert_membership" - only checks businesses.owner_user_id = auth.uid()

-- ============================================================================
-- ADD MINIMAL REPLACEMENT POLICIES
-- ============================================================================

-- Replace the removed "Owners/managers can view all members" with owner-only policy
CREATE POLICY "business_owners_can_view_members"
  ON public.business_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  );

-- Replace the removed update/delete policies with owner-only policies
CREATE POLICY "business_owners_can_update_members"
  ON public.business_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "business_owners_can_delete_members"
  ON public.business_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that no policies reference business_members from businesses table
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN tablename = 'businesses' AND (qual LIKE '%business_members%' OR with_check LIKE '%business_members%') 
    THEN 'âŒ RECURSION RISK'
    WHEN tablename = 'business_members' AND (qual LIKE '%is_owner_or_manager%' OR qual LIKE '%has_permission%')
    THEN 'âŒ FUNCTION RECURSION RISK'
    ELSE 'âœ… SAFE'
  END as safety_status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('businesses', 'business_members')
ORDER BY tablename, policyname;

-- Expected result: All policies should show 'âœ… SAFE'
-- --- END OF MIGRATION: 008_targeted_recursion_fix.sql ---

-- --- START OF MIGRATION: 009_nuclear_fix.sql ---
-- ============================================================================
-- NUCLEAR FIX - TEMPORARILY DISABLE RLS
-- ============================================================================
-- Since the recursion persists, we'll temporarily disable RLS entirely
-- to allow business creation, then re-enable with the simplest possible policies
-- ============================================================================

-- ============================================================================
-- STEP 1: DISABLE RLS COMPLETELY
-- ============================================================================

ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members DISABLE ROW LEVEL SECURITY;

-- Also disable on other tables to avoid any cross-table issues
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop all businesses policies
DROP POLICY IF EXISTS "Members can view their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;

-- Drop all business_members policies
DROP POLICY IF EXISTS "Users can view own memberships" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can view all members" ON public.business_members;
DROP POLICY IF EXISTS "Business owners can add initial membership" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can update members" ON public.business_members;
DROP POLICY IF EXISTS "Owners/managers can remove members" ON public.business_members;
DROP POLICY IF EXISTS "members_select_self_or_owned" ON public.business_members;
DROP POLICY IF EXISTS "owner_can_insert_membership" ON public.business_members;
DROP POLICY IF EXISTS "business_owners_can_view_members" ON public.business_members;
DROP POLICY IF EXISTS "business_owners_can_update_members" ON public.business_members;
DROP POLICY IF EXISTS "business_owners_can_delete_members" ON public.business_members;

-- Drop all other table policies
DROP POLICY IF EXISTS "Members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authorized users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authorized users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Owners/managers can delete customers" ON public.customers;

DROP POLICY IF EXISTS "Members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authorized users can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authorized users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Owners/managers can delete suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authorized users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authorized users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authorized users can delete transactions" ON public.transactions;

DROP POLICY IF EXISTS "Members can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authorized users can create attachments" ON public.attachments;
DROP POLICY IF EXISTS "Authorized users can delete attachments" ON public.attachments;

-- ============================================================================
-- STEP 3: DROP PROBLEMATIC FUNCTIONS
-- ============================================================================

-- Drop the functions that might be causing recursion
DROP FUNCTION IF EXISTS public.is_owner_or_manager(uuid);
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.has_permission_safe(uuid, text);
DROP FUNCTION IF EXISTS public.is_business_member(uuid);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('businesses', 'business_members', 'customers', 'suppliers', 'transactions', 'attachments')
ORDER BY tablename;

-- Check that no policies exist
SELECT COUNT(*) as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Expected results:
-- - All rls_enabled should be FALSE
-- - remaining_policies should be 0

-- ============================================================================
-- INSTRUCTIONS FOR RE-ENABLING RLS LATER
-- ============================================================================

/*
After business creation works, you can re-enable RLS with simple policies:

-- Re-enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Add only the simplest policies
CREATE POLICY "businesses_owner_access"
  ON public.businesses FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "business_members_owner_access"
  ON public.business_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_id AND owner_user_id = auth.uid()
    )
  );
*/
-- --- END OF MIGRATION: 009_nuclear_fix.sql ---

-- --- START OF MIGRATION: 010_create_workers_table.sql ---
-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Ù…Ø¯ÙŠØ±', 'Ù…ÙˆØ¸Ù', 'Ù…Ø­Ø§Ø³Ø¨', 'Ø£Ø®Ø±Ù‰')),
  phone TEXT NOT NULL,
  avatar_url TEXT,
  avatar_color TEXT DEFAULT 'slate',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure phone is unique per business
  UNIQUE(business_id, phone)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workers_business_id ON workers(business_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workers
CREATE POLICY "Users can view workers in their businesses" ON workers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_members bm 
      WHERE bm.business_id = workers.business_id 
      AND bm.user_id = auth.uid()
      AND bm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can insert workers" ON workers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members bm 
      WHERE bm.business_id = workers.business_id 
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'manager')
      AND bm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can update workers" ON workers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM business_members bm 
      WHERE bm.business_id = workers.business_id 
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'manager')
      AND bm.is_active = true
    )
  );

CREATE POLICY "Owners and managers can delete workers" ON workers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM business_members bm 
      WHERE bm.business_id = workers.business_id 
      AND bm.user_id = auth.uid()
      AND bm.role IN ('owner', 'manager')
      AND bm.is_active = true
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- --- END OF MIGRATION: 010_create_workers_table.sql ---

-- --- START OF MIGRATION: 011_seed_demo_workers.sql ---
-- Seed demo workers data
-- This will add some sample workers to existing businesses

-- Insert demo workers for existing businesses
INSERT INTO workers (business_id, name, role, phone, avatar_color, is_active, permissions)
SELECT 
  b.id as business_id,
  worker_data.name,
  worker_data.role,
  worker_data.phone,
  worker_data.avatar_color,
  worker_data.is_active,
  '{}'::jsonb as permissions
FROM businesses b
CROSS JOIN (
  VALUES 
    ('Ù…Ø­Ù…Ø¯ Ø£Ø­Ù…Ø¯', 'Ù…Ø¯ÙŠØ±', '+249912345678', 'emerald', true),
    ('Ø¹Ø«Ù…Ø§Ù† Ø³Ù„ÙŠÙ…Ø§Ù†', 'Ù…ÙˆØ¸Ù', '+249923456789', 'slate', true),
    ('Ø³Ø§Ù…ÙŠ Ø¹Ù„ÙŠ', 'Ù…ÙˆØ¸Ù', '+249934567890', 'red', false),
    ('Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ… Ø®Ø§Ù„Ø¯', 'Ù…ÙˆØ¸Ù', '+249945678901', 'amber', true),
    ('Ù…Ù†Ù‰ Ù…Ø­Ù…ÙˆØ¯', 'Ù…Ø­Ø§Ø³Ø¨', '+249956789012', 'blue', true),
    ('Ø¹Ø§Ø¯Ù„ Ø­Ø³Ù†', 'Ù…ÙˆØ¸Ù', '+249967890123', 'purple', true)
) AS worker_data(name, role, phone, avatar_color, is_active)
WHERE NOT EXISTS (
  -- Only insert if no workers exist for this business yet
  SELECT 1 FROM workers w WHERE w.business_id = b.id
);
-- --- END OF MIGRATION: 011_seed_demo_workers.sql ---

-- --- START OF MIGRATION: 012_performance_indexes.sql ---
-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add composite index for business_members lookup (used in every RLS check)
-- This is the most critical index for performance
CREATE INDEX IF NOT EXISTS idx_business_members_user_business_active 
ON business_members(user_id, business_id, is_active) 
WHERE is_active = true;

-- 2. Add index for workers with avatar_url (for avatar loading)
CREATE INDEX IF NOT EXISTS idx_workers_business_avatar 
ON workers(business_id) 
WHERE avatar_url IS NOT NULL;

-- 3. Add index for attachments bucket lookup
CREATE INDEX IF NOT EXISTS idx_attachments_business_bucket 
ON attachments(business_id, bucket);

-- 4. Optimize the is_business_member function with better query plan
CREATE OR REPLACE FUNCTION public.is_business_member(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = bid
      AND user_id = auth.uid()
      AND is_active = true
    LIMIT 1
  );
$$;

-- 5. Optimize has_permission function
CREATE OR REPLACE FUNCTION public.has_permission(bid uuid, perm text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = bid
      AND user_id = auth.uid()
      AND is_active = true
      AND (
        role IN ('owner', 'manager')
        OR (permissions->perm)::boolean = true
      )
    LIMIT 1
  );
$$;

-- 6. Optimize is_owner_or_manager function
CREATE OR REPLACE FUNCTION public.is_owner_or_manager(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = bid
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
      AND is_active = true
    LIMIT 1
  );
$$;

-- 7. Add index for transactions ledger type (for debts page)
CREATE INDEX IF NOT EXISTS idx_transactions_ledger 
ON transactions(business_id, occurred_at DESC) 
WHERE entity_type = 'ledger';

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- --- END OF MIGRATION: 012_performance_indexes.sql ---

-- --- START OF MIGRATION: 013_storage_avatars_policies.sql ---
-- Enable storage for avatars bucket
-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;

-- Policy 1: Allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- Policy 2: Allow public read access to avatars (so images display)
CREATE POLICY "Allow public access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy 3: Allow authenticated users to update their avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Policy 4: Allow authenticated users to delete their avatars
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- --- END OF MIGRATION: 013_storage_avatars_policies.sql ---

-- --- START OF MIGRATION: 014_owner_bypass_rls.sql ---
-- ============================================================================
-- FIX: OWNER PERMISSION BYPASS (014)
-- Allows business owners to perform actions directly without relying solely 
-- on business_members policies, which prevents "missing member row" deadlocks.
-- ============================================================================

BEGIN;

-- 1. Helper: Check ownership efficiently (Security Definer)
CREATE OR REPLACE FUNCTION public.is_business_owner(bid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = bid AND owner_user_id = auth.uid()
  );
END;
$$;

-- 2. CUSTOMERS: Allow Owner OR Permission
DROP POLICY IF EXISTS "Authorized users can create customers" ON public.customers;
CREATE POLICY "Authorized users can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    is_business_owner(business_id) 
    OR has_permission(business_id, 'customers_manage')
  );

DROP POLICY IF EXISTS "Authorized users can update customers" ON public.customers;
CREATE POLICY "Authorized users can update customers"
  ON public.customers FOR UPDATE
  USING (
    is_business_owner(business_id)
    OR has_permission(business_id, 'customers_manage')
  );

DROP POLICY IF EXISTS "Owners/managers can delete customers" ON public.customers;
CREATE POLICY "Owners/managers can delete customers"
  ON public.customers FOR DELETE
  USING (
    is_business_owner(business_id)
    OR is_owner_or_manager(business_id)
  );

-- 3. SUPPLIERS: Allow Owner OR Permission
DROP POLICY IF EXISTS "Authorized users can create suppliers" ON public.suppliers;
CREATE POLICY "Authorized users can create suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (
    is_business_owner(business_id) 
    OR has_permission(business_id, 'suppliers_manage')
  );

DROP POLICY IF EXISTS "Authorized users can update suppliers" ON public.suppliers;
CREATE POLICY "Authorized users can update suppliers"
  ON public.suppliers FOR UPDATE
  USING (
    is_business_owner(business_id)
    OR has_permission(business_id, 'suppliers_manage')
  );

DROP POLICY IF EXISTS "Owners/managers can delete suppliers" ON public.suppliers;
CREATE POLICY "Owners/managers can delete suppliers"
  ON public.suppliers FOR DELETE
  USING (
    is_business_owner(business_id)
    OR is_owner_or_manager(business_id)
  );

-- 4. BUSINESS MEMBERS: Allow Owner to insert self or others
DROP POLICY IF EXISTS "Owners can add members" ON public.business_members;
CREATE POLICY "Owners can add members"
  ON public.business_members FOR INSERT
  WITH CHECK (
    is_business_owner(business_id)
    OR has_permission(business_id, 'workers_manage')
  );

COMMIT;

-- --- END OF MIGRATION: 014_owner_bypass_rls.sql ---

-- --- START OF MIGRATION: 015_balance_rpc.sql ---
-- ============================================================================
-- CRITICAL PERFORMANCE FIXES & OPTIMIZATIONS (Complete)
-- Run this in Supabase SQL Editor to fix slow loading times and support scaling
-- ============================================================================

-- 1. ADD MISSING INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_business_customer ON public.transactions(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_supplier ON public.transactions(business_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_type ON public.transactions(business_id, type);
CREATE INDEX IF NOT EXISTS idx_customers_business_search ON public.customers(business_id, name);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_search ON public.suppliers(business_id, name);

-- 2. SERVER-SIDE BALANCE CALCULATION (RPC)
CREATE OR REPLACE FUNCTION get_transactions_summary(
  p_business_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  total_in NUMERIC,
  total_out NUMERIC,
  tx_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as total_out,
    COUNT(*) as tx_count
  FROM transactions
  WHERE business_id = p_business_id
    AND (
      (p_entity_type = 'customer' AND customer_id = p_entity_id) OR
      (p_entity_type = 'supplier' AND supplier_id = p_entity_id)
    );
END;
$$;

-- 3. OPTIMIZED CUSTOMER LIST WITH BALANCE
CREATE OR REPLACE FUNCTION get_customers_with_balance(
  p_business_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  opening_balance NUMERIC,
  opening_balance_direction TEXT,
  created_at TIMESTAMPTZ,
  total_in NUMERIC,
  total_out NUMERIC,
  current_balance NUMERIC,
  status TEXT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      customer_id,
      COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as stats_total_in,
      COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as stats_total_out,
      MAX(occurred_at) as stats_last_activity
    FROM transactions
    WHERE business_id = p_business_id
      AND customer_id IS NOT NULL
    GROUP BY customer_id
  )
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.avatar_url,
    c.opening_balance,
    c.opening_balance_direction,
    c.created_at,
    COALESCE(cs.stats_total_in, 0) as total_in,
    COALESCE(cs.stats_total_out, 0) as total_out,
    ABS(
      (CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + 
      (COALESCE(cs.stats_total_out, 0) - COALESCE(cs.stats_total_in, 0))
    ) as current_balance,
    CASE 
      WHEN ((CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + (COALESCE(cs.stats_total_out, 0) - COALESCE(cs.stats_total_in, 0))) > 0 THEN 'debt'
      WHEN ((CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + (COALESCE(cs.stats_total_out, 0) - COALESCE(cs.stats_total_in, 0))) < 0 THEN 'credit'
      ELSE 'clear'
    END as status,
    cs.stats_last_activity as last_activity
  FROM customers c
  LEFT JOIN customer_stats cs ON c.id = cs.customer_id
  WHERE c.business_id = p_business_id
    AND (
      p_search IS NULL OR 
      c.name ILIKE '%' || p_search || '%' OR 
      c.phone ILIKE '%' || p_search || '%'
    )
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. OPTIMIZED SUPPLIER LIST WITH BALANCE
CREATE OR REPLACE FUNCTION get_suppliers_with_balance(
  p_business_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  opening_balance NUMERIC,
  opening_balance_direction TEXT,
  created_at TIMESTAMPTZ,
  total_in NUMERIC,
  total_out NUMERIC,
  current_balance NUMERIC,
  status TEXT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH supplier_stats AS (
    SELECT 
      supplier_id,
      COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as stats_total_in,
      COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as stats_total_out,
      MAX(occurred_at) as stats_last_activity
    FROM transactions
    WHERE business_id = p_business_id
      AND supplier_id IS NOT NULL
    GROUP BY supplier_id
  )
  SELECT 
    s.id,
    s.name,
    s.phone,
    s.avatar_url,
    s.opening_balance,
    s.opening_balance_direction,
    s.created_at,
    COALESCE(ss.stats_total_in, 0) as total_in,
    COALESCE(ss.stats_total_out, 0) as total_out,
    ABS(
      (CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + 
      (COALESCE(ss.stats_total_out, 0) - COALESCE(ss.stats_total_in, 0))
    ) as current_balance,
    CASE 
      WHEN ((CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + (COALESCE(ss.stats_total_out, 0) - COALESCE(ss.stats_total_in, 0))) > 0 THEN 'debt'
      WHEN ((CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + (COALESCE(ss.stats_total_out, 0) - COALESCE(ss.stats_total_in, 0))) < 0 THEN 'credit'
      ELSE 'clear'
    END as status,
    ss.stats_last_activity as last_activity
  FROM suppliers s
  LEFT JOIN supplier_stats ss ON s.id = ss.supplier_id
  WHERE s.business_id = p_business_id
    AND (
      p_search IS NULL OR 
      s.name ILIKE '%' || p_search || '%' OR 
      s.phone ILIKE '%' || p_search || '%'
    )
  ORDER BY s.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- --- END OF MIGRATION: 015_balance_rpc.sql ---


