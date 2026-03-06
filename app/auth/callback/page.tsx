"use client";

import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  const fallbackMessage = useMemo(() => {
    if (errorDescription) return decodeURIComponent(errorDescription);
    if (!code) return "لم يتم العثور على بيانات تسجيل الدخول.";
    return "";
  }, [code, errorDescription]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (errorDescription) {
        setStatus("error");
        setMessage(decodeURIComponent(errorDescription));
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage(fallbackMessage);
        return;
      }

      try {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (cancelled) return;

        setStatus("success");
        setMessage("تم تسجيل الدخول بنجاح. جارٍ تحويلك...");
        router.replace("/dashboard/customers");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e?.message || "فشل إكمال تسجيل الدخول.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [code, errorDescription, fallbackMessage, router]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="minimal" ctaLabel="العودة للرئيسية" ctaHref="/" />
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[520px]">
          <div className="p-8 md:p-10 text-center">
            <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-3">
              {status === "loading" ? "جاري إكمال تسجيل الدخول" : status === "success" ? "تم" : "حدث خطأ"}
            </h1>
            <p className="text-text-muted dark:text-text-muted-dark text-base leading-relaxed">
              {status === "loading" ? "انتظر لحظة..." : message || fallbackMessage}
            </p>
            <div className="pt-6">
              <Link
                href={status === "success" ? "/dashboard/customers" : "/"}
                className="inline-flex items-center justify-center bg-primary text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                {status === "success" ? "الانتقال للوحة التحكم" : "العودة للرئيسية"}
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
