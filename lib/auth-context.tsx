/**
 * Auth Context & Hooks
 * Manages user authentication state and current business context
 */

'use client'
// @ts-nocheck

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'

interface Business {
  id: string
  name: string
  role: 'owner' | 'manager' | 'staff'
  permissions: Record<string, boolean>
  logo_url?: string | null
  address?: string | null
  phone?: string | null
}

interface AuthContextType {
  user: User | null
  currentBusiness: Business | null
  businesses: Business[]
  isLoading: boolean
  signOut: () => Promise<void>
  switchBusiness: (businessId: string) => void
  refreshBusiness: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentBusiness: null,
  businesses: [],
  isLoading: true,
  signOut: async () => {},
  switchBusiness: () => {},
  refreshBusiness: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient()

  // Load user and businesses
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadBusinesses(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadBusinesses(session.user.id)
      } else {
        setBusinesses([])
        setCurrentBusiness(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadBusinesses = async (userId: string) => {
    try {
      console.log('Loading businesses for user:', userId)
      
      // Run both queries in parallel for better performance
      const [membersResult, ownedResult] = await Promise.all([
        // Query 1: Get memberships
        supabase
          .from('business_members')
          .select('business_id, role, permissions, is_active')
          .eq('user_id', userId)
          .eq('is_active', true),
        // Query 2: Get owned businesses directly
        supabase
          .from('businesses')
          .select('id, name, phone, address, logo_url')
          .eq('owner_user_id', userId)
      ]);

      const { data: memberRows, error: membersError } = membersResult;
      const { data: owned, error: ownedError } = ownedResult;

      if (membersError) {
        console.warn('Failed to load business_members:', membersError.message);
      }
      if (ownedError) {
        console.warn('Failed to load owned businesses:', ownedError.message);
      }

      // Build base list from memberships
      const userBusinessesBase = (memberRows || []).map((m: any) => ({
        id: m.business_id,
        role: m.role,
        permissions: m.permissions || {},
      }));

      // Get unique business IDs that need name lookup
      const ownedIds = new Set((owned || []).map((b: any) => b.id));
      const idsNeedingNames = userBusinessesBase
        .map((m: any) => m.id)
        .filter((id: string) => !ownedIds.has(id));

      // Create name/detail map from owned businesses
      const detailById = new Map<string, Partial<Business>>();
      (owned || []).forEach((b: any) => detailById.set(b.id, { 
        name: b.name, 
        phone: b.phone, 
        address: b.address, 
        logo_url: b.logo_url 
      }));

      // Only fetch names for businesses not in owned list
      if (idsNeedingNames.length > 0) {
        const { data: bizRows } = await supabase
          .from('businesses')
          .select('id, name, phone, address, logo_url')
          .in('id', idsNeedingNames);
        
        (bizRows || []).forEach((b: any) => detailById.set(b.id, { 
          name: b.name, 
          phone: b.phone, 
          address: b.address, 
          logo_url: b.logo_url 
        }));
      }

      // Build final list
      const userBusinesses: Business[] = userBusinessesBase.map((m: any) => ({
        id: m.id,
        name: detailById.get(m.id)?.name || 'Unknown Business',
        phone: detailById.get(m.id)?.phone || null,
        address: detailById.get(m.id)?.address || null,
        logo_url: detailById.get(m.id)?.logo_url || null,
        role: m.role,
        permissions: m.permissions,
      }));

      const ownerBusinesses: Business[] = (owned || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        address: b.address,
        logo_url: b.logo_url,
        role: 'owner' as const,
        permissions: {},
      }));

      // Merge and deduplicate by id
      const byId = new Map<string, Business>();
      [...userBusinesses, ...ownerBusinesses].forEach((b) => {
        if (!byId.has(b.id)) byId.set(b.id, b);
      });
      const merged = Array.from(byId.values());

      setBusinesses(merged);

      // Set current business from localStorage or first business
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      const savedBusiness = merged.find((b) => b.id === savedBusinessId);
      setCurrentBusiness(savedBusiness || merged[0] || null);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setBusinesses([]);
      setCurrentBusiness(null);
    } finally {
      setIsLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('currentBusinessId')
  }

  const switchBusiness = (businessId: string) => {
    const business = businesses.find((b) => b.id === businessId)
    if (business) {
      setCurrentBusiness(business)
      localStorage.setItem('currentBusinessId', businessId)
    }
  }

  const refreshBusiness = async () => {
    if (user) {
      await loadBusinesses(user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentBusiness,
        businesses,
        isLoading,
        signOut,
        switchBusiness,
        refreshBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Helper hook for checking permissions
export const usePermission = (permission: string): boolean => {
  const { currentBusiness } = useAuth()
  
  if (!currentBusiness) return false
  
  // Owners and managers have all permissions
  if (currentBusiness.role === 'owner' || currentBusiness.role === 'manager') {
    return true
  }
  
  // Check specific permission flag
  return currentBusiness.permissions[permission] === true
}
