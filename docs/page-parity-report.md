# Page Parity Report: Customers & Suppliers vs Debts & Workers

**Generated:** 2025-01-14  
**Purpose:** Identify improvements in Debts+Workers pages that need to be applied to Customers+Suppliers pages

---

## A) Scope & Pages

### Source Pages (Gold Standard - Improved)
- `app/dashboard/debts/page.tsx` - Debts Ledger Page
- `app/dashboard/workers/page.tsx` - Workers Page

### Target Pages (Needs Parity)
- `app/dashboard/customers/page.tsx` - Customers Page
- `app/dashboard/suppliers/page.tsx` - Suppliers Page

---

## B) Improvement Inventory (From Source Pages)

### 1. **Shared Hooks Usage**

#### 1.1 usePageLoading Hook
- **Location:** `hooks/usePageLoading.ts`
- **Used in:** `app/dashboard/debts/page.tsx`, `app/dashboard/workers/page.tsx`
- **Description:** Combines local `isLoading` state with global `useLoading()` context into single `showLoading` boolean
- **Pattern:** `const showLoading = usePageLoading(isLoading);`
- **Benefit:** Eliminates duplicate `isLoading || globalLoading` pattern

#### 1.2 useEmptyState Hook
- **Location:** `hooks/useEmptyState.ts`
- **Used in:** `app/dashboard/debts/page.tsx`, `app/dashboard/workers/page.tsx`
- **Description:** Determines empty state type ("empty", "noResults", or null) based on total items, filtered items, and active filters
- **Pattern:**
  ```typescript
  const { emptyKind } = useEmptyState({
    totalItems: items.length,
    filteredItems: filtered.length,
    hasActiveFilters: searchQuery.trim().length > 0,
  });
  ```
- **Benefit:** Eliminates manual empty state calculation logic

#### 1.3 useDebounce Hook
- **Location:** `hooks/useDebounce.ts`
- **Used in:** `app/dashboard/debts/page.tsx` (200ms), `app/dashboard/workers/page.tsx` (300ms)
- **Description:** Debounces search input to prevent excessive re-renders and API calls
- **Pattern:** `const debouncedSearch = useDebounce(searchQuery, 200);`
- **Benefit:** Smoother search experience, reduced API calls

#### 1.4 useLoadMorePagination Hook
- **Location:** `hooks/useLoadMorePagination.ts`
- **Used in:** `app/dashboard/debts/page.tsx`
- **Description:** Manages "Load More" pagination with responsive page sizes (mobile: 15, desktop: 20), max load clicks (4), loading states
- **Pattern:**
  ```typescript
  const {
    visibleCount,
    isLoadingMore,
    hasMoreItems,
    reachedMaxLoads,
    handleLoadMore,
  } = useLoadMorePagination(filtered.length);
  ```
- **Benefit:** Consistent pagination behavior, performance optimization

### 2. **Formatting Utilities**

#### 2.1 formatCurrencySDG
- **Location:** `lib/format.ts`
- **Used in:** `app/dashboard/debts/page.tsx`, `app/dashboard/workers/page.tsx` (imported but not used yet)
- **Description:** Formats currency amounts consistently: `"1,234 SDG"`
- **Pattern:** `formatCurrencySDG(amount)` → `"1,234 SDG"`
- **Benefit:** Consistent currency formatting across app

#### 2.2 formatDateLabel
- **Location:** `lib/format.ts`
- **Used in:** `app/dashboard/debts/page.tsx`
- **Description:** Formats dates with contextual labels (Today, Yesterday, or date)
- **Pattern:** `formatDateLabel("2025-01-14")` → `"اليوم - 2025-01-14"`
- **Benefit:** User-friendly date display

### 3. **CollapsibleHeader Component**

#### 3.1 Mobile-Optimized Header
- **Location:** `components/common/CollapsibleHeader.tsx`
- **Used in:** `app/dashboard/debts/page.tsx`, `app/dashboard/workers/page.tsx`
- **Description:** Scroll-linked collapsible header for mobile with:
  - Smooth collapse animation on scroll (60-120px range)
  - Search button transitions from bottom to compact top state
  - Desktop: no changes (static header)
  - Mobile: dynamic header that shrinks/expands based on scroll position
  - Uses `scrollContainerRef` for custom scroll containers
