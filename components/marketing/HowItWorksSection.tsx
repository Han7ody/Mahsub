"use client";
import { UserPlus, Wallet, SealCheck } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "افتح دفترك",
      description:
        "سجل اسم الزبون وموبايله في ثانية، وممكن تسحبهم من جهات اتصالك مباشرة.",
      icon: <UserPlus size={40} weight="duotone" />,
    },
    {
      number: "02",
      title: "أعطيته ولا قبضت؟",
      description: "سجل المبلغ سواء كان دين جديد أو دفعة استلمتها، مع إضافة ملاحظاتك وصور الإيصالات.",
      icon: <Wallet size={40} weight="duotone" />,
    },
    {
      number: "03",
      title: "ضمن حقك",
      description:
        "أرسل تذكير بالواتساب وتابع ديونك أول بأول لحدي ما تتحصل، وخلي بياناتك دايماً في الحفظ.",
      icon: <SealCheck size={40} weight="duotone" />,
    },
  ];

  return (
    <section
      className="px-6 md:px-20 py-24 md:py-32 bg-slate-50 dark:bg-emerald-950/5 border-y border-slate-100 dark:border-white/5"
      id="how-it-works"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <ScrollReveal>
          <div className="text-center mb-24 flex flex-col gap-4">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm">بسطناها ليك</h2>
            <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight">
              ابدأ تنظيم حساباتك في 3 خطوات بس
            </h3>
          </div>
        </ScrollReveal>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 relative">
          {/* Connector Line (Desktop Only) */}
          <div className="hidden md:block absolute top-24 left-0 w-full h-0.5 border-t-2 border-dashed border-primary/20 -z-0"></div>

          {steps.map((step, index) => (
            <ScrollReveal key={index} delay={index * 0.15}>
              <div className="flex flex-col items-center text-center group relative z-10">
                {/* Number and Icon Container */}
                <div className="relative mb-10">
                  <div className="size-24 rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/10 flex items-center justify-center text-primary shadow-xl group-hover:border-primary group-hover:-translate-y-2 transition-all duration-300">
                    {step.icon}
                  </div>
                  <div className="absolute -top-3 -right-3 size-11 rounded-full bg-primary text-white flex items-center justify-center font-black text-base shadow-lg border-4 border-slate-50 dark:border-background-dark">
                    {step.number}
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-4 max-w-[280px]">
                  <h4 className="text-text-main dark:text-white text-2xl font-black tracking-tight">
                    {step.title}
                  </h4>
                  <p className="text-text-muted dark:text-gray-400 text-base font-medium leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
