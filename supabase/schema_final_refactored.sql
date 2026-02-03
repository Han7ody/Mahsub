-- ============================================================================
-- MAHSUB SYSTEM - COMPLETE REFACTORED DATABASE SCHEMA (FINAL VERSION V3)
-- ============================================================================

-- 1. TABLES
-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Business Members (for multi-user access)
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Workers
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'worker',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  opening_balance NUMERIC DEFAULT 0,
  opening_balance_direction TEXT CHECK (opening_balance_direction IN ('in', 'out')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  opening_balance NUMERIC DEFAULT 0,
  opening_balance_direction TEXT CHECK (opening_balance_direction IN ('in', 'out')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier', 'ledger')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  title TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  receipt_url TEXT,
  receipt_path TEXT
);

-- Attachments (Receipts/Documents)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_business_customer ON public.transactions(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_supplier ON public.transactions(business_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_type ON public.transactions(business_id, type);
CREATE INDEX IF NOT EXISTS idx_customers_business_search ON public.customers(business_id, name);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_search ON public.suppliers(business_id, name);

-- 3. RLS POLICIES
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Security Helper
CREATE OR REPLACE FUNCTION public.can_access_business(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_user_id = auth.uid()
    UNION
    SELECT 1 FROM public.business_members WHERE business_id = p_business_id AND user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can manage their businesses" ON public.businesses;
  CREATE POLICY "Owners can manage their businesses" ON public.businesses FOR ALL TO authenticated USING (owner_user_id = auth.uid());
  
  DROP POLICY IF EXISTS "Members can view their businesses" ON public.businesses;
  CREATE POLICY "Members can view their businesses" ON public.businesses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = id AND user_id = auth.uid() AND is_active = true));

  DROP POLICY IF EXISTS "Members view" ON public.business_members;
  CREATE POLICY "Members view" ON public.business_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR can_access_business(business_id));

  DROP POLICY IF EXISTS "Access by business ownership" ON public.customers;
  CREATE POLICY "Access by business ownership" ON public.customers FOR ALL TO authenticated USING (can_access_business(business_id));
  
  DROP POLICY IF EXISTS "Access by business ownership" ON public.suppliers;
  CREATE POLICY "Access by business ownership" ON public.suppliers FOR ALL TO authenticated USING (can_access_business(business_id));
  
  DROP POLICY IF EXISTS "Access by business ownership" ON public.transactions;
  CREATE POLICY "Access by business ownership" ON public.transactions FOR ALL TO authenticated USING (can_access_business(business_id));
  
  DROP POLICY IF EXISTS "Access by business ownership" ON public.workers;
  CREATE POLICY "Access by business ownership" ON public.workers FOR ALL TO authenticated USING (can_access_business(business_id));
  
  DROP POLICY IF EXISTS "Access by business ownership" ON public.attachments;
  CREATE POLICY "Access by business ownership" ON public.attachments FOR ALL TO authenticated USING (can_access_business(business_id));
EXCEPTION WHEN others THEN END $$;

-- 4. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION get_transactions_summary(p_business_id UUID, p_entity_type TEXT, p_entity_id UUID)
RETURNS TABLE (total_in NUMERIC, total_out NUMERIC, tx_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0),
    COUNT(*)
  FROM public.transactions
  WHERE business_id = p_business_id
    AND ((p_entity_type = 'customer' AND customer_id = p_entity_id) OR (p_entity_type = 'supplier' AND supplier_id = p_entity_id) OR (p_entity_type = 'ledger'));
END;
$$;

CREATE OR REPLACE FUNCTION get_customers_with_balance(p_business_id UUID, p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (id UUID, name TEXT, phone TEXT, avatar_url TEXT, opening_balance NUMERIC, opening_balance_direction TEXT, created_at TIMESTAMPTZ, total_in NUMERIC, total_out NUMERIC, current_balance NUMERIC, status TEXT, last_activity TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT customer_id, COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as tin, COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as tout, MAX(occurred_at) as la
    FROM transactions WHERE business_id = p_business_id AND customer_id IS NOT NULL GROUP BY customer_id
  )
  SELECT 
    c.id, c.name, c.phone, c.avatar_url, c.opening_balance, c.opening_balance_direction, c.created_at,
    COALESCE(s.tin, 0), COALESCE(s.tout, 0),
    ABS((CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + (COALESCE(s.tout, 0) - COALESCE(s.tin, 0))),
    CASE WHEN ((CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + (COALESCE(s.tout, 0) - COALESCE(s.tin, 0))) > 0 THEN 'debt' WHEN ((CASE WHEN c.opening_balance_direction = 'in' THEN c.opening_balance ELSE -c.opening_balance END) + (COALESCE(s.tout, 0) - COALESCE(s.tin, 0))) < 0 THEN 'credit' ELSE 'clear' END,
    s.la
  FROM public.customers c LEFT JOIN stats s ON c.id = s.customer_id
  WHERE c.business_id = p_business_id AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_suppliers_with_balance(p_business_id UUID, p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (id UUID, name TEXT, phone TEXT, avatar_url TEXT, opening_balance NUMERIC, opening_balance_direction TEXT, created_at TIMESTAMPTZ, total_in NUMERIC, total_out NUMERIC, current_balance NUMERIC, status TEXT, last_activity TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT supplier_id, COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as tin, COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as tout, MAX(occurred_at) as la
    FROM transactions WHERE business_id = p_business_id AND supplier_id IS NOT NULL GROUP BY supplier_id
  )
  SELECT 
    s.id, s.name, s.phone, s.avatar_url, s.opening_balance, s.opening_balance_direction, s.created_at,
    COALESCE(st.tin, 0), COALESCE(st.tout, 0),
    ABS((CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + (COALESCE(st.tin, 0) - COALESCE(st.tout, 0))),
    CASE WHEN ((CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + (COALESCE(st.tin, 0) - COALESCE(st.tout, 0))) > 0 THEN 'debt' WHEN ((CASE WHEN s.opening_balance_direction = 'in' THEN s.opening_balance ELSE -s.opening_balance END) + (COALESCE(st.tin, 0) - COALESCE(st.tout, 0))) < 0 THEN 'credit' ELSE 'clear' END,
    st.la
  FROM public.suppliers s LEFT JOIN stats st ON s.id = st.supplier_id
  WHERE s.business_id = p_business_id AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.phone ILIKE '%' || p_search || '%')
  ORDER BY s.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
