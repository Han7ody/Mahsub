"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type SidebarPage = "customers" | "suppliers" | "debts" | "workers" | "settings";

interface MobileDrawerProps {
  open: boolean;
  onCloseAction: () => void;
  activePage: SidebarPage;
  onOpenProfileAction?: () => void;
}

export default function MobileDrawer({ open, onCloseAction, activePage, onOpenProfileAction }: MobileDrawerProps) {
  const { currentBusiness } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseAction();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCloseAction]);

  const navItems = [
    { id: "customers", label: t("nav_customers"), href: "/dashboard/customers", icon: "https://img.icons8.com/?size=100&id=82736&format=png&color=40C057" },
    { id: "suppliers", label: t("nav_suppliers"), href: "/dashboard/suppliers", icon: "https://img.icons8.com/?size=100&id=13014&format=png&color=40C057" },
    { id: "debts", label: t("nav_debts"), href: "/dashboard/debts", icon: "https://img.icons8.com/?size=100&id=20803&format=png&color=40C057" },
    { id: "workers", label: t("nav_workers"), href: "/dashboard/workers", icon: "https://img.icons8.com/?size=100&id=11361&format=png&color=40C057" },
    { id: "settings", label: t("nav_settings"), href: "/dashboard/settings", icon: "https://img.icons8.com/?size=100&id=364&format=png&color=40C057" },
  ] as const;

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onCloseAction}
      />
      {/* Drawer Panel (RTL: from right) */}
      <aside
        className={`absolute inset-y-0 right-0 w-72 max-w-[80vw] bg-white border-l border-slate-100 p-6 flex flex-col gap-4 transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight tracking-tight">Mahsub</h1>
              <p className="text-primary text-[10px] font-bold">{t("settings_title") === "App Settings" ? "Business Management" : "لإدارة ديون التجار"}</p>
            </div>
          </div>
          <button onClick={onCloseAction} className="size-10 rounded-2xl border border-slate-100 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.id === activePage;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onCloseAction}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/10"
                    : "text-text-muted hover:bg-primary-soft hover:text-primary"
                  }`}
              >
                <img 
                  src={item.icon} 
                  alt={item.label} 
                  className={`size-6 object-contain ${isActive ? "" : "opacity-70"}`} 
                  style={isActive ? { filter: 'brightness(0) invert(1)' } : {}}
                />
                <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile tile (matches desktop sidebar bottom card) */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              onCloseAction();
              onOpenProfileAction?.();
            }}
            className="w-full bg-primary-soft rounded-2xl p-4 flex items-center gap-3 text-right hover:brightness-105 transition"
          >
            <div
              className="size-10 rounded-full bg-cover bg-center border-2 border-white shadow-sm bg-primary-soft flex items-center justify-center"
              style={currentBusiness?.logo_url ? {
                backgroundImage: `url("${currentBusiness.logo_url}")`,
              } : {}}
            >
              {!currentBusiness?.logo_url && (
                <span className="text-xs font-bold text-primary">
                  {currentBusiness?.name?.slice(0, 2) || 'M'}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-bold text-text-main">{currentBusiness?.name || (t("settings_title") === "App Settings" ? "My Business" : "متجر الخير")}</p>
              <p className="text-[10px] text-primary">{currentBusiness?.address || (t("settings_title") === "App Settings" ? "Address" : "العنوان")}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500 ms-auto">chevron_left</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
