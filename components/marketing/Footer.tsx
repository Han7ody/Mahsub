"use client";
import Link from "next/link";
import { FacebookLogo, TwitterLogo, InstagramLogo, LinkedinLogo, TelegramLogo, Heart } from "@phosphor-icons/react";

export default function Footer() {
  const footerSections = [
    {
      title: "المنصة",
      links: [
        { name: "المميزات", href: "#features" },
        { name: "كيف يعمل؟", href: "#how-it-works" },
        { name: "الأسعار", href: "#pricing" },
        { name: "التطبيق", href: "#download" },
      ],
    },
    {
      title: "الدعم",
      links: [
        { name: "مركز المساعدة", href: "/faq" },
        { name: "تواصل معنا", href: "/contact" },
        { name: "دروس فيديو", href: "#" },
      ],
    },
    {
      title: "قانوني",
      links: [
        { name: "سياسة الخصوصية", href: "/privacy" },
        { name: "شروط الاستخدام", href: "/terms" },
        { name: "أمن البيانات", href: "/security" },
      ],
    },
  ];

  return (
    <footer className="bg-slate-50 dark:bg-[#0a0f0b] border-t border-slate-100 dark:border-white/5 px-6 md:px-20 pt-20 pb-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex items-center gap-3">
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
          </div>
          <p className="text-text-muted dark:text-gray-400 text-lg leading-relaxed max-w-[340px]">
            تطبيق إدارة الديون والتحصيل الرقمي الأول في السودان. نساعد التجار على تنظيم أعمالهم بكل أمان وسهولة.
          </p>

          {/* Social Links */}
          <div className="flex gap-3">
            {[FacebookLogo, TwitterLogo, InstagramLogo, TelegramLogo].map((Icon, idx) => (
              <Link
                key={idx}
                className="size-11 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 hover:-translate-y-1 transition-all shadow-sm"
                href="#"
              >
                <Icon size={24} weight="duotone" />
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Links Sections */}
        {footerSections.map((section, index) => (
          <div key={index} className="flex flex-col gap-6">
            <h5 className="text-text-main dark:text-white font-black text-lg">
              {section.title}
            </h5>
            <ul className="flex flex-col gap-4 text-base text-text-muted dark:text-gray-400">
              {section.links.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <Link
                    className="hover:text-primary transition-colors font-medium"
                    href={link.href}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="max-w-[1200px] mx-auto mt-20 pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-sm font-bold text-text-muted dark:text-gray-500 flex items-center gap-2">
          © {new Date().getFullYear()} محسوب • جميع الحقوق محفوظة
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-text-muted dark:text-gray-500">
          صنع بكل <Heart size={18} weight="fill" className="text-red-500 animate-pulse" /> في الخرطوم 🇸🇩
        </div>
      </div>
    </footer>
  );
}
