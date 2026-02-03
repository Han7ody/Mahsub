"use client";
import Image from "next/image";
import { ArrowsClockwise, LockKey } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";
import { withBasePath } from "@/lib/base-path";

export default function SecurityFeature() {
  return (
    <section className="px-6 md:px-20 py-20 md:py-28 bg-emerald-50/20 dark:bg-emerald-950/10 overflow-hidden border-y border-slate-100 dark:border-white/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          
          <ScrollReveal>
            <div className="flex flex-col gap-8 text-center lg:text-right">
              <div className="flex flex-col gap-4">
                <h2 className="text-primary font-bold text-lg tracking-wide">أمان بياناتك أولاً</h2>
                <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight">
                  دفترك محفوظ.. <br />
                  <span className="text-primary">حتى لو ضاع تلفونك.</span>
                </h3>
                <p className="text-text-muted dark:text-gray-400 text-lg md:text-xl font-medium leading-relaxed">
                  مع محسوب، كل معاملة بتسجلها بتترفع طوالي للسحاب (Cloud) بنظام تشفير عالي. لو غيرت تلفونك، بس سجل دخولك وحتلقى كل ديونك زي ما هي.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <ArrowsClockwise size={28} weight="duotone" className="text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main dark:text-white">مزامنة فورية</p>
                    <p className="text-sm text-text-muted dark:text-gray-400">تحديث البيانات لحظة بلحظة على جميع أجهزتك.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <LockKey size={28} weight="duotone" className="text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main dark:text-white">تشفير كامل</p>
                    <p className="text-sm text-text-muted dark:text-gray-400">خصوصية بياناتك المالية هي أولويتنا القصوى.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="relative flex justify-center items-center w-full">
              <div className="relative w-full max-w-[400px] md:max-w-[500px] aspect-square">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative z-10 w-full h-full">
                  <Image 
                    src={withBasePath("/images/secure-data.svg")}
                    alt="الأمان السحابي في محسوب" 
                    fill
                    className="object-contain drop-shadow-xl"
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
