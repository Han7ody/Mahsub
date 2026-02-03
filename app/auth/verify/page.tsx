"use client";

import Header from "@/components/marketing/Header";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

const OTP_LENGTH = 6;
const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

function maskDestination(value: string | null, via: string | null) {
  if (!value) {
    return "+249 9X XXX XXXX";
  }

  if (via === "email" || value.includes("@")) {
    const [local = "", domain = ""] = value.split("@");
    const maskedLocal = local.length <= 1 ? `${local}***` : `${local[0]}***${local.slice(-1)}`;
    const domainParts = domain.split(".");
    const domainName = domainParts[0] ?? "";
    const maskedDomain = domainName.length <= 1 ? `${domainName}***` : `${domainName[0]}***${domainName.slice(-1)}`;
    const tld = domainParts.slice(1).join(".") || "com";
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }

  const digits = value.replace(/\D/g, "");
  if (!digits) return "+249 9X XXX XXXX";
  const lastTwo = digits.slice(-2).padStart(2, "X");
  return `+249 9X XXX XX${lastTwo}`;
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const mode = searchParams.get("mode");
  const via = searchParams.get("via");
  const destination = searchParams.get("value");
  const masked = maskDestination(destination, via);

  const isLoginFlow = mode === "login";
  const ctaLabel = isLoginFlow ? "تسجيل الدخول" : "إنشاء حساب";
  const ctaHref = isLoginFlow ? "/auth/login" : "/auth/register";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(59);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const focusInput = (index: number) => {
    const el = inputsRef.current[index];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setError("");
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDigit(index, e.currentTarget.value);
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (otp[index]) {
        updateDigit(index, "");
      } else if (index > 0) {
        focusInput(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (index: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    setOtp((prev) => {
      const next = [...prev];
      for (let i = 0; i < OTP_LENGTH - index && i < pasted.length; i++) {
        next[index + i] = pasted[i] ?? "";
      }
      return next;
    });

    const targetIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
    focusInput(targetIndex);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!otp.every(Boolean)) {
      setError("أكمل إدخال الرمز");
      const firstEmpty = otp.findIndex((d) => !d);
      if (firstEmpty >= 0) focusInput(firstEmpty);
      return;
    }
    
    const code = otp.join("");
    setIsLoading(true);
    setError("");
    
    try {
      const supabase = createBrowserClient();
      const email = destination;
      
      // Verify the 6-digit OTP code
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email || "",
        token: code,
        type: "email",
      });
      
      if (verifyError) {
        const msg = (verifyError.message || "").toLowerCase();
        if (msg.includes("expire")) {
          setError("انتهت صلاحية الرمز. أعد الإرسال ثم أدخل الرمز الجديد");
        } else if (msg.includes("invalid")) {
          setError("رمز التحقق غير صحيح. تأكد من إدخال 6 أرقام من البريد");
        } else {
          setError("تعذر التحقق من الرمز. حاول مرة أخرى");
        }
        console.error("Verify OTP error:", verifyError);
        return;
      }
      
      const user = data.user;
      if (!user) {
        setError("فشل التحقق");
        return;
      }
      
      console.log("OTP verified, user:", user.id);
      
      // If it's a registration flow, create business and member
      if (!isLoginFlow && USE_BACKEND) {
        // Get pending registration data
        const pendingData = localStorage.getItem('pendingRegistration');
        if (pendingData) {
          const { businessName, phone } = JSON.parse(pendingData);
          
          console.log("Creating business:", { businessName, phone, userId: user.id });
          
          // Create business
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .insert({
              name: businessName,
              owner_user_id: user.id,
              phone: phone,
            } as any)
            .select()
            .single() as { data: { id: string } | null; error: any };
          
          if (businessError) {
            console.error("Business creation error:", businessError);
            throw new Error(`فشل إنشاء الشركة: ${businessError.message}`);
          }
          
          if (!business) throw new Error('Failed to create business');
          
          console.log("Business created:", business);
          
          // Add user as owner
          const { error: memberError } = await supabase
            .from('business_members')
            .insert({
              business_id: business.id,
              user_id: user.id,
              role: 'owner',
              permissions: {
                customers_manage: true,
                suppliers_manage: true,
                transactions_manage: true,
                transactions_delete: true,
                workers_manage: true,
              },
              is_active: true,
            } as any);
          
          if (memberError) {
            // Non-blocking: owner can still access their business via ownership
            console.warn("Membership insert blocked by RLS, proceeding as owner via businesses.owner_user_id:", memberError);
          } else {
            console.log("Business member created successfully");
          }
          
          localStorage.removeItem('pendingRegistration');
          showToast("تم إنشاء الحساب بنجاح!", "success");
        }
      }
      
      // Navigate to dashboard
      router.push("/dashboard/customers");
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
      console.error("Verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = otp.every(Boolean);
  const infoText = via === "email" ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "تم إرسال رمز التحقق إلى رقم هاتفك";

  const handleResend = () => {
    if (secondsLeft > 0) return;
    const resend = async () => {
      setSecondsLeft(59);
      setError("");
      try {
        const supabase = createBrowserClient();
        const email = destination?.trim() || "";
        if (!email) {
          setError("بريد إلكتروني غير معروف. الرجوع للتسجيل مرة أخرى");
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          console.error("Resend OTP error:", error);
          setError("تعذر إرسال الرمز. حاول مرة أخرى بعد قليل");
          return;
        }
        showToast("تم إرسال رمز جديد إلى بريدك الإلكتروني", "success");
      } catch (err) {
        console.error("Resend OTP unexpected error:", err);
        setError("حدث خطأ غير متوقع أثناء إرسال الرمز");
      }
    };
    resend();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <Header variant="minimal" ctaLabel={ctaLabel} ctaHref={ctaHref} />

      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-12">
        <Card className="w-full max-w-[480px]">
          <div className="p-8 md:p-10 flex flex-col">
            <div className="flex flex-col items-center text-center gap-4 pb-2">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-soft dark:bg-primary/10 rounded-full">
                <span className="material-symbols-outlined text-primary text-3xl">shield_lock</span>
              </div>
              <div>
                <h1 className="text-text dark:text-text-dark tracking-tight text-2xl md:text-[32px] font-black leading-tight mb-2">
                  أدخل رمز التحقق
                </h1>
                <p className="text-text-muted dark:text-text-muted-dark text-base leading-relaxed" aria-live="polite">
                  {infoText}
                  <br />
                  <span className="font-bold text-text dark:text-text-dark" dir="ltr">
                    {masked}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center gap-2 md:gap-3" dir="ltr">
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputsRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={otp[index]}
                    onChange={handleChange(index)}
                    onKeyDown={handleKeyDown(index)}
                    onPaste={handlePaste(index)}
                    className="h-12 md:h-14 w-12 md:w-14 text-center text-2xl font-black tracking-[0.08em] rounded-md border border-slate-100 dark:border-border-dark bg-white dark:bg-background-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-150 focus:shadow-primary/30"
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center font-semibold" role="alert" aria-live="assertive">
                  {error}
                </p>
              )}

              <div className="space-y-3">
                <PrimaryButton type="submit" disabled={!isComplete || isLoading}>
                  {isLoading ? "جاري التحقق..." : "تأكيد"}
                </PrimaryButton>

                <div className="flex flex-col items-center gap-2 text-sm text-text-muted dark:text-text-muted-dark">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined text-base">timer</span>
                    <span>إعادة الإرسال خلال</span>
                    <span className="text-primary font-bold tabular-nums">
                      {secondsLeft > 0
                        ? `00:${secondsLeft.toString().padStart(2, "0")}`
                        : "جاهز"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={secondsLeft > 0}
                      className="text-primary font-semibold flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      إرسال رمز جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(isLoginFlow ? "/auth/login" : "/auth/register")}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      تعديل الرقم / البريد
                    </button>
                  </div>
                </div>
              </div>
            </form>
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

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
