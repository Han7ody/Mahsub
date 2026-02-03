"use client";
import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";
import { useRouter } from "next/navigation";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(true);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const COMMON_DOMAINS = useMemo(
    () => ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "icloud.com"],
    []
  );

  const emailSuggestions = useMemo(() => {
    const value = email.trim();
    if (!value) return [];
    const atIndex = value.indexOf("@");
    if (atIndex === -1) {
      // User hasn't typed domain yet
      return COMMON_DOMAINS.map((d) => `${value}@${d}`).slice(0, 5);
    }
    const local = value.slice(0, atIndex);
    const domainPart = value.slice(atIndex + 1);
    const matches = COMMON_DOMAINS.filter((d) => d.startsWith(domainPart.toLowerCase()));
    return matches.map((d) => `${local}@${d}`).slice(0, 5);
  }, [email, COMMON_DOMAINS]);

  const updateValidity = () => {
    if (formRef.current) {
      const valid = formRef.current.checkValidity();
      console.log('Form validation:', { 
        valid, 
        businessName, 
        phone, 
        email,
        businessNameLength: businessName.length,
        phoneLength: phone.length,
        emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      });
      setIsValid(valid);
    }
  };

  useEffect(() => {
    updateValidity();
  }, [businessName, phone, email]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="auth" />
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[480px]">
          <div className="p-8 md:p-10 flex flex-col">
            <div className="text-center pb-8">
              <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-2">
                انضم إلى تجار محسوب
              </h1>
              <p className="text-text-muted dark:text-text-muted-dark text-base">
                ابدأ إدارة شؤونك المالية اليوم بكل سهولة
              </p>
            </div>

            <form
              ref={formRef}
              className="space-y-4 md:space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                console.log('Form submitted!', { isValid, isLoading, businessName, phone, email });
                
                if (!isValid || isLoading) {
                  console.log('Form validation failed or already loading');
                  return;
                }

                if (USE_BACKEND) {
                  console.log('Starting backend registration...');
                  setIsLoading(true);
                  const supabase = createBrowserClient();

                  try {
                    console.log('Sending OTP to email...');
                    
                    // Send OTP code to email
                    const { error: otpError } = await supabase.auth.signInWithOtp({
                      email: email.trim(),
                      options: {
                        shouldCreateUser: true,
                      },
                    });

                    if (otpError) throw otpError;

                    console.log('OTP sent successfully');
                    
                    // Store registration data
                    localStorage.setItem('pendingRegistration', JSON.stringify({
                      email: email.trim(),
                      businessName: businessName.trim(),
                      phone: phone.trim(),
                    }));

                    showToast("تم إرسال رمز التحقق إلى بريدك الإلكتروني", "success");
                    router.push(`/auth/verify?via=email&value=${encodeURIComponent(email.trim())}`);
                    return;

                    showToast("تم إنشاء الحساب بنجاح! تحقق من بريدك الإلكتروني", "success");
                    router.push("/dashboard/customers");
                  } catch (error: any) {
                    showToast(error.message || "فشل التسجيل", "error");
                  } finally {
                    setIsLoading(false);
                  }
                } else {
                  // Demo mode - just navigate
                  router.push("/dashboard/customers");
                }
              }}
              onChange={updateValidity}
              onInput={updateValidity}
            >
              {/* Merchant Name */}
              <TextField
                type="text"
                label="اسم التاجر"
                placeholder="أدخل اسم النشاط التجاري أو اسمك"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.currentTarget.value)}
                icon={<span className="material-symbols-outlined">person</span>}
              />

              {/* Phone Number */}
              <TextField
                type="tel"
                label="رقم الهاتف"
                placeholder="مثال: 0912345678"
                required
                dir="rtl"
                inputMode="numeric"
                minLength={10}
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.value = t.value.replace(/[^0-9]/g, "");
                  setPhone(t.value);
                }}
                icon={<span className="material-symbols-outlined">smartphone</span>}
              />

              {/* Email */}
              <div className="relative">
                <TextField
                  ref={emailInputRef}
                  type="email"
                  label="البريد الإلكتروني"
                  placeholder="example@domain.com"
                  required
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.currentTarget.value);
                    setShowEmailSuggestions(true);
                    updateValidity();
                  }}
                  onInput={() => updateValidity()}
                  onFocus={() => setShowEmailSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                  icon={<span className="material-symbols-outlined">alternate_email</span>}
                />
                {emailSuggestions.length > 0 && showEmailSuggestions && (
                  <div className="absolute z-10 mt-2 w-full rounded-md border border-slate-100 dark:border-border-dark bg-white dark:bg-background-dark shadow-card">
                    {emailSuggestions.map((s, idx) => (
                      <button
                        type="button"
                        key={`${s}-${idx}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEmail(s);
                          setShowEmailSuggestions(false);
                          updateValidity();
                        }}
                        className="w-full text-right px-3 py-2 text-sm text-text dark:text-text-dark hover:bg-background-light dark:hover:bg-border-dark transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className="bg-primary-soft dark:bg-primary/10 p-2 md:p-3 rounded-md border border-slate-100 dark:border-border-dark">
                <p className="text-sm text-primary dark:text-primary leading-relaxed text-center font-medium">
                  سيتم إرسال رمز تحقق إلى رقم الهاتف والبريد الإلكتروني
                </p>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <PrimaryButton type="submit" disabled={!isValid || isLoading}>
                  {isLoading ? "جاري التسجيل..." : "إرسال رمز التحقق"}
                </PrimaryButton>
              </div>
            </form>

            {/* Login Link */}
            <div className="pt-8 text-center border-t border-slate-100 dark:border-border-dark mt-8">
              <p className="text-text-muted dark:text-text-muted-dark text-base">
                لديك حساب؟{" "}
                <Link href="/auth/login" className="text-primary font-bold hover:underline">
                  تسجيل الدخول
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
        <p className="text-xs text-text-muted dark:text-text-muted-dark">© 2025 محسوب - حلول مالية ذكية للتجار في السودان</p>
      </footer>
    </div>
  );
}
