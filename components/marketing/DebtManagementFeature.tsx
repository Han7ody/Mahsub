"use client";
import Image from "next/image";
import { BookOpen, BellRinging } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function DebtManagementFeature() {
  return (
    <section className="px-6 md:px-20 py-20 md:py-28 bg-white dark:bg-background-dark overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          
          <ScrollReveal>
            <div className="relative flex justify-center items-center w-full">
              <div className="relative w-full max-w-[400px] md:max-w-[500px] aspect-square">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative z-10 w-full h-full">
                  <Image 
                    src="/images/debt-ledger.svg" 
                    alt="إدارة الديون في محسوب" 
                    fill
                    className="object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="flex flex-col gap-8 text-center lg:text-right">
              <div className="flex flex-col gap-4">
                <h2 className="text-primary font-bold text-lg tracking-wide">التحصيل الذكي</h2>
                <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight">
                  ديونك.. <br />
                  <span className="text-primary">موزونة بالملي.</span>
                </h3>
                <p className="text-text-muted dark:text-gray-400 text-lg md:text-xl font-medium leading-relaxed">
                  سجل معاملاتك مع الزبائن والموردين بضغطة زر. محسوب يغنيك عن تعب الحسابات الورقية، ويذكرك بمواعيد التحصيل.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <BookOpen size={28} weight="duotone" className="text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main dark:text-white">سجل (أعطيته / قبضت)</p>
                    <p className="text-sm text-text-muted dark:text-gray-400">نظام محاسبي مبسط للتاجر والمواطن.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <BellRinging size={28} weight="duotone" className="text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-text-main dark:text-white">تذكير آلي</p>
                    <p className="text-sm text-text-muted dark:text-gray-400">أرسل رسالة تذكير بالدين عبر الواتساب للعميل بضغطة واحدة.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
