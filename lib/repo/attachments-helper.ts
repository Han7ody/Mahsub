// @ts-nocheck
/**
 * Attachments Helper Functions
 * Additional helper functions for managing transaction attachments
 */

import { createBrowserClient } from '@/lib/supabase/client'
import { deleteAttachment } from './attachments'

/**
 * Delete all receipts for a transaction and optionally upload a new one
 * Useful when replacing a receipt during transaction update
 */
export async function replaceTransactionReceipts(
  transactionId: string,
  bucket: 'receipts' | 'avatars' = 'receipts'
): Promise<{ error: Error | null; deletedCount: number }> {
  try {
    const supabase = createBrowserClient()

    // Get all receipts for this transaction
    const { data: attachments, error: fetchError } = await supabase
      .from('attachments')
      .select('id, path')
      .eq('transaction_id', transactionId)
      .eq('bucket', bucket)

    if (fetchError) throw fetchError

    if (!attachments || attachments.length === 0) {
      return { error: null, deletedCount: 0 }
    }

    // Delete files from storage
    const filePaths = attachments.map(a => a.path)
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove(filePaths)

    if (storageError) {
      console.warn('Failed to delete some files from storage:', storageError)
    }

    // Delete attachment records
    const attachmentIds = attachments.map(a => a.id)
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .in('id', attachmentIds)

    if (dbError) throw dbError

    return { error: null, deletedCount: attachments.length }
  } catch (error) {
    return { error: error as Error, deletedCount: 0 }
  }
}
