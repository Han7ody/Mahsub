"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { List, X } from "@phosphor-icons/react";

interface HeaderProps {
  variant?: "default" | "auth" | "minimal";
  ctaLabel?: string;
  ctaHref?: string;
}

export default function Header({ variant = "default", ctaLabel, ctaHref }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const rafRef = useRef<number | null>(null);

  const primaryLabel = ctaLabel ?? (variant === "minimal" ? "إنشاء حساب" : "ابدأ مجاناً");
  const primaryHref = ctaHref ?? "/auth/register";

  const navLinks = [
    { name: "المميزات", href: "/#features" },
    { name: "كيف يعمل", href: "/#how-it-works" },
    { name: "الأسعار", href: "/#pricing" },
    { name: "تحميل التطبيق", href: "/#download" },
  ];

  // Collapsible header logic (same idea as app headers: shrink on scroll)
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const nextCollapsed = y > 24;
        if (nextCollapsed !== isCollapsed) setIsCollapsed(nextCollapsed);
        lastScrollY.current = y;
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header
      className={`sticky top-0 left-0 right-0 bg-white/90 dark:bg-background-dark/95 backdrop-blur-md z-[100] border-b border-slate-100 dark:border-white/5 transition-all duration-200 ${
        isCollapsed ? "shadow-lg shadow-black/5" : "shadow-none"
      }`}
      style={{
        // Smooth shrink on scroll
        height: isCollapsed ? 64 : 80,
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <svg fill="none" viewBox="0 0 48 48" className="size-7" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h2 className="text-text-main dark:text-white text-2xl font-black tracking-tight">
            محسوب
          </h2>
        </Link>

        {/* Desktop Navigation */}
        {variant === "default" && (
          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-text-main dark:text-gray-300 font-bold hover:text-primary transition-colors text-sm"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Auth Buttons & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4">
            {variant !== "minimal" && (
              <Link
                href="/auth/login"
                className="text-text-main dark:text-white font-bold hover:text-primary transition-colors text-sm"
              >
                تسجيل الدخول
              </Link>
            )}
            <Link
              href={primaryHref}
              className="bg-primary text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              {primaryLabel}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          {variant === "default" && (
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden size-11 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-text-main dark:text-white"
            >
              {isMenuOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden absolute left-0 right-0 bg-white dark:bg-background-dark border-b border-slate-100 dark:border-white/5 p-6 flex flex-col gap-6 shadow-2xl animate-slide-down" style={{ top: isCollapsed ? 64 : 80 }}>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="text-text-main dark:text-white font-bold text-lg hover:text-primary transition-colors text-right"
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-slate-100 dark:bg-white/5 my-2"></div>
          <Link
            href="/auth/login"
            className="text-text-main dark:text-white font-bold text-center py-2"
          >
            تسجيل الدخول
          </Link>
          <Link
            href={primaryHref}
            className="bg-primary text-white py-4 rounded-2xl font-black text-center shadow-lg"
          >
            {primaryLabel}
          </Link>
        </div>
      )}
    </header>
  );
}
