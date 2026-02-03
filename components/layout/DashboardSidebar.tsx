"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type SidebarPage = "customers" | "suppliers" | "debts" | "workers" | "settings";

interface DashboardSidebarProps {
  activePage: SidebarPage;
}

export default function DashboardSidebar({ activePage }: DashboardSidebarProps) {
  const { currentBusiness, signOut } = useAuth();
  const { t } = useLanguage();

  // Helper to ensure type safety while allowing translation keys
  const navItems = [
    { id: "customers", label: t("nav_customers") || "العملاء", href: "/dashboard/customers", icon: "https://img.icons8.com/?size=100&id=82736&format=png&color=40C057" },
    { id: "suppliers", label: t("nav_suppliers") || "الموردين", href: "/dashboard/suppliers", icon: "https://img.icons8.com/?size=100&id=13014&format=png&color=40C057" },
    { id: "debts", label: t("nav_debts") || "الديون", href: "/dashboard/debts", icon: "https://img.icons8.com/?size=100&id=20803&format=png&color=40C057" },
    { id: "workers", label: t("nav_workers") || "العمال", href: "/dashboard/workers", icon: "https://img.icons8.com/?size=100&id=11361&format=png&color=40C057" },
    { id: "settings", label: t("nav_settings") || "الإعدادات", href: "/dashboard/settings", icon: "https://img.icons8.com/?size=100&id=364&format=png&color=40C057" },
  ] as const;

  return (
    <aside className="hidden md:flex w-64 h-screen bg-white border-l border-slate-100 flex-col sticky top-0 md:w-56 lg:w-64 shrink-0 transition-all duration-300">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
          <svg className="size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-main">
            {t("settings_title") === "App Settings" ? "Mahsub" : "محسوب"}
          </h1>
          <p className="text-[10px] font-bold text-primary opacity-80">
            {t("settings_title") === "App Settings" ? "Business Management" : "لإدارة ديون التجار"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.id === activePage;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-text-muted hover:bg-slate-50 hover:text-text-main"
                }`}
            >
              <img
                src={item.icon}
                alt={item.label}
                className={`size-6 object-contain transition-transform group-hover:scale-110 ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`}
                style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
              />
              <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
              {isActive && (
                <span className="ms-auto size-1.5 rounded-full bg-white opacity-50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 hover:bg-slate-100 transition cursor-pointer group">
          <div
            className="size-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center bg-cover bg-center"
            style={currentBusiness?.logo_url ? { backgroundImage: `url(${currentBusiness.logo_url})` } : {}}
          >
            {!currentBusiness?.logo_url && (
              <span className="text-xs font-bold text-primary">
                {currentBusiness?.name?.slice(0, 2) || 'M'}
              </span>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-xs font-bold text-text-main truncate w-24">
              {currentBusiness?.name || (t("settings_title") === "App Settings" ? "My Business" : "متجر الخير")}
            </p>
            <button onClick={signOut} className="text-[10px] text-text-muted hover:text-red-500 hover:font-bold text-right transition-colors truncate">
              {t("nav_logout")}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
