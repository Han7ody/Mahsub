// @ts-nocheck
/**
 * Transactions Repository
 * Data access layer for transaction operations
 */

import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export interface Transaction {
  id: string
  business_id: string
  entity_type: 'customer' | 'supplier' | 'ledger'
  customer_id: string | null
  supplier_id: string | null
  type: 'in' | 'out'
  amount: number
  payment_method: 'cash' | 'online' | 'bank' | 'other'
  title: string | null
  notes: string | null
  occurred_at: string
  created_by: string | null
  created_by: string | null
  created_at: string
  receipt_url?: string | null
  receipt_path?: string | null
}

interface ListTransactionsOptions {
  businessId: string
  entityType?: 'customer' | 'supplier' | 'ledger'
  entityId?: string
  type?: 'in' | 'out'
  paymentMethod?: 'cash' | 'online' | 'bank' | 'other'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * List transactions (browser client)
 */
export async function listTransactionsBrowser(
  options: ListTransactionsOptions
): Promise<{ transactions: Transaction[]; error: Error | null }> {
  try {
    const supabase = createBrowserClient()
    const {
      businessId,
      entityType,
      entityId,
      type,
      paymentMethod,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = options

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      if (entityType === 'customer') {
        query = query.eq('customer_id', entityId)
      } else if (entityType === 'supplier') {
        query = query.eq('supplier_id', entityId)
      }
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod)
    }

    if (startDate) {
      query = query.gte('occurred_at', startDate)
    }

    if (endDate) {
      query = query.lte('occurred_at', endDate)
    }

    const { data: transactionsData, error } = await query

    if (error) throw error

    let transactions = (transactionsData || []) as Transaction[]

    // Fetch receipt data from attachments table for transactions that don't have receipt_path
    const transactionIds = transactions.filter(t => !t.receipt_path).map(t => t.id)
    
    if (transactionIds.length > 0) {
      const { data: attachments } = await supabase
        .from('attachments')
        .select('transaction_id, path, file_name')
        .in('transaction_id', transactionIds)
        .eq('bucket', 'receipts')
        .order('created_at', { ascending: false })

      if (attachments && attachments.length > 0) {
        // Create a map of transaction_id to attachment
        const attachmentMap = new Map<string, typeof attachments[0]>()
        attachments.forEach(att => {
          if (!attachmentMap.has(att.transaction_id)) {
            attachmentMap.set(att.transaction_id, att)
          }
        })

        // Update transactions with attachment data
        transactions = transactions.map(t => {
          if (!t.receipt_path && attachmentMap.has(t.id)) {
            const att = attachmentMap.get(t.id)!
            return {
              ...t,
              receipt_path: att.path,
              receipt_url: null, // Will be generated on view
            }
          }
          return t
        })
      }
    }

    return { transactions, error: null }
  } catch (error) {
    return { transactions: [], error: error as Error }
  }
}


/**
 * Create a new transaction
 */
export async function createTransaction(data: {
  businessId: string
  entityType: 'customer' | 'supplier' | 'ledger'
  customerId?: string
  supplierId?: string
  type: 'in' | 'out'
  amount: number
  paymentMethod?: 'cash' | 'online' | 'bank' | 'other'
  title?: string
  notes?: string
  occurredAt?: string
}): Promise<{ transaction: Transaction | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    // Validate entity constraints
    if (data.entityType === 'customer' && !data.customerId) {
      throw new Error('Customer ID required for customer transactions')
    }
    if (data.entityType === 'supplier' && !data.supplierId) {
      throw new Error('Supplier ID required for supplier transactions')
    }
    if (data.entityType === 'ledger' && (data.customerId || data.supplierId)) {
      throw new Error('Ledger transactions cannot have customer or supplier')
    }

    const insertData: TransactionInsert = {
      business_id: data.businessId,
      entity_type: data.entityType,
      customer_id: data.customerId || null,
      supplier_id: data.supplierId || null,
      type: data.type,
      amount: data.amount,
      payment_method: data.paymentMethod || 'cash',
      title: data.title || null,
      notes: data.notes || null,
      occurred_at: data.occurredAt || new Date().toISOString(),
    }

    const { data: newTransaction, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return { transaction: newTransaction, error: null }
  } catch (error) {
    return { transaction: null, error: error as Error }
  }
}

