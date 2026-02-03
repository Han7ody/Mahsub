"use client";

import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileProfileSlideOver from "@/components/dashboard/MobileProfileSlideOver";
import { useEffect, useRef, useState, useMemo } from "react";
import { FilterSegmented, FilterSelect } from "@/components/dashboard/FilterBar";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { updateBusiness } from "@/lib/repo/businesses";

type SettingsTab = "main" | "profile" | "preferences" | "data" | "accounting";

export default function SettingsPage() {
  const { currentBusiness, refreshBusiness } = useAuth();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [view, setView] = useState<SettingsTab>("main");
  const [isSaving, setIsSaving] = useState(false);
  
  // States for Settings
  const [currency, setCurrency] = useState("SDG");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [footerNote, setFooterNote] = useState("");
  const [debtThreshold, setDebtThreshold] = useState("50000");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isFirstRender = useRef(true);

  // Load current data
  useEffect(() => {
    if (currentBusiness) {
      setShopName(currentBusiness.name || "");
      setShopPhone(currentBusiness.phone || "");
      setShopAddress(currentBusiness.address || "");
      // Note: ownerName and taxNumber might need extra fields in DB or settings JSONB
    }
  }, [currentBusiness]);

  const handleSaveProfile = async () => {
    if (!currentBusiness) return;
    setIsSaving(true);
    
    const { error } = await updateBusiness(currentBusiness.id, {
      name: shopName,
      phone: shopPhone,
      address: shopAddress,
    });

    if (error) {
      showToast("فشل حفظ التعديلات", "error");
    } else {
      await refreshBusiness();
      showToast("تم حفظ البيانات بنجاح", "success");
    }
    setIsSaving(false);
  };

  // Hub Cards Configuration
  const hubCards = useMemo(() => [
    { id: "profile" as const, title: t("business_profile"), desc: "تعديل اسم المحل، الشعار والعنوان", icon: "https://img.icons8.com/?size=100&id=488&format=png&color=40C057", color: "text-blue-500", bg: "bg-blue-50", isImage: true },
    { id: "preferences" as const, title: "المظهر واللغة", desc: "تغيير لغة التطبيق والعملة والتوقيت", icon: "https://img.icons8.com/?size=100&id=364&format=png&color=40C057", color: "text-purple-500", bg: "bg-purple-50", isImage: true },
    { id: "accounting" as const, title: "قواعد المحاسبة", desc: "ضبط حدود الديون وتذييل التقارير", icon: "https://img.icons8.com/?size=100&id=13678&format=png&color=40C057", color: "text-emerald-500", bg: "bg-emerald-50", isImage: true },
    { id: "data" as const, title: "النسخ والبيانات", desc: "تصدير الملفات والنسخ السحابي", icon: "https://img.icons8.com/?size=100&id=64947&format=png&color=40C057", color: "text-orange-500", bg: "bg-orange-50", isImage: true },
  ], [t]);

  // Auto-save logic
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    console.log("Auto-saving settings...", { shopName, taxNumber });
  }, [language, currency, dateFormat, shopName, ownerName, shopPhone, shopAddress, taxNumber, footerNote, debtThreshold]);

  const SectionHeader = ({ title, icon, isImageIcon }: { title: string, icon: string, isImageIcon?: boolean }) => (
    <div className="flex items-center gap-4 mb-8">
      <button 
        onClick={() => setView("main")} 
        className="size-10 rounded-xl bg-slate-100 text-text-main flex items-center justify-center hover:bg-slate-200 transition-colors"
      >
        <span className="material-symbols-outlined">{language === 'ar' ? 'arrow_forward' : 'arrow_back'}</span>
      </button>
      <div className="flex items-center gap-2">
        {isImageIcon ? (
          <img src={icon} alt={title} className="size-8 object-contain" />
        ) : (
          <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
        )}
        <h3 className="text-xl font-black text-text-main">{title}</h3>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      <DashboardSidebar activePage="settings" />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Main App Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-5 md:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDrawerOpen(true)} className="md:hidden size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white flex items-center justify-center">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2 className="text-2xl font-black text-text-main">
                {view === "main" ? t("settings_title") : hubCards.find(c => c.id === view)?.title}
              </h2>
            </div>
          </div>
        </header>

        <div className="px-4 py-8 md:p-12 max-w-4xl mx-auto w-full">
          
          {/* --- HUB VIEW --- */}
          {view === "main" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
              {hubCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setView(card.id)}
                  className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center gap-5 text-right hover:shadow-xl hover:shadow-slate-200/50 hover:scale-[1.02] transition-all group"
                >
                  <div className={`size-16 rounded-3xl ${card.bg} ${card.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    {(card as any).isImage ? (
                      <img src={card.icon} alt={card.title} className="size-8 object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl">{card.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-lg font-black text-text-main mb-0.5">{card.title}</h4>
                    <p className="text-sm text-text-muted line-clamp-1">{card.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">
                    {language === 'ar' ? 'chevron_left' : 'chevron_right'}
                  </span>
                </button>
              ))}

              <div className="md:col-span-2 mt-12 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-xl font-black mb-2">هل تحتاج للمساعدة؟</h4>
                  <p className="text-slate-400 text-sm mb-6 max-w-md">فريق دعم محسوب جاهز للرد على استفساراتك المحاسبية والتقنية في أي وقت.</p>
                  <button className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">support_agent</span>
                    تواصل مع الدعم الفني
                  </button>
                </div>
                <span className="material-symbols-outlined absolute -bottom-10 -left-10 text-[200px] opacity-10 rotate-12 pointer-events-none">help_center</span>
              </div>
            </div>
          )}

          {/* --- PROFILE VIEW --- */}
          {view === "profile" && (
            <div className="animate-fadeInRight">
              <SectionHeader title={t("business_profile")} icon="https://img.icons8.com/?size=100&id=488&format=png&color=40C057" isImageIcon />
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="size-32 rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center relative group cursor-pointer hover:border-primary/50 transition-colors">
                    <span className="material-symbols-outlined text-slate-300 text-5xl">add_a_photo</span>
                    <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">{t("change_logo")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[ 
                    { label: t("shop_name"), val: shopName, set: setShopName, ph: "اسم المتجر" },
                    { label: t("owner_name"), val: ownerName, set: setOwnerName, ph: "اسم التاجر" },
                    { label: "الرقم الضريبي", val: taxNumber, set: setTaxNumber, ph: "مثلاً: 123456" },
                    { label: t("phone"), val: shopPhone, set: setShopPhone, ph: "+249", dir: "ltr" }
                  ].map((field, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <label className="text-xs font-black text-slate-400 uppercase mr-1">{field.label}</label>
                      <input 
                        dir={field.dir || "rtl"}
                        value={field.val} 
                        onChange={e => field.set(e.target.value)} 
                        className="bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 text-sm font-bold" 
                        placeholder={field.ph} 
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1">{t("address")}</label>
                    <input value={shopAddress} onChange={e => setShopAddress(e.target.value)} className="bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 text-sm font-bold" placeholder="العنوان بالتفصيل" />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-10 py-4 bg-primary text-white font-black rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="material-symbols-outlined text-xl">{isSaving ? 'sync' : 'save'}</span>
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === "preferences" && (
            <div className="animate-fadeInRight">
              <SectionHeader title="المظهر واللغة" icon="https://img.icons8.com/?size=100&id=364&format=png&color=40C057" isImageIcon />
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-12">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-black text-text-main text-lg">{t("language_label")}</p>
                    <p className="text-sm text-text-muted">{t("language_desc")}</p>
                  </div>
                  <FilterSegmented
                    options={[{ label: "العربية", value: "ar" }, { label: "English", value: "en" }]}
                    value={language}
                    onChangeAction={(v) => setLanguage(v as any)}
                  />
                </div>
                <hr className="border-slate-50" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-black text-text-main flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">payments</span>
                      {t("default_currency")}
                    </label>
                    <FilterSelect
                      value={currency}
                      onChangeAction={setCurrency}
                      options={[{ value: "SDG", label: "جنيه سوداني (SDG)" }, { value: "USD", label: "دولار أمريكي (USD)" }]}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-black text-text-main flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">calendar_today</span>
                      {t("date_format")}
                    </label>
                    <FilterSelect
                      value={dateFormat}
                      onChangeAction={setDateFormat}
                      options={[{ value: "DD/MM/YYYY", label: "DD/MM/YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }]}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "accounting" && (
            <div className="animate-fadeInRight">
              <SectionHeader title="قواعد المحاسبة" icon="https://img.icons8.com/?size=100&id=13678&format=png&color=40C057" isImageIcon />
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-10">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-black text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">notifications_active</span>
                    تنبيه حد الدين الأقصى
                  </label>
                  <div className="relative max-w-sm">
                    <input 
                      type="number" 
                      value={debtThreshold} 
                      onChange={e => setDebtThreshold(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-red-200 text-lg font-black text-red-600"
                    />
                    <span className="absolute left-6 top-4.5 text-xs text-slate-400 font-black">SDG</span>
                  </div>
                  <p className="text-xs text-text-muted">نبهني باللون الأحمر إذا تجاوز دين العميل هذا المبلغ.</p>
                </div>
                <hr className="border-slate-50" />
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-black text-text-main flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">description</span>
                    نص تذييل كشف الحساب
                  </label>
                  <textarea 
                    rows={4}
                    value={footerNote}
                    onChange={e => setFooterNote(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 text-sm font-bold resize-none"
                    placeholder="مثلاً: نشكركم لتعاملكم معنا، يرجى سداد المبالغ في موعدها."
                  />
                </div>
              </div>
            </div>
          )}

          {view === "data" && (
            <div className="animate-fadeInRight space-y-8">
              <SectionHeader title="النسخ والبيانات" icon="https://img.icons8.com/?size=100&id=64947&format=png&color=40C057" isImageIcon />
              
              <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-4xl">backup</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black">{t("backup_cloud")}</h4>
                    <p className="text-white/70 text-sm">آخر مزامنة: منذ ساعتين</p>
                  </div>
                </div>
                <button className="bg-white text-primary px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all">
                  {t("take_backup")}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                    </div>
                    <div>
                      <p className="font-black text-text-main text-lg">{t("export_pdf")}</p>
                      <p className="text-xs text-text-muted">كشوفات حسابات مفصلة</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["الشهر الحالي", "آخر 3 أشهر", "السنة كاملة", "تاريخ مخصص"].map((label, i) => (
                      <button key={i} className="text-xs font-black py-3 px-4 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-100">
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg">
                      <span className="material-symbols-outlined text-lg">download</span>
                      تنزيل
                    </button>
                    <button className="size-14 flex items-center justify-center bg-[#25D366] text-white rounded-2xl hover:scale-105 transition-all shadow-lg shadow-green-100">
                      <span className="material-symbols-outlined">share</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl">table_chart</span>
                    </div>
                    <div>
                      <p className="font-black text-text-main text-lg">{t("export_excel")}</p>
                      <p className="text-xs text-text-muted font-bold">جداول البيانات الخام</p>
                    </div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">اختر القائمة:</p>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="radio" name="excel_type" className="size-5 accent-blue-600" defaultChecked />
                        <span className="text-sm font-bold text-text-main">قائمة العملاء</span>
                      </label>
                      <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="radio" name="excel_type" className="size-5 accent-blue-600" />
                        <span className="text-sm font-bold text-text-main">قائمة الموردين</span>
                      </label>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                    <span className="material-symbols-outlined">download_for_offline</span>
                    تصدير Excel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <footer className="mt-16 py-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-text-muted text-[11px] font-bold uppercase tracking-widest">
            <p>© 2025 MAHSUB SYSTEM</p>
            <div className="flex items-center gap-6">
              <a className="hover:text-primary transition-colors" href="#">Legal</a>
              <a className="hover:text-primary transition-colors" href="#">Support</a>
              <p className="text-slate-400">VERSION 1.2.0-STABLE</p>
            </div>
          </footer>
        </div>
      </main>

      <MobileDrawer open={isDrawerOpen} onCloseAction={() => setIsDrawerOpen(false)} onOpenProfileAction={() => setIsProfileOpen(true)} activePage="settings" />
      <MobileProfileSlideOver isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}