- **Props:**
  - `title`, `badge`, `searchValue`, `onSearchChange`, `searchPlaceholder`
  - `onMenuClick`, `isLoading`, `scrollContainerRef`
- **Benefit:** Better mobile UX, more screen space when scrolling

### 4. **Data Fetching & Backend Integration**

#### 4.1 Error Handling Pattern
- **Workers Page:** Displays error banner with retry button
  ```typescript
  {error && (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-shake">
      <span className="material-symbols-outlined text-red-500">error</span>
      <div>
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={loadWorkers} className="text-red-600 text-sm hover:text-red-700 underline mt-1">
          إعادة المحاولة
        </button>
      </div>
    </div>
  )}
  ```
- **Benefit:** Better error UX with recovery option

#### 4.2 Optimistic Updates Pattern
- **Debts Page:** Implements optimistic updates for create/edit/delete operations
  - Add transaction: Shows immediately with temp ID, replaces with real ID after API success
  - Edit transaction: Updates UI immediately, reverts on error
  - Visual feedback: New items highlighted with `border-primary ring-2 ring-primary/30 animate-pulse`
  - Auto-removes highlight after 3 seconds
- **Benefit:** Instant feedback, better perceived performance

#### 4.3 Batch Request Optimization
- **Workers Page:** Prefetches all avatar URLs in single batch request
  ```typescript
  const prefetchAvatarUrls = useCallback(async (workersList: Worker[]) => {
    const workersWithAvatars = workersList.filter(w => w.avatar_url);
    if (workersWithAvatars.length === 0) return;
    const paths = workersWithAvatars.map(w => w.avatar_url!);
    const { signedUrls } = await getSignedUrlsBatch('avatars', paths);
    // Map URLs by worker ID
    const urlMap: Record<string, string> = {};
    workersWithAvatars.forEach(worker => {
      const url = signedUrls[worker.avatar_url!];
      if (url) urlMap[worker.id] = url;
    });
    setAvatarUrls(urlMap);
  }, []);
  ```
- **Benefit:** Reduces API calls from N to 1, faster page load

### 5. **Performance Optimizations**

#### 5.1 React.memo for Components
- **Workers Page:** Memoized `WorkerCard` and `WorkerAvatar` components
  ```typescript
  const WorkerCard = React.memo(({ worker, index, avatarConfig, onEdit, prefetchedAvatarUrl }) => (
    // Component JSX
  ));
  WorkerCard.displayName = 'WorkerCard';
  ```
- **Benefit:** Prevents unnecessary re-renders

#### 5.2 useCallback for Handlers
- **Debts Page:** Memoized `handleRowClick` to prevent re-renders
- **Workers Page:** Memoized `loadWorkers`, `prefetchAvatarUrls`, `getAvatarConfig`
- **Benefit:** Stable function references, better performance

#### 5.3 useMemo for Calculations
- **Debts Page:** Memoized `filtered`, `totals`, `todayBalance`, `grouped`, `sortedDates`
- **Workers Page:** Memoized `filteredWorkers`
- **Benefit:** Avoids expensive recalculations

### 6. **Loading States**

#### 6.1 Skeleton Components
- **Debts Page:** Uses `LedgerRowSkeleton` for transaction rows
- **Workers Page:** Uses `WorkerCardSkeleton` for worker cards
- **Pattern:** Shows 6 skeleton items during loading
- **Benefit:** Better perceived performance, no layout shift

#### 6.2 Inline Loading Indicators
- **Debts Page:** "Load More" button shows inline spinner during pagination
  ```typescript
  {isLoadingMore ? (
    <div className="flex items-center gap-2 text-text-muted">
      <span className="material-symbols-outlined animate-spin">progress_activity</span>
      <span className="text-sm font-bold">جاري التحميل...</span>
    </div>
  ) : ...}
  ```
- **Benefit:** Clear loading feedback without blocking UI

### 7. **Responsive Layout**

#### 7.1 Scroll Container Ref
- **Both Pages:** Use `mainRef` for scroll container reference
  ```typescript
  const mainRef = useRef<HTMLElement>(null);
  <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
  ```
- **Passed to:** `CollapsibleHeader` component for scroll detection
- **Benefit:** Proper scroll detection for collapsible header

