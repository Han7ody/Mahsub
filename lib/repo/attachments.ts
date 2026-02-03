// @ts-nocheck
/**
 * Attachments Repository
 * Data access layer for file attachment operations
 */

import { createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type AttachmentInsert = Database['public']['Tables']['attachments']['Insert']
type AttachmentRow = Database['public']['Tables']['attachments']['Row']

export interface Attachment {
  id: string
  business_id: string
  transaction_id: string | null
  bucket: string
  path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

/**
 * Create attachment record after successful file upload
 */
export async function createAttachment(data: {
  businessId: string
  transactionId?: string
  bucket: 'receipts' | 'avatars'
  path: string
  fileName: string
  mimeType?: string
  sizeBytes?: number
}): Promise<{ attachment: Attachment | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const insertData: AttachmentInsert = {
      business_id: data.businessId,
      transaction_id: data.transactionId || null,
      bucket: data.bucket,
      path: data.path,
      file_name: data.fileName,
      mime_type: data.mimeType || null,
      size_bytes: data.sizeBytes || null,
    }

    const { data: newAttachment, error } = await supabase
      .from('attachments')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    return { attachment: newAttachment, error: null }
  } catch (error) {
    return { attachment: null, error: error as Error }
  }
}

/**
 * List attachments for a transaction
 */
export async function getTransactionAttachments(
  transactionId: string
): Promise<{ attachments: Attachment[]; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { attachments: data || [], error: null }
  } catch (error) {
    return { attachments: [], error: error as Error }
  }
}

/**
 * List all attachments for a business
 */
export async function listAttachments(
  businessId: string,
  bucket?: 'receipts' | 'avatars',
  limit: number = 50,
  offset: number = 0
): Promise<{ attachments: Attachment[]; error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    let query = supabase
      .from('attachments')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (bucket) {
      query = query.eq('bucket', bucket)
    }

    const { data, error } = await query

    if (error) throw error

    return { attachments: data || [], error: null }
  } catch (error) {
    return { attachments: [], error: error as Error }
  }
}

/**
 * Delete attachment record and file
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<{ error: Error | null }> {
  try {
    const supabase = createBrowserClient()

    // Get attachment details first
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('bucket, path')
      .eq('id', attachmentId)
      .single()

    if (fetchError) throw fetchError

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(attachment.bucket)
      .remove([attachment.path])

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete attachment record
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) throw dbError

    return { error: null }
  } catch (error) {
    return { error: error as Error }
  }
}