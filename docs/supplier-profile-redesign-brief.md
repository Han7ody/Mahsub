# Supplier Profile Page - Redesign Brief

## Page Overview
This is a supplier detail/profile page in an Arabic RTL accounting app. It displays a supplier's financial information, transaction history, and provides actions to record new transactions (debit/credit).

## Current File Structure
- **Main Component:** `components/dashboard/SupplierProfileView.tsx`
- **Language:** Arabic (RTL - Right to Left)
- **Framework:** Next.js with React, TypeScript, Tailwind CSS

### Props Interface
```typescript
interface Props {
  supplier: DashboardSupplier;
  // { 
  //   id: number,
  //   name: string,
  //   phone: string,
  //   initials: string,
  //   status: 'debt' | 'clear' | 'credit',
  //   amount: number,
  //   lastActivity: string
  // }
  
  transactions: TransactionItem[];
  // {
  //   id: string,
  //   title: string,
  //   type: 'debit' | 'credit',
  //   amount: number,
  //   date: string // Format: YYYY-MM-DD
  // }
  
  businessId: string;
}
```

---

## Key State Variables (DO NOT REMOVE)

### 1. Search & Filtering
- `searchQuery: string` - User's search input for filtering transactions
- `filteredTransactions: TransactionItem[]` - Computed result after filtering
- `emptyKind: 'empty' | 'search' | null` - Tracks why list is empty

### 2. Modal States
- `isDrawerOpen: boolean` - Mobile sidebar drawer state
- `showTransactionModal: boolean` - Add new transaction modal visibility
- `transactionType: 'debit' | 'credit'` - Current transaction type for modal
- `showDetailsModal: boolean` - Transaction details view modal
- `selectedTransaction: Transaction | null` - Currently viewed transaction

### 3. Edit Mode States
- `isEditMode: boolean` - Profile edit mode toggle
- `editName: string` - Temporary name during edit
- `editPhone: string` - Temporary phone during edit
- `editImagePreview: string | null` - Preview of new profile image (data URL)
- `editFormError: string` - Validation error messages

### 4. Loading States
- `isLoading: boolean` - Initial page load
- `isSavingEdit: boolean` - Profile save in progress
- `isSubmittingTransaction: boolean` - Transaction submission in progress

---

## Core Business Logic (MUST PRESERVE)

### 1. Net Balance Calculation
**Location:** `useMemo(() => { ... }, [supplier, transactions])`

```javascript
const netBalance = useMemo(() => {
  const openingBalance = Number((supplier as any).opening_balance ?? supplier.amount ?? 0);
  const direction = (supplier as any).opening_balance_direction === "out" ? -1 : 1;
  const openingSigned = openingBalance * direction;
  
  const transactionsDelta = transactions.reduce((sum, t) => {
    return sum + (t.type === "credit" ? t.amount : -t.amount);
  }, 0);
  
  return Math.abs(openingSigned + transactionsDelta);
}, [supplier, transactions]);
```

**Critical:** This calculates the current balance based on:
- Opening balance with direction (in/out)
- Sum of all credits (money received)
- Minus sum of all debits (money given)

### 2. Transaction Filtering Logic
**Location:** `filterTransactions(items: TransactionItem[], query: string)`

**Supports:**
- Date range search: `"2023-10-01 2023-10-31"` or `"2023/10/01 - 2023/10/31"`
- Single date search: `"2023-10-15"`
- Title text search: Any text
- Case-insensitive Arabic text

**Algorithm:**
1. Parse query for date patterns
2. If date range found → filter by date range
3. If no date range → filter by title contains query
4. Return filtered results

### 3. Date Grouping Logic
**Location:** `groupByDate(transactions: TransactionItem[])`

```javascript
const groups: Record<string, TransactionItem[]> = {};
for (const tx of transactions) {
  const date = tx.date; // YYYY-MM-DD
  if (!groups[date]) groups[date] = [];
  groups[date].push(tx);
}
return groups;
```

**Purpose:** Groups transactions by date for better visual organization.

### 4. Profile Edit Flow
**Handler:** `handleSaveEditProfile()`

**Steps:**
1. Validate name is not empty
2. Validate phone (must be 10 digits or empty)
3. Call API: `updateSupplier(String(supplier.id), { name, phone, profileImage })`
4. On success: update local state, exit edit mode, show success toast
5. On error: show error toast

**Image Upload:**
- User selects image → `FileReader.readAsDataURL()`
- Converts to base64 data URL → stores in `editImagePreview`
- Sent to backend on save → backend uploads to Supabase Storage

### 5. Transaction Creation Flow
**Handler:** `handleTransactionSubmit(data: TransactionFormData)`

