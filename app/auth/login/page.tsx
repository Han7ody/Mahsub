"use client";

import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

type LoginMethod = "phone" | "email";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [method, setMethod] = useState<LoginMethod>("email");
  const [value, setValue] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const updateValidity = (newValue?: string, newMethod?: LoginMethod) => {
    const trimmed = (newValue ?? value).trim();
    const currentMethod = newMethod ?? method;
    const isEmailValid = currentMethod === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhoneValid = currentMethod === "phone" && trimmed.length === 10 && /^\d+$/.test(trimmed);
    setIsValid(isEmailValid || isPhoneValid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    if (USE_BACKEND) {
      setIsLoading(true);
      const supabase = createBrowserClient();

      try {
        if (method === "email") {
          const { error } = await supabase.auth.signInWithOtp({
            email: value.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}${BASE_PATH}/auth/callback`,
            },
          });
          if (error) throw error;

          showToast("تم إرسال رمز/رابط تسجيل الدخول إلى بريدك الإلكتروني", "success");
          router.push(
            `/auth/verify?mode=login&via=email&value=${encodeURIComponent(value.trim())}`
          );
          return;
        }

        // Phone login is UI-only for now (unless you wire SMS provider in Supabase)
        showToast("تسجيل الدخول عبر الهاتف غير مفعّل حالياً", "error");
      } catch (error: any) {
        showToast(error?.message || "فشل تسجيل الدخول", "error");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Demo mode
      const params = new URLSearchParams({
        mode: "login",
        via: method,
        value: value.trim(),
      });
      router.push(`/auth/verify?${params.toString()}`);
    }
  };

  const infoText =
    method === "phone" ? "سيتم إرسال رمز تحقق إلى رقم الهاتف" : "سيتم إرسال رمز تحقق إلى البريد الإلكتروني";

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="minimal" />
      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[480px]">
          <div className="p-8 md:p-10 flex flex-col">
            <div className="text-center pb-8">
              <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-2">
                تسجيل الدخول
              </h1>
              <p className="text-text-muted dark:text-text-muted-dark text-base">
                أدخل بياناتك للوصول إلى حسابك
              </p>
            </div>

            <form
              ref={formRef}
              className="space-y-4 md:space-y-5"
              onSubmit={handleSubmit}
              onChange={updateValidity}
              onInput={updateValidity}
            >
              <div className="flex gap-3 bg-background-light dark:bg-background-dark p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("phone");
                    setValue("");
                    setIsValid(false);
                    updateValidity("", "phone");
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                    method === "phone"
                      ? "bg-white dark:bg-surface-dark text-primary shadow-sm border border-primary/20"
                      : "text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark"
                  }`}
                >
                  رقم الهاتف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod("email");
                    setValue("");
                    setIsValid(false);
                    updateValidity("", "email");
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                    method === "email"
                      ? "bg-white dark:bg-surface-dark text-primary shadow-sm border border-primary/20"
                      : "text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-text-dark"
                  }`}
                >
                  البريد الإلكتروني
                </button>
              </div>

              {method === "phone" && (
                <TextField
                  type="tel"
                  label="رقم الهاتف"
                  placeholder="مثال: 0912345678"
                  required
                  dir="rtl"
                  inputMode="numeric"
                  maxLength={10}
                  value={value}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setValue(v);
                    updateValidity(v);
                  }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.value = t.value.replace(/[^0-9]/g, "");
                    setValue(t.value);
                    updateValidity(t.value);
                  }}
                  icon={<span className="material-symbols-outlined">smartphone</span>}
                />
              )}

              {method === "email" && (
                <TextField
                  type="email"
                  label="البريد الإلكتروني"
                  placeholder="example@domain.com"
                  required
                  dir="ltr"
                  value={value}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setValue(v);
                    updateValidity(v);
                  }}
                  onInput={(e) => updateValidity(e.currentTarget.value)}
                  icon={<span className="material-symbols-outlined">alternate_email</span>}
                />
              )}

              <div className="bg-primary-soft dark:bg-primary/10 p-2 md:p-3 rounded-md border border-slate-100 dark:border-border-dark">
                <p className="text-sm text-primary dark:text-primary leading-relaxed text-center font-medium">
                  {infoText}
                </p>
              </div>

              <div className="pt-2">
                <PrimaryButton type="submit" disabled={!isValid || isLoading}>
                  {isLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </PrimaryButton>
              </div>
            </form>

            <div className="pt-8 text-center border-t border-slate-100 dark:border-border-dark mt-8">
              <p className="text-text-muted dark:text-text-muted-dark text-base">
                ليس لديك حساب؟{" "}
                <Link href="/auth/register" className="text-primary font-bold hover:underline">
                  إنشاء حساب جديد
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </main>

      <footer className="py-10 flex flex-col items-center justify-center gap-4">
        <div className="flex gap-6 opacity-40">
          <span className="material-symbols-outlined dark:text-white">shield_with_heart</span>
          <span className="material-symbols-outlined dark:text-white">verified_user</span>
          <span className="material-symbols-outlined dark:text-white">lock</span>
        </div>
        <p className="text-xs text-text-muted dark:text-text-muted-dark">
          © 2025 محسوب - حلول مالية ذكية للتجار في السودان
        </p>
      </footer>
    </div>
  );
}
