"use client";

import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TextField } from "@/components/ui/TextField";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function RegisterPage() {
  const isAuthDisabled = useMemo(
    () => process.env.NEXT_PUBLIC_USE_BACKEND === "false",
    []
  );

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setErrorMessage("Supabase env vars are missing in this environment.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        return;
      }

      setSuccessMessage(
        "تم إنشاء الحساب. إذا كان التحقق بالبريد مفعّلًا، راجع بريدك الإلكتروني ثم سجل الدخول."
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthDisabled) {
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

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="auth" ctaLabel="العودة للرئيسية" ctaHref="/" />
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[520px]">
          <div className="p-8 md:p-10">
            <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-6 text-center">
              إنشاء حساب
            </h1>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <TextField
                type="email"
                dir="ltr"
                autoComplete="email"
                label="البريد الإلكتروني"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <TextField
                type="password"
                dir="ltr"
                autoComplete="new-password"
                label="كلمة المرور"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <TextField
                type="password"
                dir="ltr"
                autoComplete="new-password"
                label="تأكيد كلمة المرور"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {errorMessage && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {successMessage}
                </div>
              )}

              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
              </PrimaryButton>

              <div className="pt-2 text-center text-sm text-text-muted dark:text-text-muted-dark">
                لديك حساب بالفعل؟{" "}
                <Link href="/auth/login" className="font-bold text-primary hover:underline">
                  تسجيل الدخول
                </Link>
              </div>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
