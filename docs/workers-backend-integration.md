# Workers Backend Integration

## What Changed

### 1. Removed Worker Status System
- **UI Changes**: Completely removed "حالة العامل" (Worker Status) section from WorkerDetailsModal
- **Backend Changes**: Removed `is_active` field from workers table schema
- **Repository Changes**: Removed status-related fields from Worker interface and all CRUD operations
- **Page Changes**: Removed status chips and conditional rendering based on worker status

### 2. Made Phone Number Required
- **UI Changes**: Added required indicator (*) to phone field label
- **Validation**: Added client-side validation for phone number (required + format check)
- **Backend Changes**: Made phone field NOT NULL in database schema
- **Uniqueness**: Added unique constraint on (business_id, phone) to prevent duplicate phone numbers per business
- **Error Handling**: Added specific error handling for phone uniqueness violations

### 3. Permissions Backend Integration
- **UI Changes**: Wired permissions checkboxes to real backend data
- **State Management**: Permissions now properly load from worker.permissions on edit mode
- **Backend Integration**: Permissions are saved as JSONB object in database
- **Select All**: Added functional "تحديد الكل" / "إلغاء الكل" toggle button

### 4. Mobile UX Improvements
- **FAB Hiding**: Mobile floating action button (FAB) now hides when modal is open
- **Conditional Rendering**: Added `{!isModalOpen && (...)}` wrapper around FAB

### 5. Backend Repository Updates
- **Worker Interface**: Updated to match new schema (removed is_active, made phone required)
- **CRUD Operations**: All create/update/delete operations updated to work with new schema
- **Error Handling**: Enhanced error handling for phone uniqueness constraints
- **Data Mapping**: Removed status-related computed fields

## API Assumptions

### Database Schema
```sql
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('مدير', 'موظف', 'محاسب', 'أخرى')),
  phone TEXT NOT NULL,
  avatar_url TEXT,
  avatar_color TEXT DEFAULT 'slate',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);
```

### API Endpoints (via Supabase)
- **GET** `/workers` - List workers for business
- **GET** `/workers/:id` - Get worker details
- **POST** `/workers` - Create new worker
- **PATCH** `/workers/:id` - Update worker
- **DELETE** `/workers/:id` - Delete worker

### Worker Data Shape
```typescript
interface Worker {
  id: string
  business_id: string
  name: string
  role: 'مدير' | 'موظف' | 'محاسب' | 'أخرى'
  phone: string // Required, unique per business
  avatar_url: string | null
  avatar_color: string
  permissions: Record<string, boolean> // e.g., {"عرض العملاء": true, "حذف معاملة": false}
  created_at: string
  updated_at: string
  initials?: string // Computed field
}
```

### Permissions Structure
Permissions are stored as a JSONB object where keys are permission names and values are booleans:
```json
{
  "عرض العملاء": true,
  "إضافة معاملة": true,
  "تعديل معاملة": false,
  "حذف معاملة": false,
  "عرض الموردين": true,
  "الوصول للدفتر الكامل": false
}
```

## How to Test Manually

### 1. Test Worker Creation
1. Navigate to Workers page (`/dashboard/workers`)
2. Click "إضافة عامل" button (desktop) or FAB (mobile)
3. Fill in required fields:
   - Name: "أحمد محمد"
   - Phone: "0912345678" (required)
   - Role: Select any role
   - Permissions: Check some permissions
4. Click "إضافة العامل"
5. Verify worker appears in list
6. Verify FAB is hidden when modal is open (mobile)

### 2. Test Phone Validation
1. Try to create worker without phone → Should show "رقم الهاتف مطلوب"
2. Try invalid phone format → Should show "رقم الهاتف غير صحيح"
3. Try duplicate phone for same business → Should show "رقم الهاتف مستخدم بالفعل"

### 3. Test Worker Editing
1. Click "عرض / تعديل" on any worker card
2. Verify permissions are pre-checked based on saved data
3. Modify name, phone, role, or permissions
4. Click "حفظ التعديلات"
5. Verify changes are reflected in worker list

### 4. Test Permissions
1. Open worker in edit mode
2. Check/uncheck various permissions
3. Use "تحديد الكل" / "إلغاء الكل" button
4. Save and verify permissions are persisted

### 5. Test Worker Deletion
1. Open worker in edit mode
2. Click "حذف العامل"
3. Confirm deletion in modal
4. Verify worker is removed from list

### 6. Test Mobile UX
1. Open page on mobile device/viewport
2. Verify FAB is visible
3. Open modal → Verify FAB disappears
4. Close modal → Verify FAB reappears

### 7. Test Backend Integration
1. Set `NEXT_PUBLIC_USE_BACKEND=true`
2. Ensure Supabase is configured
3. Run migration: `supabase db reset`
4. Test all CRUD operations
5. Verify data persists in database

### 8. Test Demo Mode
1. Set `NEXT_PUBLIC_USE_BACKEND=false`
2. Verify demo data loads
3. Verify all UI interactions work (without persistence)

## Notes

- **Auth Integration**: Workers are designed to log in via phone OTP (future feature)
- **Business Scoping**: All workers are scoped to their business via RLS policies
- **Permissions**: Currently UI-only, ready for backend authorization implementation
- **Phone Uniqueness**: Enforced per business, not globally
- **Status Removal**: Workers are now considered "active" by default (no enable/disable)