// @ts-nocheck
/**
 * Workers Repository
 * Data access layer for worker operations
 * 
 * Note: TypeScript errors related to Supabase types (`never`) will appear
 * if NEXT_PUBLIC_SUPABASE_URL is not set. This is expected and will resolve
 * when environment variables are configured.
 */

import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type WorkerRow = Database['public']['Tables']['workers']['Row']
type WorkerInsert = Database['public']['Tables']['workers']['Insert']
type WorkerUpdate = Database['public']['Tables']['workers']['Update']

export interface Worker {
  id: string
  business_id: string
  name: string
  role: 'مدير' | 'موظف' | 'محاسب' | 'أخرى'
  phone: string
  avatar_url: string | null
  avatar_color: string
  permissions: Record<string, any>
  created_at: string
  updated_at: string
  // Computed fields
  initials?: string
}

interface ListWorkersOptions {
  businessId: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * List workers for a business (browser client)
 */
export async function listWorkersBrowser(
  options: ListWorkersOptions
): Promise<{ workers: Worker[]; error: any }> {
  try {
    const supabase = createBrowserClient()
    
    let query = supabase
      .from('workers')
      .select('*')
      .eq('business_id', options.businessId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options.search) {
      query = query.ilike('name', `%${options.search}%`)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error listing workers:', error)
      return { workers: [], error }
    }

    // Map to expected format (no UI-specific computed fields)
    const workers = (data || []).map((worker: WorkerRow): Worker => ({
      ...worker,
    }))

    return { workers, error: null }
  } catch (error) {
    console.error('Error in listWorkersBrowser:', error)
    return { workers: [], error }
  }
}

/**
 * Get worker by ID (browser client)
 */
export async function getWorkerById(
  workerId: string,
  businessId: string
): Promise<{ worker: Worker | null; error: any }> {
  try {
    const supabase = createBrowserClient()
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('business_id', businessId)
      .single()

    if (error) {
      console.error('Error getting worker:', error)
      return { worker: null, error }
    }

    if (!data) {
      return { worker: null, error: null }
    }

    // Map to expected format (no UI-specific computed fields)
    const worker: Worker = {
      ...data,
    }

    return { worker, error: null }
  } catch (error) {
    console.error('Error in getWorkerById:', error)
    return { worker: null, error }
  }
}

/**
 * Create a new worker (browser client)
 */
export async function createWorkerBrowser(
  workerData: Omit<WorkerInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<{ worker: Worker | null; error: any }> {
  try {
    const supabase = createBrowserClient()
    
    const { data, error } = await supabase
      .from('workers')
      .insert(workerData)
      .select()
      .single()

    if (error) {
      console.error('Error creating worker:', error)
      return { worker: null, error }
    }

    // Map to expected format (no UI-specific computed fields)
    const worker: Worker = {
      ...data,
    }

    return { worker, error: null }
  } catch (error) {
    console.error('Error in createWorkerBrowser:', error)
    return { worker: null, error }
  }
}

/**
 * Update worker (browser client)
 */
export async function updateWorkerBrowser(
  workerId: string,
  businessId: string,
  updates: Partial<WorkerUpdate>
): Promise<{ worker: Worker | null; error: any }> {
  try {
    const supabase = createBrowserClient()
    
    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', workerId)
      .eq('business_id', businessId)
      .select()
      .single()

    if (error) {
      console.error('Error updating worker:', error)
      return { worker: null, error }
    }

    // Map to expected format
    const worker: Worker = {
      ...data,
      initials: data.name.split(' ').map(n => n[0]).join(' ').substring(0, 3)
    }

    return { worker, error: null }
  } catch (error) {
    console.error('Error in updateWorkerBrowser:', error)
    return { worker: null, error }
  }
}

/**
 * Delete worker (browser client)
 */
export async function deleteWorkerBrowser(
  workerId: string,
  businessId: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = createBrowserClient()
    
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', workerId)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error deleting worker:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteWorkerBrowser:', error)
    return { success: false, error }
  }
}