**Steps:**
1. Extract: title, amount, date, receipt file
2. Call API: `createTransaction({ ... })`
3. On success:
   - Add new transaction to local state (prepend to array)
   - Re-filter transactions
   - Close modal
   - Show success toast
4. On error: show error toast

---

## Required Components (DO NOT REMOVE)

### Imported Components
```typescript
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import TransactionDetailsModal from "@/components/dashboard/TransactionDetailsModal";
import TransactionFormModal from "@/components/dashboard/TransactionFormModal";
import EmptyState from "@/components/dashboard/EmptyState";
import ProfileTransactionRowSkeleton from "@/components/skeletons/ProfileTransactionRowSkeleton";
import { SummaryCardSkeleton } from "@/components/skeletons/SummaryCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
```

### Component Usage Rules
- `DashboardSidebar` - Always present, activePage="suppliers"
- `MobileDrawer` - Controlled by `isDrawerOpen` state
- `TransactionFormModal` - Controlled by `showTransactionModal`, receives `transactionType`
- `TransactionDetailsModal` - Controlled by `showDetailsModal`, receives `selectedTransaction`
- `EmptyState` - Shown when `emptyKind` is not null
- Skeletons - Shown when `isLoading === true`

---

## Required Functions (PRESERVE LOGIC)

### 1. Date Parsing & Formatting
```typescript
// Parses YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
function parseDate(s: string): Date | null

// Converts "2023-10-15" → "١٥ أكتوبر ٢٠٢٣" (Arabic)
function formatDateLabel(dateStr: string): string
```

### 2. Search & Filter Functions
```typescript
// Main filter logic - supports date range and text search
function filterTransactions(items: TransactionItem[], query: string): TransactionItem[]

// Groups by date key (YYYY-MM-DD)
function groupByDate(transactions: TransactionItem[]): Record<string, TransactionItem[]>
```

### 3. Modal Handlers
```typescript
// Opens transaction form with specific type
function openModal(type: 'debit' | 'credit'): void

// Closes transaction modal and resets state
function handleCloseTransactionModal(): void

// Submits new transaction to backend
async function handleTransactionSubmit(data: TransactionFormData): Promise<void>

// Opens transaction details modal
function handleTransactionClick(transaction: Transaction): void
```

### 4. Edit Handlers
```typescript
// Toggles edit mode on/off
function handleEditToggle(): void

// Handles image file selection and preview
function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>): void

// Saves profile changes to backend
async function handleSaveEditProfile(): Promise<void>
```

### 5. Navigation Handlers
```typescript
// Opens profile settings (if exists)
function handleOpenProfile(): void

// Closes mobile drawer
function handleCloseDrawer(): void
```

---

## Data Flow (CRITICAL TO MAINTAIN)

### Initial Page Load
```
Props (supplier + transactions) 
  → Component renders
  → Calculate netBalance
  → Filter transactions (if searchQuery exists)
  → Group by date
  → Render UI
```

### Search Flow
```
User types in search
  → searchQuery state updates
  → filterTransactions(transactions, searchQuery)
  → filteredTransactions updates
  → groupByDate(filteredTransactions)
  → Re-render transaction list
```

### Edit Profile Flow
```
Click edit button
  → isEditMode = true
  → Show edit form
  → User edits (name/phone/image)
  → Click save
  → Validate inputs
  → updateSupplier API call
  → Update local supplier state
  → isEditMode = false
  → Show success toast
```

### New Transaction Flow
```
Click "أعطيته" or "قبضت"
  → openModal('debit' or 'credit')
  → showTransactionModal = true
  → User fills form
  → Click submit
  → createTransaction API call
  → Prepend to transactions array
  → Re-filter transactions
  → Close modal
  → Show success toast
```

---

## UI Sections (Current Structure)

### 1. Top Bar (Header)
**Elements:**
- Mobile menu button (hamburger icon)
- Title: "ملف المورد"
- Status badge (عليه دين / خالص / له رصيد)
- Search input with icon
- Edit profile button

**Current Classes:** `sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b`

### 2. Profile Info Section
**Elements:**
- Avatar image (or initials fallback)
- Supplier name (editable in edit mode)
- Phone number (editable in edit mode)
- Save/Cancel buttons (shown in edit mode only)
- Edit button (shown when not in edit mode)

**Edit Mode Features:**
- File upload for avatar
- Text input for name
- Tel input for phone (10 digits validation)
- Error message display

### 3. Balance Card (PRIMARY REDESIGN TARGET)
**Current Data Displayed:**
- Net balance amount (calculated from opening balance + transactions)
- Currency label: "ج.س" (Sudanese Pound)
- Label: "صافي الرصيد المستحق"
- Last activity timestamp
- Wallet icon

