-- ============================================================================
-- FIX LOGIC V4 - STANDARDIZING DEBT CALCULATION
-- ============================================================================
-- Concept:
-- CUSTOMERS: "They Owe Me" (Asset) = POSITIVE
--   - OUT (I Gave / Debit) -> Increases Balance (+)
--   - IN (I Received / Credit) -> Decreases Balance (-)
--
-- SUPPLIERS: "I Owe Them" (Liability) = POSITIVE
--   - IN (I Took / Stock In) -> Increases Balance (+)
--   - OUT (I Paid / Payment) -> Decreases Balance (-)
-- ============================================================================

-- 1. FIX CUSTOMER BALANCE FUNCTION
CREATE OR REPLACE FUNCTION get_customers_with_balance(p_business_id UUID, p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      customer_id, 
      COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as tin, 
      COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as tout, 
      MAX(occurred_at) as la
    FROM transactions 
    WHERE business_id = p_business_id AND customer_id IS NOT NULL 
    GROUP BY customer_id
  )
  SELECT 
    c.id, c.name, c.phone, c.avatar_url, c.opening_balance, c.opening_balance_direction, c.created_at,
    COALESCE(s.tin, 0), COALESCE(s.tout, 0),
    -- CALCULATION: 
    -- Opening (Adjusted) + (OUT - IN)
    -- If Opening is 'in' (He Owes Me? No, usually Opening In means I received? Let's assume user picks direction)
    -- Standard: "Debit" (Upon him) = Positive. "Credit" (For him) = Negative.
    -- If direction = 'in' -> We treat as Negative (Credit). If 'out' -> Positive (Debit).
    (
      CASE 
        WHEN c.opening_balance_direction = 'out' THEN COALESCE(c.opening_balance, 0) -- Debit/He Owes
        ELSE -COALESCE(c.opening_balance, 0) -- Credit/I Owe
      END 
      + COALESCE(s.tout, 0) - COALESCE(s.tin, 0)
    ) as calc_balance,
    -- STATUS:
    -- > 0: He Owes Me (Debt)
    -- < 0: I Owe Him (Credit)
    CASE 
      WHEN (
        CASE 
          WHEN c.opening_balance_direction = 'out' THEN COALESCE(c.opening_balance, 0) 
          ELSE -COALESCE(c.opening_balance, 0) 
        END + COALESCE(s.tout, 0) - COALESCE(s.tin, 0)
      ) > 0 THEN 'debt' 
      WHEN (
        CASE 
          WHEN c.opening_balance_direction = 'out' THEN COALESCE(c.opening_balance, 0) 
          ELSE -COALESCE(c.opening_balance, 0) 
        END + COALESCE(s.tout, 0) - COALESCE(s.tin, 0)
      ) < 0 THEN 'credit' 
      ELSE 'clear' 
    END,
    s.la
  FROM public.customers c 
  LEFT JOIN stats s ON c.id = s.customer_id
  WHERE c.business_id = p_business_id 
    AND (p_search IS NULL OR c.name ILIKE '%' || p_search || '%' OR c.phone ILIKE '%' || p_search || '%')
  ORDER BY c.created_at DESC 
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 2. FIX SUPPLIER BALANCE FUNCTION
CREATE OR REPLACE FUNCTION get_suppliers_with_balance(p_business_id UUID, p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      supplier_id, 
      COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as tin, 
      COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as tout, 
      MAX(occurred_at) as la
    FROM transactions 
    WHERE business_id = p_business_id AND supplier_id IS NOT NULL 
    GROUP BY supplier_id
  )
  SELECT 
    s.id, s.name, s.phone, s.avatar_url, s.opening_balance, s.opening_balance_direction, s.created_at,
    COALESCE(st.tin, 0), COALESCE(st.tout, 0),
    -- CALCULATION:
    -- 'IN' (Stock In) = Liability (Positive)
    -- 'OUT' (Payment) = Reduces Liability (Negative)
    -- Opening: If 'in' (I received goods?) -> Positive. If 'out' (I paid?) -> Negative.
    (
      CASE 
        WHEN s.opening_balance_direction = 'in' THEN COALESCE(s.opening_balance, 0) -- Liability
        ELSE -COALESCE(s.opening_balance, 0) -- Advance Payment
      END 
      + COALESCE(st.tin, 0) - COALESCE(st.tout, 0)
    ) as calc_balance,
    -- STATUS:
    -- > 0: Debt (I Owe)
    -- < 0: Credit (Advance)
    CASE 
      WHEN (
        CASE 
          WHEN s.opening_balance_direction = 'in' THEN COALESCE(s.opening_balance, 0) 
          ELSE -COALESCE(s.opening_balance, 0) 
        END + COALESCE(st.tin, 0) - COALESCE(st.tout, 0)
      ) > 0 THEN 'debt' 
      WHEN (
        CASE 
          WHEN s.opening_balance_direction = 'in' THEN COALESCE(s.opening_balance, 0) 
          ELSE -COALESCE(s.opening_balance, 0) 
        END + COALESCE(st.tin, 0) - COALESCE(st.tout, 0)
      ) < 0 THEN 'credit' 
      ELSE 'clear' 
    END,
    st.la
  FROM public.suppliers s 
  LEFT JOIN stats st ON s.id = st.supplier_id
  WHERE s.business_id = p_business_id 
    AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.phone ILIKE '%' || p_search || '%')
  ORDER BY s.created_at DESC 
  LIMIT p_limit OFFSET p_offset;
END;
$$;
