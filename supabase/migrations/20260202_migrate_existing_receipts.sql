-- Step 2: Migrate existing receipt data from attachments table to transactions table
-- This query updates transactions with receipt URLs from the attachments table
-- Run this AFTER running 20260202_add_receipt_columns.sql

-- Update transactions with receipt path from attachments table
UPDATE public.transactions t
SET 
  receipt_path = a.path,
  receipt_url = NULL  -- Will be regenerated on next view
FROM (
  SELECT DISTINCT ON (transaction_id)
    transaction_id,
    path
  FROM public.attachments
  WHERE bucket = 'receipts'
  ORDER BY transaction_id, created_at DESC
) a
WHERE t.id = a.transaction_id
  AND t.receipt_path IS NULL;

-- Log the number of updated transactions
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % transactions with receipt paths from attachments table', updated_count;
END $$;
