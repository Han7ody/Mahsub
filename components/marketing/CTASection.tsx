"use client";
import Link from "next/link";
import { RocketLaunch, ArrowRight } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function CTASection() {
  return (
    <section className="px-6 md:px-20 py-24 bg-white dark:bg-background-dark" id="pricing-cta">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary via-emerald-500 to-emerald-600 px-8 py-20 md:py-32 text-center flex flex-col items-center gap-10 shadow-[0_40px_100px_-20px_rgba(34,197,94,0.4)]">
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/5 rounded-full blur-3xl -ml-40 -mb-40"></div>

          <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-md mb-2">
            <RocketLaunch size={56} weight="duotone" className="text-white" />
          </div>

          <h2 className="text-white text-4xl md:text-7xl font-black leading-tight max-w-[900px] relative z-10 text-balance">
            جاهز تقفل "الكشكول" <br /> وتبدأ صح؟
          </h2>
          
          <p className="text-emerald-50 text-xl md:text-2xl font-medium max-w-[700px] relative z-10 opacity-90 leading-relaxed">
            انضم لآلاف التجار السودانيين الذين وثقوا في "محسوب" لتنظيم ديونهم وتوفير وقتهم. البداية مجانية تماماً!
          </p>

          <div className="flex flex-wrap justify-center gap-6 mt-6 relative z-10 w-full md:w-auto">
            <Link
              href="/auth/register"
              className="group flex min-w-[240px] items-center justify-center gap-3 rounded-[1.5rem] h-16 md:h-20 px-10 bg-white text-primary text-2xl font-black transition-all hover:bg-emerald-50 hover:scale-105 active:scale-95 shadow-2xl shadow-black/10"
            >
              ابدأ دفترك الآن
              <ArrowRight size={28} weight="bold" className="transition-transform group-hover:translate-x-[-4px]" />
            </Link>
            
            <Link
              href="/contact"
              className="flex min-w-[240px] items-center justify-center rounded-[1.5rem] h-16 md:h-20 px-10 border-2 border-white/40 text-white text-xl font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              تواصل مع فريقنا
            </Link>
          </div>

          <p className="text-emerald-100/60 text-sm font-black mt-4 uppercase tracking-widest">
            لا حاجة لبطاقة ائتمان • تسجيل خلال دقيقة
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
