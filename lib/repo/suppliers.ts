// @ts-nocheck
/**
 * Suppliers Repository
 * Data access layer for supplier operations
 * Nearly identical to customers repo
 */

// import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { getTransactionsSummary } from './transactions'
import { uploadAvatar } from '@/lib/storage'

type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']

export interface Supplier {
  id: string
  business_id: string
  name: string
  phone: string | null
  avatar_url: string | null
  opening_balance: number
  opening_balance_direction: 'in' | 'out' | null
  created_at: string
  notes?: string
  // Computed
  current_balance?: number
  status?: 'debt' | 'clear' | 'credit'
}

export interface SupplierWithBalance extends Supplier {
  current_balance: number
  status: 'debt' | 'clear' | 'credit'
}

interface ListSuppliersOptions {
  businessId: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(
  supplierId: string,
  businessId: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<{ supplier: SupplierWithBalance | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .eq('business_id', businessId)
      .single()

    if (error) throw error
    if (!data) return { supplier: null, error: new Error('Supplier not found') }

    // Get transaction summary for this supplier
    const { totalIn, totalOut, error: summaryError } = await getTransactionsSummary(
      businessId,
      'supplier',
      supplierId,
      { startDate: opts?.startDate, endDate: opts?.endDate }
    )

    if (summaryError) {
      console.warn('Failed to get transaction summary for supplier', supplierId, summaryError)
    }

    // Calculate current balance
    //
    // ⚠️ CRITICAL SEMANTIC DOCUMENTATION:
    // This balance formula is INVERTED relative to customers domain due to opposite transaction semantics.
    // This is NOT a bug—it is a conscious design decision. Both formulas are mathematically correct.
    //
    // TRANSACTION SEMANTICS (opposite in each domain):
    //   CUSTOMERS:
    //     - totalOut = money customer owes us (purchases, debts)
    //     - totalIn = money we received from customer (payments)
    //   SUPPLIERS:
    //     - totalIn = money we owe supplier (purchases we made)
    //     - totalOut = money we paid to supplier (payments made)
    //
    // BALANCE CALCULATION:
    //   CUSTOMERS: balance = opening + (totalOut - totalIn)
    //     Positive = customer owes us, Negative = we owe customer
    //   SUPPLIERS: balance = opening + (totalIn - totalOut)
    //     Positive = we owe supplier, Negative = supplier owes us
    //
    // STATUS FLAG MEANINGS (domain-dependent):
    //   - 'debt' in Customer context = customer owes us (positive balance)
    //   - 'debt' in Supplier context = we owe supplier (positive balance)
    //   SAME LABEL, OPPOSITE MEANINGS! Always check domain context.
    //
    // OPENING BALANCE DIRECTION FIELD:
    //   opening_balance_direction='in':
    //     For customers: "customer owes us X" (liability to us)
    //     For suppliers: "we owe supplier X" (liability to them)
    //
    // DEVELOPERS: If modifying balance calculations, ensure changes are mirrored
    // and documented in BOTH suppliers.ts and customers.ts
    //
    const openingBalance = data.opening_balance || 0
    const openingDirection = data.opening_balance_direction || 'in'
    const signedOpeningBalance = openingDirection === 'in' ? openingBalance : -openingBalance
    const currentBalance = signedOpeningBalance + (totalIn - totalOut)
    const status = currentBalance > 0 ? 'debt' : currentBalance < 0 ? 'credit' : 'clear'

    const supplierWithBalance: SupplierWithBalance = {
      ...data,
      current_balance: Math.abs(currentBalance),
      status: status as 'debt' | 'clear' | 'credit',
    }

    return { supplier: supplierWithBalance, error: null }
  } catch (error) {
    return { supplier: null, error: error as Error }
  }
}

/**
 * List suppliers (browser)
 */
export async function listSuppliersBrowser(
  options: ListSuppliersOptions
): Promise<{ suppliers: Supplier[]; error: Error | null }> {
  try {
    const supabase = createBrowserClient()
    const { businessId, search, limit = 50, offset = 0 } = options

    // Use RPC for optimized fetching (Scale to 100k+)
    // RPC handles search, pagination, and balance calculation.

    const { data, error } = await supabase.rpc('get_suppliers_with_balance', {
      p_business_id: businessId,
      p_search: search && search.trim() ? search.trim() : null,
      p_limit: limit,
      p_offset: offset
    })

    if (error) throw error

    // Map RPC result to application model
    const suppliers: Supplier[] = (data || []).map((s: any) => {
      return {
        id: s.id,
        business_id: businessId,
        name: s.name,
        phone: s.phone,
        avatar_url: s.avatar_url,
        avatarUrl: s.avatar_url,
        opening_balance: Number(s.opening_balance) || 0,
        opening_balance_direction: s.opening_balance_direction,
        created_at: s.created_at,
        current_balance: Number(s.current_balance) || 0,
        status: s.status as 'debt' | 'clear' | 'credit',
      }
    })

    return { suppliers, error: null }
  } catch (error) {
    console.error('listSuppliersBrowser error:', error)
    return { suppliers: [], error: error as Error }
  }
}

/**
 * Create supplier
 */
export async function createSupplier(data: {
  businessId: string
  name: string
  phone?: string
  openingBalance?: number
  openingBalanceDirection?: 'in' | 'out'
  profileImage?: File | string | null
}): Promise<{ supplier: Supplier | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const insertData: SupplierInsert = {
      business_id: data.businessId,
      name: data.name,
      phone: data.phone || null,
      opening_balance: data.openingBalance || 0,
      opening_balance_direction: data.openingBalanceDirection || null,
      avatar_url: null,
    }

    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('Supplier creation error:', error)
      throw error
    }

