// @ts-nocheck
/**
 * Customers Repository
 * Data access layer for customer operations
 * 
 * Note: TypeScript errors related to Supabase types (`never`) will appear
 * if NEXT_PUBLIC_SUPABASE_URL is not set. This is expected and will resolve
 * when environment variables are configured.
 */

// import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { getTransactionsSummary } from './transactions'
import { uploadAvatar } from '@/lib/storage'

type CustomerRow = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string | null
  avatar_url: string | null
  opening_balance: number
  opening_balance_direction: 'in' | 'out' | null
  created_at: string
  notes?: string
  // Computed fields
  current_balance?: number
  status?: 'debt' | 'clear' | 'credit'
}

export interface CustomerWithBalance extends Customer {
  current_balance: number
  status: 'debt' | 'clear' | 'credit'
}

interface ListCustomersOptions {
  businessId: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * List customers for a business (browser client)
 */
export async function listCustomersBrowser(
  options: ListCustomersOptions
): Promise<{ customers: CustomerWithBalance[]; error: Error | null }> {
  try {
    const supabase = createBrowserClient()
    const { businessId, search, limit = 50, offset = 0 } = options

    // Use RPC for optimized fetching (Scale to 100k+)
    // RPC handles search, pagination, and balance calculation in one go.

    const { data, error } = await supabase.rpc('get_customers_with_balance', {
      p_business_id: businessId,
      p_search: search && search.trim() ? search.trim() : null,
      p_limit: limit,
      p_offset: offset
    })

    if (error) throw error

    // Map RPC result to application model
    const customersWithBalance: CustomerWithBalance[] = (data || []).map((c: any) => {
      return {
        id: c.id,
        business_id: businessId,
        name: c.name,
        phone: c.phone,
        avatar_url: c.avatar_url,
        opening_balance: Number(c.opening_balance) || 0,
        opening_balance_direction: c.opening_balance_direction,
        created_at: c.created_at,
        current_balance: Number(c.current_balance) || 0,
        status: c.status as 'debt' | 'clear' | 'credit',
      }
    })

    return { customers: customersWithBalance, error: null }
  } catch (error) {
    console.error('listCustomersBrowser error:', error)
    return { customers: [], error: error as Error }
  }
}

/**
 * List customers for a business (server client)
 */
// Server-side function - not used in current implementation
/* export async function listCustomersServer(
  options: ListCustomersOptions
): Promise<{ customers: CustomerWithBalance[]; error: Error | null }> {
  try {
    const supabase = await createSupabaseServerClient()
    const { businessId, search, limit = 50, offset = 0 } = options

    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search && search.trim()) {
      const searchTerm = search.trim()
      query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) throw error

    // Calculate balances
    const customersWithBalance: CustomerWithBalance[] = ((data || []) as CustomerRow[]).map((c) => {
      const balance = c.opening_balance || 0
      const status =
        balance > 0
          ? c.opening_balance_direction === 'in'
            ? 'debt'
            : 'credit'
          : 'clear'

      return {
        ...c,
        current_balance: balance,
        status: status as 'debt' | 'clear' | 'credit',
      }
    })

    return { customers: customersWithBalance, error: null }
  } catch (error) {
    return { customers: [], error: error as Error }
  }
}
*/

/**
 * Get customer by ID with transactions
 */
export async function getCustomerById(
  customerId: string,
  businessId: string
): Promise<{ customer: CustomerWithBalance | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single()

    if (error) throw error
    if (!data) return { customer: null, error: null }

    const customer = data as CustomerRow

    // Get transaction summary for this customer
    const { totalIn, totalOut, error: summaryError } = await getTransactionsSummary(
      businessId,
      'customer',
      customer.id
    )

    if (summaryError) {
      console.warn('Failed to get transaction summary for customer', customer.id, summaryError)
    }

    // Calculate current balance: opening_balance + (totalOut - totalIn)
    // For customers: totalOut = money they owe us (أعطيته), totalIn = money we received (قبضت)
    const openingBalance = Number(customer.opening_balance) || 0
    const openingDirection = customer.opening_balance_direction || 'out' // Default to 'out' (they owe us)

    // Direction logic: 
    // 'out' means they start with debt (positive)
    // 'in' means they start with credit (negative)
    const signedOpeningBalance = openingDirection === 'out' ? openingBalance : -openingBalance

    // Current balance = opening + (what they owe - what they paid)
    const currentBalance = signedOpeningBalance + (totalOut - totalIn)

    // Status logic:
    // positive = debt (عليه)
    // negative = credit (له)
    const status = currentBalance > 0 ? 'debt' : currentBalance < 0 ? 'credit' : 'clear'

    return {
      customer: {
        ...customer,
        current_balance: Math.abs(currentBalance),
        status: status as 'debt' | 'clear' | 'credit',
        signed_balance: currentBalance // Adding this for UI precision
      },
      error: null,
    }
  } catch (error) {
    return { customer: null, error: error as Error }
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: {
  businessId: string
  name: string
  phone?: string | null
  openingBalance?: number
  openingBalanceDirection?: 'in' | 'out'
  profileImage?: File | string | null
}): Promise<{ customer: Customer | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    // Insert customer first (avatar upload optional afterwards)
    const insertData: CustomerInsert = {
      business_id: data.businessId,
      name: data.name,
      phone: data.phone || null,
      opening_balance: data.openingBalance || 0,
      opening_balance_direction: data.openingBalanceDirection || null,
      avatar_url: null,
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Handle profile image upload if provided (File preferred, base64 fallback)
    if (newCustomer && data.profileImage) {
      let avatarFile: File | null = null

      if (data.profileImage instanceof File) {
        avatarFile = data.profileImage
      } else if (typeof data.profileImage === 'string') {
        try {
          const base64Data = data.profileImage.split(',')[1] || data.profileImage
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' })
          avatarFile = new File([blob], `${newCustomer.id}.jpg`, { type: 'image/jpeg' })
        } catch (imgError) {
          console.warn('Error processing customer avatar:', imgError)
        }
      }

      if (avatarFile) {
        console.log('Starting avatar upload for customer:', newCustomer.id);

        const { path: avatarPath, error: uploadError } = await uploadAvatar(
          avatarFile,
          data.businessId,
          'customer',
          newCustomer.id
        )

        if (uploadError) {
          console.error('Failed to upload customer avatar:', uploadError)
        } else if (avatarPath) {
          console.log('Customer avatar uploaded successfully to storage:', avatarPath);

          // Update customer record with avatar path
          const { error: updateError } = await supabase
            .from('customers')
            .update({ avatar_url: avatarPath })
            .eq('id', newCustomer.id)
            .eq('business_id', data.businessId);

          if (updateError) {
            console.error('Failed to update customer avatar_url in database:', updateError);
          } else {
            console.log('Customer avatar_url updated successfully in database');

            const { data: updatedCustomer, error: refetchError } = await supabase
              .from('customers')
              .select()
              .eq('id', newCustomer.id)
              .single()

            if (!refetchError && updatedCustomer) {
              console.log('Returning updated customer with avatar_url:', updatedCustomer.avatar_url);
              return { customer: updatedCustomer as Customer, error: null }
            }
          }
        }
      }
    }

    return { customer: newCustomer as Customer, error: null }
  } catch (error) {
    return { customer: null, error: error as Error }
  }
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: string,
  data: {
    name?: string
    phone?: string
    profileImage?: string | null
    notes?: string
  }
): Promise<{ customer: Customer | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    let avatarUrl: string | null | undefined

    // Upload profile image if provided (data URL)
    if (data.profileImage) {
      try {
        const base64Data = data.profileImage.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' })
        const fileName = `customer-${customerId}-${Date.now()}.jpg`
        const filePath = `customers/${customerId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, { upsert: false })

        if (uploadError) {
          console.warn('Failed to upload customer avatar:', uploadError)
        } else {
          // Get public URL directly from the file path
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

          if (publicUrlData?.publicUrl) {
            avatarUrl = publicUrlData.publicUrl
            console.log('Updated customer avatar URL:', avatarUrl)
          }
        }
      } catch (imgError) {
        console.warn('Error processing profile image:', imgError)
      }
    }

    const updateData: CustomerUpdate = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: updated, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error

    return { customer: updated, error: null }
  } catch (error) {
    return { customer: null, error: error as Error }
  }
}

/**
 * Get last activity for a customer based on their latest transaction
 */
export async function getCustomerLastActivity(
  businessId: string,
  customerId: string
): Promise<string> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('transactions')
      .select('occurred_at')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return 'لا توجد معاملات'
    }

    const lastTransaction = new Date(data.occurred_at)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - lastTransaction.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'منذ دقائق'
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return 'أمس'
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`
    if (diffInDays < 30) return `منذ ${Math.floor(diffInDays / 7)} أسابيع`

    return `منذ ${Math.floor(diffInDays / 30)} شهر`
  } catch (error) {
    return 'اليوم' // Fallback
  }
}
export async function deleteCustomer(
  customerId: string
): Promise<{ error: Error | null }> {
  try {
    console.log("Repo: Starting deleteCustomer for ID:", customerId);
    const supabase = createBrowserClient()

    // First delete all transactions related to this customer
    const { error: paramsError } = await supabase
      .from('transactions')
      .delete()
      .eq('customer_id', customerId)
      .eq('entity_type', 'customer')

    if (paramsError) {
      console.error("Repo: Failed to delete transactions:", paramsError);
      throw paramsError
    }

    // Then delete the customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (error) {
      console.error("Repo: Failed to delete customer:", error);
      throw error
    }

    console.log("Repo: Delete execution successful");
    return { error: null }
  } catch (error) {
    console.error('deleteCustomer error:', error)
    return { error: error as Error }
  }
}
