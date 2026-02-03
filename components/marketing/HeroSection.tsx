"use client";
import Image from "next/image";
import { ShieldCheck, WhatsappLogo } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";
import { withBasePath } from "@/lib/base-path";

export default function HeroSection() {
  return (
    <section className="px-6 md:px-20 py-10 md:py-24 bg-[#fcfdfc] dark:bg-background-dark overflow-hidden relative border-b border-slate-100 dark:border-white/5">
      {/* Background Decorative Circles */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* Text Content */}
          <ScrollReveal>
            <div className="flex flex-col gap-8 text-center lg:text-right items-center lg:items-start">
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full w-fit">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <span className="text-primary text-sm font-bold tracking-wide">
                  دفتر الديون الرقمي الأول في السودان 🇸🇩
                </span>
              </div>

              <h1 className="text-text-main dark:text-white text-4xl md:text-7xl font-black leading-[1.2] lg:leading-[1.1] tracking-tight text-balance">
                اضمن حقك، <br className="hidden md:block" />
                <span className="text-primary italic">وخلي دفترك في جيبك.</span>
              </h1>

              <p className="text-text-muted dark:text-gray-400 text-base md:text-xl font-medium leading-relaxed max-w-[550px]">
                ودّع الكشكول القديم وضياع الحسابات. محسوب هو تطبيقك المتكامل لتسجيل الديون (أعطيته/قبضت) ومتابعة التحصيل بكل سهولة.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <button className="group relative flex min-w-[160px] md:min-w-[200px] items-center justify-center overflow-hidden rounded-2xl h-14 md:h-16 px-6 md:px-8 bg-primary text-white text-lg font-black transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-12px_rgba(34,197,94,0.4)]">
                  ابدأ دفترك الآن
                </button>
                <button className="flex min-w-[160px] md:min-w-[200px] items-center justify-center rounded-2xl h-14 md:h-16 px-6 md:px-8 border-2 border-slate-200 dark:border-primary/20 text-text-main dark:text-white text-lg font-bold hover:bg-slate-50 dark:hover:bg-primary/5 transition-all">
                  شاهد كيف يعمل
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6 pt-6 border-t border-slate-100 dark:border-white/5 w-full lg:w-fit">
                <div className="flex items-center gap-2 md:gap-3 justify-center lg:justify-start">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <ShieldCheck size={24} weight="duotone" className="text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-text-main dark:text-gray-300 whitespace-nowrap">أعطيته وقبضت</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 justify-center lg:justify-start">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <WhatsappLogo size={24} weight="duotone" className="text-primary" />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-text-main dark:text-gray-300 whitespace-nowrap">تذكير واتساب</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Illustration Section */}
          <ScrollReveal delay={0.2} className="order-first lg:order-last">
            <div className="relative flex justify-center items-center w-full px-2 lg:px-0 lg:pl-12">
              <div className="relative w-full max-w-[380px] md:max-w-[550px] aspect-square flex items-center justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-primary/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  <Image
                    src={withBasePath("/images/financial-data.svg")}
                    alt="إدارة الديون والحسابات"
                    fill
                    className="drop-shadow-2xl object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