**Current Styling:**
- Gradient background (primary color)
- Glassmorphism effects
- White text
- Rounded corners

### 4. Action Buttons (PRIMARY REDESIGN TARGET)
**Three Buttons:**

1. **أعطيته (دين جديد)** - "I gave them (new debt)"
   - Color: Red gradient
   - Icon: upload arrow
   - Action: Opens modal with type="debit"

2. **قبضت (استلام مبلغ)** - "I received (payment)"
   - Color: Green gradient
   - Icon: download arrow
   - Action: Opens modal with type="credit"

3. **إرسال إشعار بالواتساب** - "Send WhatsApp notification"
   - Color: Light green
   - Icon: WhatsApp logo
   - Action: Placeholder (no functionality yet)

**Current Layout:** 3-column grid on desktop, stacked on mobile

### 5. Transaction History Section
**Structure:**
- Grouped by date (newest first)
- Each date group has:
  - Date header (Arabic formatted)
  - List of transactions for that date

**Each Transaction Row Shows:**
- Transaction title
- Amount with currency
- Type badge (دين / دفع)
- Date badge
- Click to view details

**States:**
- Loading: Shows `ProfileTransactionRowSkeleton` components
- Empty: Shows `EmptyState` component
- Search no results: Shows `EmptyState` with search message

---

## Styling Requirements

### Theme Variables
```css
--primary: /* Teal/green primary color */
--text-main: /* Main text color */
--text-muted: /* Muted/secondary text color */
```

### Color Scheme
- **Primary actions:** Teal/green (`bg-primary`)
- **Debit/debt:** Red shades (`bg-red-500`, `text-red-600`)
- **Credit/payment:** Green shades (`bg-green-500`, `text-green-600`)
- **Neutral/clear:** Gray/slate (`bg-slate-50`, `text-slate-600`)

### Typography
- **Icons:** Material Symbols Outlined font
- **Arabic text:** System font stack with Arabic support
- **Numbers:** English numerals for consistency

### Responsive Breakpoints
- **Mobile:** < 768px (md breakpoint)
- **Desktop:** ≥ 768px
- **Large desktop:** ≥ 1024px (lg breakpoint)

### RTL Specific
- All layouts use RTL direction
- Text alignment: right for Arabic
- Icons positioned on right side
- Margins/padding reversed (mr instead of ml)

---

## What Can Be Redesigned ✅

### Visual Design
- ✅ Colors, gradients, shadows
- ✅ Card layouts and spacing
- ✅ Typography sizes, weights, and hierarchy
- ✅ Button styles, shapes, and sizes
- ✅ Icon styles and sizes
- ✅ Border radius values
- ✅ Background patterns or decorative elements
- ✅ Hover/active states

### Layout Arrangement
- ✅ Balance card layout (horizontal vs vertical)
- ✅ Action buttons positioning (grid, flex, etc.)
- ✅ Transaction list presentation style
- ✅ Profile header layout
- ✅ Spacing between sections
- ✅ Grid columns and breakpoints

### Animation & Transitions
- ✅ Hover effects
- ✅ Loading animations
- ✅ Modal entrance/exit animations
- ✅ Transition durations
- ✅ Transform effects

---

## What MUST NOT Change ❌

### State & Logic
- ❌ State variable names
- ❌ State variable purposes
- ❌ Business logic calculations (netBalance formula)
- ❌ Filter/search algorithms
- ❌ Date parsing/grouping logic
- ❌ Validation rules

### Data Flow
- ❌ API call functions and parameters
- ❌ Data transformation logic
- ❌ Event handler logic
- ❌ Props interface
- ❌ Component lifecycle

### Functionality
- ❌ Modal open/close behavior
- ❌ Form submission flow
- ❌ Error handling logic
- ❌ Toast notifications
- ❌ Navigation behavior

### Components
- ❌ Component imports
- ❌ Modal components usage
- ❌ Skeleton components
- ❌ Empty state component

### Accessibility
- ❌ ARIA labels
- ❌ Button roles
- ❌ Input labels
- ❌ Keyboard navigation
- ❌ RTL direction

---

## Code Patterns to Follow

### Example 1: Redesigning Balance Card (Visual Only)
```tsx
// ✅ CORRECT - Change classes, keep data
<div className="YOUR_NEW_GRADIENT_CLASSES YOUR_NEW_SPACING">
  <p className="YOUR_NEW_TEXT_STYLE">صافي الرصيد المستحق</p>
  <h4 className="YOUR_NEW_FONT_SIZE">{netBalance.toLocaleString("en-US")}</h4>
  <span className="YOUR_NEW_CURRENCY_STYLE">ج.س</span>
</div>

// ❌ WRONG - Don't change the data or calculation
<div>
  <h4>{supplier.amount}</h4> {/* Wrong! Must use netBalance */}
</div>
```