#### 7.2 Mobile FAB Conditional Rendering
- **Debts Page:** Hides FAB when modal is open
  ```typescript
  {!showTransactionDetails && modalMode === null && (
    <button onClick={() => openModal("in")} className="md:hidden fixed bottom-6 left-6 ...">
  )}
  ```
- **Workers Page:** Hides FAB when modal is open
  ```typescript
  {!isModalOpen && (
    <button onClick={openAddModal} className="md:hidden fixed bottom-6 left-6 ...">
  )}
  ```
- **Benefit:** Prevents FAB overlap with modals

### 8. **Animation & Transitions**

#### 8.1 Staggered Card Animations
- **Workers Page:** Cards animate in with staggered delay
  ```typescript
  style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
  className="... animate-fadeInUp"
  ```
- **Benefit:** Polished, professional feel

#### 8.2 Highlight New Items
- **Debts Page:** New transactions highlighted temporarily
  ```typescript
  className={`... ${
    t.id === newTransactionId 
      ? 'border-primary ring-2 ring-primary/30 animate-pulse' 
      : 'border-slate-100'
  }`}
  ```
- **Benefit:** Clear visual feedback for user actions

### 9. **Import Organization**

#### 9.1 React Imports First
- **Pattern:** `import React, { ... } from "react";` at top
- **Benefit:** Consistent, clean import order

#### 9.2 Grouped Imports
- **Pattern:**
  1. React imports
  2. Component imports (layout, dashboard, common)
  3. Hook imports (context, custom hooks)
  4. Utility imports (repo, storage, format)
  5. Type imports
- **Benefit:** Easy to scan, maintainable

---

## C) Parity Gaps (Target Pages: Customers + Suppliers)

### ❌ **MISSING in Customers & Suppliers**

1. **usePageLoading Hook**
   - Current: Manual `showLoading = isLoading || globalLoading`
   - Files: `app/dashboard/customers/page.tsx:36`, `app/dashboard/suppliers/page.tsx:36`
   - Should be: `const showLoading = usePageLoading(isLoading);`

2. **useEmptyState Hook**
   - Current: Manual calculation `emptyKind = totalCustomers === 0 ? "empty" : ...`
   - Files: `app/dashboard/customers/page.tsx:93-94`, `app/dashboard/suppliers/page.tsx:100-101`
   - Should be: Use `useEmptyState` hook

3. **useDebounce Hook**
   - Current: Search triggers immediate re-fetch on every keystroke
   - Files: Both pages missing debounce
   - Should be: `const debouncedSearch = useDebounce(searchQuery, 300);`

4. **formatCurrencySDG Utility**
   - Current: Inline formatting `{totalDebt.toLocaleString("en-US")} {" "} <span>ج.س</span>`
   - Files: Multiple locations in both pages
   - Should be: `{formatCurrencySDG(totalDebt)}`

5. **CollapsibleHeader Component**
   - Current: Custom header with inline search bar
   - Files: `app/dashboard/customers/page.tsx:99-127`, `app/dashboard/suppliers/page.tsx:106-134`
   - Should be: Use `<CollapsibleHeader />` component

6. **Error Handling UI**
   - Current: Only toast notifications, no error banner
   - Files: Both pages missing error display
   - Should be: Add error state + retry button banner

7. **Scroll Container Ref**
   - Current: No ref on main element
   - Files: Both pages missing `mainRef`
   - Should be: `const mainRef = useRef<HTMLElement>(null);` + `<main ref={mainRef}>`

8. **React.memo Optimization**
   - Current: Card components not memoized
   - Files: Inline card rendering in both pages
   - Should be: Extract and memoize card components

9. **useCallback for Handlers**
   - Current: Inline functions recreated on every render
   - Files: Multiple handlers in both pages
   - Should be: Wrap in `useCallback`

10. **useMemo for Calculations**
    - Current: `filteredCustomers`/`filteredSuppliers` recalculated on every render
    - Files: Both pages
    - Should be: Wrap in `useMemo`

11. **Optimistic Updates**
    - Current: Wait for API response before updating UI
    - Files: Entity creation in both pages
    - Should be: Implement optimistic updates pattern

12. **Import Organization**
    - Current: React imported from "react" (not first), imports not grouped
    - Files: Both pages
    - Should be: `import React, { ... }` first, then grouped imports

