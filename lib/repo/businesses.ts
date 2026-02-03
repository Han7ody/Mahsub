import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type BusinessUpdate = Database['public']['Tables']['businesses']['Update']

export async function updateBusiness(
  businessId: string,
  data: {
    name?: string
    phone?: string
    address?: string
    logo_url?: string
  }
): Promise<{ error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const updateData: BusinessUpdate = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url

    const { error } = await supabase
      .from('businesses')
      // @ts-ignore
      .update(updateData)
      .eq('id', businessId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('updateBusiness error:', error)
    return { error: error as Error }
  }
}
