-- اختبار التحقق من الإيصالات
-- قم بتشغيل هذه الاستعلامات في Supabase SQL Editor للتحقق

-- 1. التحقق من وجود الأعمدة الجديدة
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('receipt_url', 'receipt_path')
ORDER BY column_name;

-- 2. عرض المعاملات التي لها إيصالات في جدول attachments
SELECT 
  t.id as transaction_id,
  t.title,
  t.amount,
  t.receipt_path as current_receipt_path,
  t.receipt_url as current_receipt_url,
  a.path as attachment_path,
  a.file_name as attachment_filename
FROM transactions t
LEFT JOIN attachments a ON t.id = a.transaction_id AND a.bucket = 'receipts'
WHERE a.id IS NOT NULL
ORDER BY t.occurred_at DESC
LIMIT 10;

-- 3. عد المعاملات التي لها إيصالات في attachments ولكن ليس في transactions
SELECT 
  COUNT(DISTINCT t.id) as transactions_with_attachments,
  COUNT(DISTINCT CASE WHEN t.receipt_path IS NOT NULL THEN t.id END) as transactions_with_path,
  COUNT(DISTINCT CASE WHEN t.receipt_path IS NULL THEN t.id END) as need_migration
FROM transactions t
INNER JOIN attachments a ON t.id = a.transaction_id AND a.bucket = 'receipts';

-- 4. إذا كانت القيمة need_migration > 0، قم بتشغيل هذا لترحيل البيانات:
-- (قم بإلغاء التعليق وتشغيله)
/*
UPDATE public.transactions t
SET 
  receipt_path = a.path,
  receipt_url = NULL
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
*/