    if (!newSupplier) {
      console.error('No supplier returned from insert')
      throw new Error('No supplier returned from insert')
    }

    console.log('Supplier created successfully:', newSupplier)

    // Handle profile image upload if provided (File preferred, base64 fallback)
    if (data.profileImage) {
      let avatarFile: File | null = null;

      if (data.profileImage instanceof File) {
        avatarFile = data.profileImage;
      } else if (typeof data.profileImage === 'string') {
        try {
          const base64Data = data.profileImage.split(',')[1] || data.profileImage;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          avatarFile = new File([blob], `${newSupplier.id}.jpg`, { type: 'image/jpeg' });
        } catch (imageError) {
          console.warn('Error processing supplier avatar:', imageError);
        }
      }

      if (avatarFile) {
        console.log('Starting avatar upload for supplier:', newSupplier.id);

        // Upload avatar to storage
        const { path: avatarPath, error: uploadError } = await uploadAvatar(
          avatarFile,
          data.businessId,
          'supplier',
          newSupplier.id
        );

        if (uploadError) {
          console.error('Failed to upload supplier avatar during creation:', uploadError);
          // Don't fail the supplier creation if avatar upload fails
        } else if (avatarPath) {
          console.log('Supplier avatar uploaded successfully to storage:', avatarPath);

          // Update supplier record with avatar path
          const { error: updateError } = await supabase
            .from('suppliers')
            .update({ avatar_url: avatarPath })
            .eq('id', newSupplier.id)
            .eq('business_id', data.businessId);

          if (updateError) {
            console.error('Failed to update supplier avatar_url in database:', updateError);
          } else {
            console.log('Supplier avatar_url updated successfully in database');

            // Re-fetch supplier to get updated avatar_url
            const { data: updatedSupplier, error: refetchError } = await supabase
              .from('suppliers')
              .select('*')
              .eq('id', newSupplier.id)
              .single();

            if (!refetchError && updatedSupplier) {
              console.log('Returning updated supplier with avatar_url:', updatedSupplier.avatar_url);
              return { supplier: updatedSupplier, error: null };
            }
          }
        }
      }
    }

    return { supplier: newSupplier, error: null }
  } catch (error) {
    return { supplier: null, error: error as Error }
  }
}

/**
 * Update supplier
 * Note: Avatar upload is now handled separately via uploadAvatar() in storage.ts
 * This function only updates name and phone
 */
export async function updateSupplier(
  supplierId: string,
  data: {
    name?: string
    phone?: string
    profileImage?: string | null
    notes?: string
  }
): Promise<{ supplier: Supplier | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    let avatarUrl: string | null | undefined

    // Handle profile image upload if provided (base64 string)
    if (data.profileImage) {
      try {
        const base64Data = data.profileImage.split(',')[1] || data.profileImage;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const avatarFile = new File([blob], `${supplierId}.jpg`, { type: 'image/jpeg' });

        // Get business_id first for uploadAvatar
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('business_id')
          .eq('id', supplierId)
          .single();

        if (supplier?.business_id) {
          const { path: avatarPath, error: uploadError } = await uploadAvatar(
            avatarFile,
            supplier.business_id,
            'supplier',
            supplierId
          );

          if (!uploadError && avatarPath) {
            avatarUrl = avatarPath;
          }
        }
      } catch (imageError) {
        console.warn('Error processing supplier avatar update:', imageError);
      }
    }

    const updateData: SupplierUpdate = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplierId)
      .select()
      .single()

    if (error) throw error

    return { supplier: updated, error: null }
  } catch (error) {
    return { supplier: null, error: error as Error }
  }
}

/**
 * Get last activity for a supplier based on their latest transaction
 */
export async function getSupplierLastActivity(
  businessId: string,
  supplierId: string
): Promise<string> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('transactions')
      .select('occurred_at')
      .eq('business_id', businessId)
      .eq('supplier_id', supplierId)
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

/**
 * Delete supplier
 */
export async function deleteSupplier(
  supplierId: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}
