# Sidebar & Topbar Components - Share Guide

## Files to Copy (Full Files)

### 1. Desktop Sidebar
```
components/layout/DashboardSidebar.tsx
```

### 2. Mobile Drawer (Sidebar)
```
components/layout/MobileDrawer.tsx
```

### 3. Tailwind Config
```
tailwind.config.ts
```

### 4. Global CSS
```
app/globals.css
```

---

## Topbar Example (Copy from any page)

The topbar/header is inline in each page. Here's the pattern from `app/ledger/page.tsx`:

```tsx
<header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 py-3 md:py-5">
  <div className="max-w-6xl mx-auto flex flex-col gap-3 md:gap-6">
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button onClick={() => setIsDrawerOpen(true)} className="md:hidden size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center">
          <span className="material-symbols-outlined">menu</span>
        </button>
        {/* Page title */}
        <h2 className="text-xl md:text-2xl font-bold text-text-main">الدفتر</h2>
        {/* Badge */}
        <div className="bg-primary-soft text-primary px-2 md:px-3 py-1 rounded-full text-xs font-bold border border-primary/10">
          {count} معاملة
        </div>
      </div>
      {/* Mobile more button */}
      <button className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600">
        <span className="material-symbols-outlined text-lg">more_vert</span>
      </button>
    </div>
    
    {/* Search and Action Buttons Row */}
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Search */}
      <div className="relative flex-1 md:max-w-96">
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
          <span className="material-symbols-outlined text-lg">search</span>
        </span>
        <input
          className="w-full bg-slate-50 border border-slate-100 rounded-full py-2 md:py-2.5 pr-10 pl-3 md:pr-11 md:pl-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all placeholder:text-text-muted"
          placeholder="بحث..."
          type="text"
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 md:gap-3">
        <button className="bg-primary text-white px-3 md:px-6 py-2 md:py-2.5 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 md:gap-2 hover:bg-green-600 transition-all shadow-md shadow-primary/20 flex-1 md:flex-none justify-center">
          <span className="material-symbols-outlined text-base md:text-[20px]">add_circle</span>
          <span>إضافة</span>
        </button>
      </div>
    </div>
  </div>
</header>
```

---

## Page Layout Structure

```tsx
<div className="flex h-screen">
  {/* Desktop Sidebar */}
  <DashboardSidebar activePage="customers" />

  {/* Main Content */}
  <main className="flex-1 flex flex-col overflow-y-auto overscroll-contain touch-pan-y">
    {/* Header/Topbar */}
    <header>...</header>
    
    {/* Page Content */}
    <div className="p-3 md:p-8 max-w-6xl mx-auto w-full">
      ...
    </div>
  </main>

  {/* Mobile Drawer */}
  <MobileDrawer
    open={isDrawerOpen}
    onCloseAction={() => setIsDrawerOpen(false)}
    onOpenProfileAction={() => {}}
    activePage="customers"
  />
</div>
```

---

## Required Dependencies

### NPM Packages
- `next` (Next.js)
- `tailwindcss`
- `@next/font` (for Cairo font)

### Google Material Symbols (add to `app/layout.tsx`)
```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
/>
```

### Cairo Font (Arabic)
```html
<link
  href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

---

## Custom Colors Used

| Color | Value | Usage |
|-------|-------|-------|
| `primary` | `#22c55e` | Main green color |
| `primary-soft` | `#f0fdf4` | Light green background |
| `text-main` | `#1e293b` | Main text color |
| `text-muted` | `#64748b` | Secondary text |

---

## Active Page Values

For `DashboardSidebar` and `MobileDrawer`:
- `"customers"` - العملاء
- `"suppliers"` - الموردون  
- `"debts"` - دفتر الديون
- `"workers"` - العمال
- `"settings"` - الإعدادات
