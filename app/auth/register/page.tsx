import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="auth" ctaLabel="العودة للرئيسية" ctaHref="/" />
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[520px]">
          <div className="p-8 md:p-10 text-center">
            <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-3">
              إنشاء حساب غير متاح حالياً
            </h1>
            <p className="text-text-muted dark:text-text-muted-dark text-base leading-relaxed">
              الموقع تحت التطوير حالياً. سيتم تفعيل التسجيل قريباً.
            </p>
            <div className="pt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center bg-primary text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