13. **FAB Conditional Rendering**
    - Current: FAB always visible
    - Files: Both pages
    - Should be: Hide when modal is open

### ⚠️ **PARTIALLY PRESENT in Customers & Suppliers**

1. **Loading States**
   - ✅ Has: Skeleton components during initial load
   - ❌ Missing: Inline loading indicators for actions
   - Files: Both pages have skeletons but no action loading states

2. **Empty States**
   - ✅ Has: EmptyState component usage
   - ⚠️ Different: Customers has `actionLabel` + `onAction` props, Suppliers doesn't
   - Files: `app/dashboard/customers/page.tsx:172-176`, `app/dashboard/suppliers/page.tsx:179-182`

3. **Backend Integration**
   - ✅ Has: API calls with error handling
   - ❌ Missing: Batch request optimization, optimistic updates
   - Files: Both pages

4. **Search Filtering**
   - ✅ Has: Client-side filtering logic
   - ❌ Missing: Debounce, server-side search integration
   - Files: Both pages filter locally without debounce

### ✅ **ALREADY PRESENT in Customers & Suppliers**

1. **FilterBar Components**
   - Present: `FilterBar`, `FilterSegmented`, `FilterSelect`
   - Files: Both pages use these components
   - Note: Debts/Workers pages don't have these (different UI pattern)

2. **Summary Cards**
   - Present: Total debt summary cards
   - Files: Both pages have summary section
   - Note: Debts/Workers pages don't have these (different data model)

3. **Mobile Drawer & Profile**
   - Present: `MobileDrawer`, `MobileProfileSlideOver`
   - Files: Both pages
   - Note: Debts/Workers use simpler drawer without profile

4. **Entity Modal**
   - Present: `EntityFormModal` for create
   - Files: Both pages
   - Note: Different from Workers' `WorkerDetailsModal` pattern

5. **Footer**
   - Present: Identical footer component
   - Files: All 4 pages have same footer

6. **Mobile FAB**
   - Present: Floating action button for mobile
   - Files: All 4 pages

### 🐛 **BUGS/ISSUES in Customers & Suppliers**

1. **Suppliers Page - Duplicate useEffect**
   - Location: `app/dashboard/suppliers/page.tsx:82-86`
   - Issue: Empty useEffect that sets loading state on mount (redundant)
   - Fix: Remove duplicate useEffect

2. **Search Triggers Full Re-fetch**
   - Location: Both pages, useEffect dependency on `searchQuery`
   - Issue: Every keystroke triggers API call
   - Fix: Use debounced search + separate search trigger

3. **Status Tab Filter Not Applied**
   - Location: Both pages have `statusTab` state but don't filter by it
   - Issue: Filter UI exists but doesn't work
   - Fix: Apply status filter to `filteredCustomers`/`filteredSuppliers`

4. **Sort By Filter Not Applied**
   - Location: Both pages have `sortBy` state but don't sort
   - Issue: Sort UI exists but doesn't work
   - Fix: Apply sorting logic

5. **Last Activity Fetched Sequentially**
   - Location: Both pages use `Promise.all` but still N+1 queries
   - Issue: Could be optimized with batch endpoint
   - Fix: Create batch endpoint or cache results

---

## D) Recommended Shared Refactors

### 1. **Shared Entity List Page Component**
- **Proposed Path:** `components/dashboard/EntityListPage.tsx`
- **What Moves:**
  - Common page structure (sidebar, drawer, header, content, footer)
  - Loading states, empty states, error states
  - Search, filter, pagination logic
  - Card grid layout
- **Props:** `entityType: "customer" | "supplier"`, config object for labels/API functions
- **Risk Level:** 🟡 **MEDIUM**
  - Reason: Customers/Suppliers are 99% identical, but need to ensure all edge cases covered
  - Mitigation: Start with one page, test thoroughly, then apply to second

### 2. **Shared Entity Card Component**
- **Proposed Path:** `components/dashboard/EntityCard.tsx`
- **What Moves:**
  - Card layout (status badge, avatar, name, phone, amount, actions)
  - Status config logic (debt/clear/credit colors)
  - Hover effects, transitions
- **Props:** `entity`, `entityType`, `onNavigate`
- **Risk Level:** 🟢 **LOW**
  - Reason: Card structure is identical between customers/suppliers
  - Mitigation: Use render props for any differences

