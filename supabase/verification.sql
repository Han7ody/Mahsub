-- ============================================================================
-- VERIFICATION & TESTING QUERIES
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify setup
-- ============================================================================

-- 1. CHECK ALL TABLES EXIST
-- Expected: 6 rows
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('businesses', 'business_members', 'customers', 'suppliers', 'transactions', 'attachments')
ORDER BY tablename;

-- 2. CHECK RLS IS ENABLED
-- Expected: 6 rows, all with rls_enabled = true
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('businesses', 'business_members', 'customers', 'suppliers', 'transactions', 'attachments')
ORDER BY tablename;

-- 3. COUNT RLS POLICIES
-- Expected: 24 policies across 6 tables
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. LIST ALL RLS POLICIES
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. CHECK HELPER FUNCTIONS EXIST
-- Expected: 3 functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_business_member', 'is_owner_or_manager', 'has_permission')
ORDER BY routine_name;

-- 6. CHECK INDEXES
-- Expected: 9+ indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('businesses', 'business_members', 'customers', 'suppliers', 'transactions', 'attachments')
ORDER BY tablename, indexname;

-- 7. CHECK STORAGE BUCKETS
-- Expected: 2 buckets (receipts, avatars)
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY name;

-- 8. CHECK STORAGE POLICIES
-- Expected: 8+ policies
SELECT 
  policyname,
  definition
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- ============================================================================
-- TEST DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================
-- Run this AFTER you have authenticated and have auth.uid()
-- ============================================================================

-- Insert test business (replace auth.uid() with your actual user ID)
/*
INSERT INTO public.businesses (id, name, owner_user_id, phone, address)
VALUES (
  gen_random_uuid(),
  'متجر النيل التجاري',
  auth.uid(),  -- Your authenticated user ID
  '0123456789',
  'الخرطوم، السودان'
)
RETURNING id;
*/

-- Add yourself as owner to the business you just created
/*
INSERT INTO public.business_members (business_id, user_id, role, permissions)
VALUES (
  'PASTE_BUSINESS_ID_HERE',
  auth.uid(),
  'owner',
  '{}'::jsonb
)
RETURNING *;
*/

-- Insert test customers
/*
INSERT INTO public.customers (business_id, name, phone, opening_balance, opening_balance_direction)
VALUES 
  ('PASTE_BUSINESS_ID_HERE', 'ياسر علي حسن', '0998765432', 12500, 'in'),
  ('PASTE_BUSINESS_ID_HERE', 'عمر خالد إبراهيم', '0123456789', 0, null),
  ('PASTE_BUSINESS_ID_HERE', 'أحمد محمد عثمان', '0912345678', 50000, 'in')
RETURNING id, name, opening_balance;
*/

-- Insert test suppliers
/*
INSERT INTO public.suppliers (business_id, name, phone, opening_balance, opening_balance_direction)
VALUES 
  ('PASTE_BUSINESS_ID_HERE', 'شركة النيل للمواد الغذائية', '0998765432', 85000, 'out'),
  ('PASTE_BUSINESS_ID_HERE', 'مؤسسة الخرطوم التجارية', '0123456789', 0, null)
RETURNING id, name, opening_balance;
*/

-- Insert test transaction
/*
INSERT INTO public.transactions (
  business_id, 
  entity_type, 
  customer_id, 
  type, 
  amount, 
  payment_method, 
  title, 
  notes
)
VALUES (
  'PASTE_BUSINESS_ID_HERE',
  'customer',
  'PASTE_CUSTOMER_ID_HERE',
  'out',
  35000,
  'cash',
  'جوال سكر 50 كيلو',
  'دين جديد'
)
RETURNING id, title, amount, occurred_at;
*/

-- ============================================================================
-- QUERY EXAMPLES (TEST RLS)
-- ============================================================================
-- These should work when authenticated as business member
-- ============================================================================

-- View my businesses
/*
SELECT * FROM public.businesses;
*/

-- View my business memberships
/*
SELECT 
  b.name as business_name,
  bm.role,
  bm.is_active
FROM public.business_members bm
JOIN public.businesses b ON b.id = bm.business_id
WHERE bm.user_id = auth.uid();
*/

-- View customers in my business
/*
SELECT 
  id,
  name,
  phone,
  opening_balance,
  opening_balance_direction
FROM public.customers
WHERE business_id = 'PASTE_BUSINESS_ID_HERE'
ORDER BY created_at DESC;
*/

-- View transactions for a customer
/*
SELECT 
  t.id,
  t.title,
  t.type,
  t.amount,
  t.payment_method,
  t.occurred_at,
  c.name as customer_name
FROM public.transactions t
JOIN public.customers c ON c.id = t.customer_id
WHERE t.business_id = 'PASTE_BUSINESS_ID_HERE'
  AND t.customer_id = 'PASTE_CUSTOMER_ID_HERE'
ORDER BY t.occurred_at DESC;
*/

-- ============================================================================
-- CLEANUP (USE WITH CAUTION)
-- ============================================================================
-- Uncomment only if you need to reset everything
-- ============================================================================

-- Delete all test data (keeps schema)
/*
DELETE FROM public.attachments;
DELETE FROM public.transactions;
DELETE FROM public.customers;
DELETE FROM public.suppliers;
DELETE FROM public.business_members;
DELETE FROM public.businesses;
*/

-- Drop all tables (DANGER - will delete schema)
/*
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.business_members CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;
DROP FUNCTION IF EXISTS public.is_business_member(uuid);
DROP FUNCTION IF EXISTS public.is_owner_or_manager(uuid);
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
*/
