"use client";
import { CloudCheck, ChatCircleDots, ChartBar } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function FeaturesSection() {
  const features = [
    {
      icon: <CloudCheck size={32} weight="duotone" />,
      title: "مزامنة سحابية آمنة",
      description:
        "بياناتك محفوظة ومشفرة دائماً. لا تقلق من ضياع هاتفك أو سجلاتك الورقية، يمكنك الوصول لحسابك من أي مكان.",
    },
    {
      icon: <ChatCircleDots size={32} weight="duotone" />,
      title: "تنبيهات الواتساب",
      description:
        "أرسل تذكيرات آلية للعملاء بمواعيد سداد الديون عبر الواتساب بضغطة زر واحدة، وبطريقة احترافية.",
    },
    {
      icon: <ChartBar size={32} weight="duotone" />,
      title: "تقارير مالية دقيقة",
      description:
        "احصل على ملخص يومي وأسبوعي لأرباحك وديونك ومصروفاتك عبر رسوم بيانية سهلة الفهم والتحليل.",
    },
  ];

  return (
    <section
      className="px-6 md:px-20 py-20 md:py-28 bg-white dark:bg-background-dark overflow-hidden"
      id="features"
    >
      <div className="max-w-[1200px] mx-auto flex flex-col gap-16">
        {/* Section Header */}
        <ScrollReveal>
          <div className="flex flex-col gap-4 text-center max-w-[800px] mx-auto">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm">
              مميزاتنا
            </h2>
            <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight">
              لماذا يختار التجار تطبيق محسوب؟
            </h3>
            <p className="text-text-muted dark:text-gray-400 text-lg">
              حلول مالية ذكية صُممت لتناسب طبيعة السوق السوداني واحتياجات التاجر
              المحلي.
            </p>
          </div>
        </ScrollReveal>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div
                className="flex flex-col gap-6 p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-background-dark/50 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all group h-full"
              >
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-3">
                  <h4 className="text-text-main dark:text-white text-xl font-black">
                    {feature.title}
                  </h4>
                  <p className="text-text-muted dark:text-gray-400 leading-relaxed font-medium">
                    {feature.description}
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