/**
 * Update transaction
 * Note: Receipt uploads are handled separately via uploadReceipt() in storage.ts
 * which creates entries in the attachments table
 */
export async function updateTransaction(
  transactionId: string,
  data: {
    title?: string
    notes?: string
    amount?: number
    paymentMethod?: 'cash' | 'online' | 'bank' | 'other'
    occurredAt?: string // Add date/time support
    type?: 'in' | 'out' // Add type support (though rarely changed)
    receipt_url?: string | null
    receipt_path?: string | null
  }
): Promise<{ transaction: Transaction | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const updateData: TransactionUpdate = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod
    if (data.occurredAt !== undefined) updateData.occurred_at = data.occurredAt
    if (data.type !== undefined) updateData.type = data.type
    if (data.receipt_url !== undefined) updateData.receipt_url = data.receipt_url
    if (data.receipt_path !== undefined) updateData.receipt_path = data.receipt_path

    const { data: updated, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single()

    if (error) throw error

    return { transaction: updated, error: null }
  } catch (error) {
    console.error('[updateTransaction] Error updating transaction:', {
      transactionId,
      error: error instanceof Error ? error.message : String(error),
      fullError: error
    });
    return { transaction: null, error: error as Error }
  }
}

/**
 * Delete transaction
 */
export async function deleteTransaction(
  transactionId: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Get transaction count and summary statistics
 */
export async function getTransactionsSummary(
  businessId: string,
  entityType?: 'customer' | 'supplier' | 'ledger',
  entityId?: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<{
  totalIn: number
  totalOut: number
  balance: number
  count: number
  error: Error | null
}> {
  try {
    const supabase = createBrowserClient()

    // Use RPC if available (checking for it implicitly by calling it)
    // If we wanted to be super safe we could try/catch the RPC, but we assume migration is run.

    // Note: The RPC parameters in SQL are: p_business_id, p_entity_type, p_entity_id
    // It does not currently support dates. IF date filtering is needed, we need to update RPC or use fallback.
    // However, for the main use case (Customer Details balance), dates are not usually filtered (Total Balance).
    // The "Debts Ledger" page doesn't use this function for filtering, it uses listTransactions.

    // So for Customer/Supplier balance (total history), RPC is perfect.
    // If opts have dates, we might need fallback or update RPC.
    // For now, let's use RPC for the main "no-date-filter" case which is the performance killer.

    if (opts?.startDate || opts?.endDate) {
      // Fallback to old method for date filtering until RPC supports it
      let query = supabase
        .from('transactions')
        .select('type, amount')
        .eq('business_id', businessId)

      if (entityType) query = query.eq('entity_type', entityType)
      if (entityId) {
        if (entityType === 'customer') query = query.eq('customer_id', entityId)
        else if (entityType === 'supplier') query = query.eq('supplier_id', entityId)
      }
      if (opts?.startDate) query = query.gte('occurred_at', opts.startDate)
      if (opts?.endDate) query = query.lte('occurred_at', opts.endDate)

      const { data, error } = await query
      if (error) throw error

      const transactions = (data || []) as any[]
      const totalIn = transactions.filter((t) => t.type === 'in').reduce((sum, t) => sum + Number(t.amount), 0)
      const totalOut = transactions.filter((t) => t.type === 'out').reduce((sum, t) => sum + Number(t.amount), 0)

      // Cashflow balance convention: + (outflow) / - (inflow)
      return { totalIn, totalOut, balance: totalOut - totalIn, count: transactions.length, error: null }
    }

    // RPC Call
    const { data, error } = await supabase.rpc('get_transactions_summary', {
      p_business_id: businessId,
      p_entity_type: entityType,
      p_entity_id: entityId
    })

    if (error) throw error

    // RPC returns a single row with total_in, total_out, tx_count
    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      return { totalIn: 0, totalOut: 0, balance: 0, count: 0, error: null }
    }

    const totalIn = Number(result.total_in || 0)
    const totalOut = Number(result.total_out || 0)

    return {
      totalIn,
      totalOut,
      balance: totalOut - totalIn, // Positive = they owe us/we owe them (Context dependent)
      count: Number(result.tx_count || 0),
      error: null,
    }

  } catch (error) {
    console.error('getTransactionsSummary error:', error)
    return {
      totalIn: 0,
      totalOut: 0,
      balance: 0,
      count: 0,
      error: error as Error,
    }
  }
}
