import Image from "next/image";
import { withBasePath } from "@/lib/base-path";

export default function InvoiceFeature() {
  return (
    <section className="px-6 md:px-20 py-16 md:py-24 bg-white dark:bg-background-dark overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          
          {/* Illustration Section (On the Right for Desktop) */}
          <div className="relative order-1 lg:order-1 flex justify-center items-center w-full">
            <div className="relative w-full max-w-[400px] md:max-w-[500px] aspect-square">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 w-full h-full">
                <Image 
                  src={withBasePath("/images/receipt-invoice.svg")}
                  alt="إصدار الفواتير في محسوب" 
                  fill
                  className="object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>

          {/* Text Content (On the Left for Desktop) */}
          <div className="flex flex-col gap-8 order-2 lg:order-2 text-center lg:text-right">
            <div className="flex flex-col gap-4">
              <h2 className="text-primary font-bold text-lg tracking-wide">نظام الفواتير الذكي</h2>
              <h3 className="text-text-main dark:text-white text-3xl md:text-5xl font-black leading-tight">
                فواتيرك.. <br />
                <span className="text-primary">بسرعة البرق.</span>
              </h3>
              <p className="text-text-muted dark:text-gray-400 text-lg md:text-xl font-medium leading-relaxed">
                أنشئ فواتير احترافية لعملائك في ثوانٍ. محسوب يسمح لك بتنظيم مبيعاتك، تتبع المدفوعات، وإرسال نسخة للعميل عبر الواتساب مباشرة دون تعقيد.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary font-bold text-2xl">print</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-main dark:text-white">طباعة فورية</p>
                  <p className="text-sm text-text-muted dark:text-gray-400">دعم كامل لجميع أنواع الطابعات.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary font-bold text-2xl">share</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-main dark:text-white">مشاركة سريعة</p>
                  <p className="text-sm text-text-muted dark:text-gray-400">أرسل الفاتورة كملف PDF بضغطة زر.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
