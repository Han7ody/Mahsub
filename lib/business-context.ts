// @ts-nocheck
/**
 * Current Business Helper
 * Server-side utility to get current user's business context
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface BusinessContext {
  userId: string
  businessId: string
  businessName: string
  role: 'owner' | 'manager' | 'staff'
  permissions: Record<string, boolean>
}

/**
 * Get current business context from session
 * Returns null if not authenticated or no business found
 */
export async function getCurrentBusiness(): Promise<BusinessContext | null> {
  try {
    const supabase = await createSupabaseServerClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Get preferred business from cookie (if set by frontend)
    const cookieStore = await cookies()
    const preferredBusinessId = cookieStore.get('currentBusinessId')?.value

    // Query for user's businesses
    const query = supabase
      .from('business_members')
      .select(`
        business_id,
        role,
        permissions,
        businesses (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    // If preferred business specified, try to get it
    if (preferredBusinessId) {
      query.eq('business_id', preferredBusinessId)
    }

    const { data: memberships, error } = await query.limit(1).single()

    if (error || !memberships) {
      // No business found, try to get any active membership
      const { data: anyMembership } = await supabase
        .from('business_members')
        .select(`
          business_id,
          role,
          permissions,
          businesses (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!anyMembership) {
        return null
      }

      return {
        userId: user.id,
        businessId: anyMembership.business_id,
        businessName: (anyMembership.businesses as any)?.name || 'Unknown',
        role: anyMembership.role as 'owner' | 'manager' | 'staff',
        permissions: anyMembership.permissions || {},
      }
    }

    return {
      userId: user.id,
      businessId: memberships.business_id,
      businessName: (memberships.businesses as any)?.name || 'Unknown',
      role: memberships.role as 'owner' | 'manager' | 'staff',
      permissions: memberships.permissions || {},
    }
  } catch (error) {
    console.error('Error getting current business:', error)
    return null
  }
}

/**
 * Check if user has specific permission in current business
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const context = await getCurrentBusiness()
  
  if (!context) return false
  
  // Owners and managers have all permissions
  if (context.role === 'owner' || context.role === 'manager') {
    return true
  }
  
  return context.permissions[permission] === true
}
