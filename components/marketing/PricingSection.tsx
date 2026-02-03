"use client";
import { Check } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function PricingSection() {
  const plans = [
    {
      name: "البداية",
      price: "0",
      description: "للأفراد والتجار المبتدئين",
      features: ["حتى 50 عميل", "تسجيل ديون غير محدود", "تنبيهات يدوية بالواتساب", "نسخة احتياطية أساسية"],
      buttonText: "ابدأ مجاناً",
      popular: false,
    },
    {
      name: "المحترف",
      price: "15,000",
      description: "للمحلات التجارية المتنامية",
      features: ["عملاء غير محدودين", "تنبيهات آلية ذكية", "تقارير مالية متقدمة", "دعم فني أولوية", "إضافة 3 فروع"],
      buttonText: "اختر باقة المحترف",
      popular: true,
    },
    {
      name: "المؤسسات",
      price: "اتصل بنا",
      description: "للشركات والمجموعات الكبيرة",
      features: ["كل ميزات المحترف", "ربط مع أنظمة خارجية", "دعم مخصص 24/7", "تدريب للفريق", "فروع غير محدودة"],
      buttonText: "تواصل معنا",
      popular: false,
    },
  ];

  return (
    <section className="px-6 md:px-20 py-24 md:py-32 bg-white dark:bg-background-dark" id="pricing">
      <div className="max-w-[1200px] mx-auto">
        <ScrollReveal>
          <div className="text-center mb-20 flex flex-col gap-4">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm">الأسعار</h2>
            <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black">باقات تناسب نمو تجارتك</h3>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {plans.map((plan, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div
                className={`relative h-full flex flex-col p-10 rounded-[2.5rem] bg-white dark:bg-slate-800 border-2 transition-all hover:-translate-y-2 ${
                  plan.popular ? "border-primary shadow-2xl shadow-primary/20 scale-105 z-10" : "border-slate-100 dark:border-white/5 shadow-xl"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-1 rounded-full text-sm font-black uppercase">
                    الأكثر طلباً
                  </div>
                )}
                <div className="mb-8 text-right">
                  <h4 className="text-xl font-bold text-text-main dark:text-white mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-text-main dark:text-white">{plan.price}</span>
                    {plan.price !== "اتصل بنا" && <span className="text-text-muted font-bold text-xs">ج.س / شهرياً</span>}
                  </div>
                  <p className="text-sm text-text-muted mt-2 font-medium">{plan.description}</p>
                </div>

                <div className="flex flex-col gap-4 mb-10 flex-1">
                  {plan.features.map((feature, fi) => (
                    <div key={fi} className="flex items-center gap-3">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Check size={12} weight="bold" />
                      </div>
                      <span className="text-sm font-bold text-text-muted dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <button className={`w-full h-14 rounded-2xl font-black text-lg transition-all ${
                  plan.popular ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-emerald-600" : "bg-slate-100 dark:bg-white/5 text-text-main dark:text-white hover:bg-slate-200"
                }`}>
                  {plan.buttonText}
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
