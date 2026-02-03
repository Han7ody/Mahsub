-- Add receipt_url and receipt_path columns to transactions table
-- These columns store direct references to receipt files for faster access
-- They complement the attachments table which maintains a complete audit trail

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_path TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.transactions.receipt_url IS 'Signed URL for receipt image/PDF (cached for quick access)';
COMMENT ON COLUMN public.transactions.receipt_path IS 'Storage path for receipt file in Supabase Storage (receipts bucket)';
