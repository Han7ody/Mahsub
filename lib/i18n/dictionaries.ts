export type Dictionary = typeof ar;

export const ar = {
    // Navigation
    nav_customers: "العملاء",
    nav_suppliers: "الموردون",
    nav_debts: "دفتر الديون",
    nav_workers: "العمال",
    nav_settings: "الإعدادات",
    nav_logout: "تسجيل الخروج",

    // Settings Page
    settings_title: "إعدادات التطبيق",
    general_settings: "الإعدادات العامة",
    language_label: "اللغة (Language)",
    language_desc: "اختر لغة واجهة التطبيق المفضلة",
    default_currency: "العملة الافتراضية",
    date_format: "تنسيق التاريخ",
    business_profile: "ملف العمل التجاري",
    change_logo: "تغيير الشعار",
    shop_name: "اسم العمل / المحل",
    owner_name: "اسم التاجر",
    phone: "رقم الهاتف",
    address: "العنوان",
    data_management: "إدارة البيانات والنسخ الاحتياطي",
    backup_cloud: "نسخ احتياطي سحابي",
    last_sync: "آخر مزامنة ناجحة",
    take_backup: "أخذ نسخة الآن",
    export_pdf: "تصدير PDF",
    export_pdf_desc: "كشوفات الحسابات",
    export_excel: "تصدير Excel",
    export_excel_desc: "بيانات العملاء والديون",

    // Placeholders
    search_placeholder: "بحث...",
    loading: "جاري التحميل...",
    save: "حفظ",
    saved: "تم الحفظ",
    saving: "جارٍ الحفظ...",

    // Workers
    workers_title: "إدارة العمال",
    workers_desc: "إدارة صلاحيات وحسابات الموظفين",

    // Common Actions
    add_new: "إضافة جديد",
    edit: "تعديل",
    delete: "حذف",
    view: "عرض",
    cancel: "إلغاء",
    confirm: "تأكيد",

    // Pages Headers
    customers_title: "العملاء",
    suppliers_title: "الموردون",
    // workers_title already defined above
    debts_title: "دفتر الديون",

    // Summary Cards
    summary_customers: "ملخص العملاء",
    debt_on_them: "عليهم (مدين)",
    credit_for_them: "لهم (دائن)",
    total_receivable: "إجمالي الديون",
    total_payable: "إجمالي الأرصدة",

    // Filters & Status
    filter_all: "الكل",
    filter_active: "نشط",
    filter_inactive: "غير نشط",
    status_debt: "عليه له",
    status_credit: "له",
    status_clear: "خالص",

    // Specific Actions
    add_customer: "إضافة عميل",
    add_supplier: "إضافة مورد",
    add_worker: "إضافة عامل",
    add_debt: "إضافة دين",

    // Empty States
    no_data: "لا توجد بيانات",
    no_customers: "لم يتم العثور على عملاء",
    no_suppliers: "لم يتم العثور على موردين",

    // Common
    error_generic: "حدث خطأ ما",
    success_generic: "تمت العملية بنجاح",
};

export const en: Dictionary = {
    // Navigation
    nav_customers: "Customers",
    nav_suppliers: "Suppliers",
    nav_debts: "Debts Ledger",
    nav_workers: "Workers",
    nav_settings: "Settings",
    nav_logout: "Logout",

    // Settings Page
    settings_title: "App Settings",
    general_settings: "General Settings",
    language_label: "Language",
    language_desc: "Choose your preferred interface language",
    default_currency: "Default Currency",
    date_format: "Date Format",
    business_profile: "Business Profile",
    change_logo: "Change Logo",
    shop_name: "Shop / Business Name",
    owner_name: "Owner Name",
    phone: "Phone Number",
    address: "Address",
    data_management: "Data Management & Backup",
    backup_cloud: "Cloud Backup",
    last_sync: "Last successful sync",
    take_backup: "Backup Now",
    export_pdf: "Export PDF",
    export_pdf_desc: "Account Statements",
    export_excel: "Export Excel",
    export_excel_desc: "Customers & Debts Data",

    // Placeholders
    search_placeholder: "Search...",
    loading: "Loading...",
    save: "Save",
    saved: "Saved",
    saving: "Saving...",

    // Workers
    workers_title: "Workers Management",
    workers_desc: "Manage employee accounts and permissions",

    // Common Actions
    add_new: "Add New",
    edit: "Edit",
    delete: "Delete",
    view: "View",
    cancel: "Cancel",
    confirm: "Confirm",

    // Pages Headers
    customers_title: "Customers",
    suppliers_title: "Suppliers",
    // workers_title already defined above
    debts_title: "Debts Ledger",

    // Summary Cards
    summary_customers: "Customers Summary",
    debt_on_them: "Debit (Owe you)",
    credit_for_them: "Credit (You owe)",
    total_receivable: "Total Receivables",
    total_payable: "Total Payables",

    // Filters & Status
    filter_all: "All",
    filter_active: "Active",
    filter_inactive: "Inactive",
    status_debt: "Debt",
    status_credit: "Credit",
    status_clear: "Settled",

    // Specific Actions
    add_customer: "Add Customer",
    add_supplier: "Add Supplier",
    add_worker: "Add Worker",
    add_debt: "Add Debt",

    // Empty States
    no_data: "No data found",
    no_customers: "No customers found",
    no_suppliers: "No suppliers found",

    // Common
    error_generic: "Something went wrong",
    success_generic: "Operation successful",
};
