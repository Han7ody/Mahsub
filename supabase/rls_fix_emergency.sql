-- ============================================================================
-- MAHSUB SYSTEM - EMERGENCY RLS FIX (RUN THIS)
-- ============================================================================

-- 1. DROP OLD POLICIES TO AVOID COLLISIONS
DROP POLICY IF EXISTS "Owners can manage their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Members can view their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.businesses;
DROP POLICY IF EXISTS "Allow owners to insert businesses" ON public.businesses;

-- 2. ENABLE RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 3. THE FIX: ALLOW USERS TO CREATE THEIR FIRST BUSINESS
-- This policy allows an authenticated user to insert a business where they are the owner
CREATE POLICY "Allow users to create their own business" 
ON public.businesses 
FOR INSERT 
TO authenticated 
WITH CHECK (owner_user_id = auth.uid());

-- 4. ALLOW USERS TO SEE AND MANAGE THEIR OWN BUSINESS
CREATE POLICY "Owners can manage their own businesses" 
ON public.businesses 
FOR ALL 
TO authenticated 
USING (owner_user_id = auth.uid());

-- 5. RE-APPLY FOR MEMBERS (IF TABLE EXISTS)
DO $$ BEGIN
    CREATE POLICY "Members can view businesses" 
    ON public.businesses 
    FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM business_members WHERE business_id = id AND user_id = auth.uid()));
EXCEPTION WHEN others THEN END $$;