### Example 2: Redesigning Action Buttons (Visual Only)
```tsx
// ✅ CORRECT - Change styles, keep handler and text
<button 
  onClick={() => openModal("debit")} // Keep this
  className="YOUR_NEW_BUTTON_CLASSES"
>
  <span className="YOUR_NEW_ICON_CLASSES">upload</span>
  أعطيته (دين جديد) {/* Keep this text */}
</button>

// ❌ WRONG - Don't change handler or remove text
<button onClick={handleDebit}> {/* Wrong handler! */}
  Give Money {/* Wrong! Must be Arabic */}
</button>
```

### Example 3: Redesigning Transaction List (Visual Only)
```tsx
// ✅ CORRECT - Change layout, keep data mapping
{Object.entries(dateGroups).map(([date, dayTxs]) => (
  <div key={date} className="YOUR_NEW_GROUP_CLASSES">
    <h3 className="YOUR_NEW_HEADER_CLASSES">
      {formatDateLabel(date)} {/* Keep this */}
    </h3>
    {dayTxs.map(tx => (
      <button 
        key={tx.id}
        onClick={() => handleTransactionClick(tx)} // Keep this
        className="YOUR_NEW_ROW_CLASSES"
      >
        <span>{tx.title}</span> {/* Keep this */}
        <span>{tx.amount.toLocaleString("en-US")}</span> {/* Keep this */}
      </button>
    ))}
  </div>
))}

// ❌ WRONG - Don't change data structure or handlers
{transactions.map(tx => ...)} {/* Wrong! Must use dateGroups */}
```

---

## Testing Checklist

After redesign, verify:

### Functionality Tests
- [ ] Net balance displays correctly
- [ ] Search by date range works
- [ ] Search by title works
- [ ] Can add debit transaction
- [ ] Can add credit transaction
- [ ] Can edit supplier name
- [ ] Can edit supplier phone
- [ ] Can upload profile image
- [ ] Transaction details modal opens
- [ ] Mobile drawer opens/closes
- [ ] All toasts appear on actions

### Visual Tests
- [ ] RTL layout correct
- [ ] Arabic text displays correctly
- [ ] Numbers use English numerals
- [ ] Icons positioned correctly
- [ ] Responsive on mobile (< 768px)
- [ ] Responsive on tablet (768px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] Loading skeletons show during load
- [ ] Empty state shows when no transactions
- [ ] Search empty state shows when no results

### Error Tests
- [ ] Phone validation shows error
- [ ] Name required validation works
- [ ] API errors show toast
- [ ] Network errors handled
- [ ] No console errors
- [ ] No TypeScript errors

---

## Success Criteria

Your redesign is successful if:

1. ✅ All transactions display and filter correctly
2. ✅ Search by date range and text works
3. ✅ Can create debit/credit transactions
4. ✅ Can edit supplier profile with image upload
5. ✅ Net balance calculates and displays correctly
6. ✅ All modals open/close properly
7. ✅ Mobile responsive works
8. ✅ No TypeScript compilation errors
9. ✅ No runtime errors in console
10. ✅ Visual design is improved and modern

---

## File References

### Main File to Edit
- `components/dashboard/SupplierProfileView.tsx`

### Related Files (for reference, don't edit)
- `lib/repo/suppliers.ts` - Supplier API functions
- `lib/repo/transactions.ts` - Transaction API functions
- `components/dashboard/TransactionFormModal.tsx` - Add transaction modal
- `components/dashboard/TransactionDetailsModal.tsx` - View transaction modal
- `components/layout/DashboardSidebar.tsx` - Left sidebar
- `components/layout/MobileDrawer.tsx` - Mobile menu

---

## Notes for AI Redesigner

1. **Focus on visual changes only** - Don't refactor logic
2. **Preserve all state management** - Don't rename or remove state variables
3. **Keep Arabic text and RTL** - This is critical for the user base
4. **Test all modals** - Ensure they still open/close correctly
5. **Maintain responsive behavior** - Mobile view must work
6. **Keep accessibility** - Don't remove ARIA labels
7. **Preserve TypeScript types** - Don't use `any` types
8. **Keep error handling** - All try/catch blocks must remain
9. **Maintain data flow** - Props → State → Computed → Render
10. **Test calculations** - Net balance must be accurate

---

**END OF REDESIGN BRIEF**

Copy this document to another AI with the instruction: *"Redesign the visual appearance of the SupplierProfileView component following this brief. Focus on modern UI/UX while preserving all logic, functionality, and data flow."*
