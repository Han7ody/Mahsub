"use client";
import { UsersThree, Receipt, Headset } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function StatsSection() {
  const stats = [
    { 
      label: "معاملة يومية", 
      value: "+10,000",
      icon: <Receipt size={32} weight="duotone" />
    },
    { 
      label: "تاجر يثق بنا", 
      value: "+1,000",
      icon: <UsersThree size={32} weight="duotone" />
    },
    { 
      label: "دعم فني محلي", 
      value: "24/7",
      icon: <Headset size={32} weight="duotone" />
    },
  ];

  return (
    <section className="px-6 md:px-20 py-20 bg-emerald-50/30 dark:bg-emerald-950/10 border-y border-slate-100 dark:border-white/5">
      <div className="max-w-[1200px] mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-4 group">
                <div className="size-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-text-main dark:text-white text-4xl md:text-5xl font-black tracking-tighter">
                    {stat.value}
                  </p>
                  <p className="text-text-muted dark:text-gray-400 text-base md:text-lg font-bold uppercase tracking-wide">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
