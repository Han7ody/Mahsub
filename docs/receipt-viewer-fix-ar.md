# إصلاح مشكلة عرض الإيصالات (Receipt Viewer Fix)

## المشكلة
لا يمكن رؤية أو تعديل الإيصالات في نافذة "تفاصيل المعاملة".

## السبب
قاعدة البيانات تفتقد حقلين مهمين في جدول `transactions`:
- `receipt_url` - لتخزين رابط الإيصال
- `receipt_path` - لتخزين مسار الملف في التخزين

## الحل - خطوات التطبيق

### الخطوة 1: إضافة الأعمدة إلى قاعدة البيانات

افتح لوحة تحكم Supabase الخاصة بك:
1. اذهب إلى SQL Editor
2. انسخ والصق **الكود SQL فقط** (بدون علامات ```):

```sql
-- Add receipt_url and receipt_path columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_path TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.transactions.receipt_url IS 'Signed URL for receipt image/PDF (cached for quick access)';
COMMENT ON COLUMN public.transactions.receipt_path IS 'Storage path for receipt file in Supabase Storage (receipts bucket)';
```

**⚠️ مهم:** انسخ السطور من `ALTER TABLE` حتى النهاية فقط، **لا تنسخ** علامات ` ```sql ` أو ` ``` `

3. اضغط على "Run" لتطبيق التغييرات

### الخطوة 2: ترحيل البيانات الموجودة (اختياري)

**⚠️ انسخ الكود SQL فقط بدون علامات ` ``` `**

إذا كان لديك معاملات سابقة تحتوي على إيصالات، قم بتشغيل هذا الاستعلام:

```sql
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
```

### الخطوة 3: اختبار التطبيق

1. أعد تشغيل التطبيق (إذا لزم الأمر)
2. افتح أي معاملة تحتوي على إيصال
3. يجب أن تظهر صورة الإيصال في نافذة "تفاصيل المعاملة"
4. يمكنك الآن:
   - عرض الإيصال بالنقر على "عرض"
   - تحميل الإيصال بالنقر على "تحميل"
   - تعديل المعاملة والإيصال معًا

## التحسينات المطبقة

### 1. إنشاء Signed URL تلقائيًا
- إذا كان للمعاملة مسار إيصال (`receipt_path`) ولكن لا يوجد رابط (`receipt_url`)
- سيقوم النظام تلقائيًا بإنشاء رابط موقع عند فتح عارض الإيصالات

### 2. عرض الإيصالات بشكل صحيح
- تم إصلاح مشكلة عدم ظهور الإيصالات في نافذة التفاصيل
- يتم الآن تحميل الإيصالات من قاعدة البيانات بشكل صحيح

### 3. التعديل والحفظ
- يمكن الآن تعديل المعاملة وحذف أو تغيير الإيصال
- يتم حفظ التغييرات في قاعدة البيانات

## ملفات التعديلات

تم تعديل الملفات التالية:
1. ✅ `supabase/migrations/20260202_add_receipt_columns.sql` - إضافة الأعمدة
2. ✅ `supabase/migrations/20260202_migrate_existing_receipts.sql` - ترحيل البيانات
3. ✅ `supabase/complete_schema_v2.sql` - تحديث المخطط
4. ✅ `supabase/schema_final_refactored.sql` - تحديث المخطط المبسط
5. ✅ `components/dashboard/ReceiptViewer.tsx` - إنشاء روابط تلقائية
6. ✅ `app/dashboard/customers/[id]/page.tsx` - تحسين تحميل البيانات

## التحقق من النجاح

بعد تطبيق التغييرات، تحقق من:

```sql
-- التحقق من وجود الأعمدة الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('receipt_url', 'receipt_path');
```

يجب أن ترى صفين:
- `receipt_url | text`
- `receipt_path | text`

---

**ملاحظة:** إذا واجهت أي مشاكل، تأكد من:
1. تطبيق Migration الخطوة 1 أولاً
2. التحقق من أن المستخدم لديه صلاحيات الكتابة على جدول transactions
3. مراجعة سجلات الأخطاء في وحدة التحكم (Console)