### 3. **Shared Search Filter Logic Hook**
- **Proposed Path:** `hooks/useEntitySearch.ts`
- **What Moves:**
  - Search query state
  - Debounced search
  - Filter logic (name, phone digits matching)
  - Status filter, sort logic
- **Returns:** `{ searchQuery, setSearchQuery, filteredEntities, activeFilters }`
- **Risk Level:** 🟢 **LOW**
  - Reason: Pure logic, no UI dependencies
  - Mitigation: Well-tested hook pattern

### 4. **Shared Status Config Utility**
- **Proposed Path:** `lib/entity-status-config.ts`
- **What Moves:**
  - Status config object (debt/clear/credit colors, labels)
  - Helper function: `getStatusConfig(status: EntityStatus)`
- **Risk Level:** 🟢 **LOW**
  - Reason: Pure data, no side effects
  - Mitigation: Simple utility function

### 5. **Shared Last Activity Formatter**
- **Proposed Path:** `lib/format.ts` (add to existing)
- **What Moves:**
  - Last activity formatting logic
  - Function: `formatLastActivity(date: string): string`
- **Risk Level:** 🟢 **LOW**
  - Reason: Pure formatting function
  - Mitigation: Add to existing format utilities

---

## E) Implementation Plan (Future Step)

### Phase 1: Low-Risk Improvements (No Refactoring)
1. ✅ Add `usePageLoading` hook to both pages
2. ✅ Add `useEmptyState` hook to both pages
3. ✅ Add `useDebounce` hook to both pages
4. ✅ Replace inline currency formatting with `formatCurrencySDG`
5. ✅ Add `React` to imports, organize import order
6. ✅ Add `mainRef` to main element
7. ✅ Fix FAB conditional rendering (hide when modal open)
8. ✅ Remove duplicate useEffect from Suppliers page
9. ✅ Add error state + error banner UI
10. ✅ Wrap filtered calculations in `useMemo`

### Phase 2: Medium-Risk Improvements (Component Replacement)
11. ⚠️ Replace custom header with `CollapsibleHeader` component
    - Test mobile scroll behavior
    - Ensure search integration works
    - Verify badge updates correctly
12. ⚠️ Add `useCallback` to event handlers
    - Wrap modal handlers, filter handlers
    - Verify no behavior changes
13. ⚠️ Memoize card components with `React.memo`
    - Extract card to separate component
    - Test re-render behavior

### Phase 3: Advanced Improvements (Logic Changes)
14. 🔴 Implement optimistic updates for entity creation
    - Add temp ID pattern
    - Add highlight animation
    - Add error rollback
15. 🔴 Fix status tab filter (apply to filtered results)
16. 🔴 Fix sort by filter (apply sorting logic)
17. 🔴 Optimize last activity fetching (batch or cache)

### Phase 4: Refactoring (Optional, High Risk)
18. 🔴 Extract shared entity card component
19. 🔴 Extract shared search/filter hook
20. 🔴 Consider full page component extraction (if patterns stabilize)

---

## Summary Statistics

### Improvements in Source Pages
- **Shared Hooks:** 4 (usePageLoading, useEmptyState, useDebounce, useLoadMorePagination)
- **Formatting Utilities:** 2 (formatCurrencySDG, formatDateLabel)
- **Shared Components:** 1 (CollapsibleHeader)
- **Performance Optimizations:** 3 (React.memo, useCallback, useMemo)
- **UX Improvements:** 5 (error banner, optimistic updates, batch requests, staggered animations, highlight feedback)

### Gaps in Target Pages
- **Missing:** 13 improvements
- **Partially Present:** 4 improvements
- **Already Present:** 6 features (different patterns)
- **Bugs to Fix:** 5 issues

### Recommended Refactors
- **Total:** 5 shared modules/components
- **Low Risk:** 3 refactors
- **Medium Risk:** 2 refactors

### Implementation Phases
- **Phase 1 (Low Risk):** 10 tasks - Safe to implement immediately
- **Phase 2 (Medium Risk):** 3 tasks - Requires testing
- **Phase 3 (Advanced):** 4 tasks - Requires careful implementation
- **Phase 4 (Refactoring):** 3 tasks - Optional, high risk

---

**Next Steps:** Await approval before implementing any changes.
