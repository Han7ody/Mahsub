"use client";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import BackToHome from "@/components/marketing/BackToHome";
import { EnvelopeSimple, Phone, MapPin } from "@phosphor-icons/react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-right mb-10">
          <BackToHome />
        </div>
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-text-main mb-4">تواصل معنا</h1>
          <p className="text-text-muted text-lg">نحن هنا للإجابة على استفساراتك ودعم تجارتك</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="flex flex-col gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <EnvelopeSimple size={32} weight="duotone" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-text-muted">البريد الإلكتروني</p>
                <p className="font-black text-text-main">info@mahsub.com</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Phone size={32} weight="duotone" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-text-muted">رقم الهاتف</p>
                <p className="font-black text-text-main" dir="ltr">+249 9123 45678</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <MapPin size={32} weight="duotone" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-text-muted">الموقع</p>
                <p className="font-black text-text-main">الخرطوم، السودان 🇸🇩</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl">
            <form className="space-y-6 text-right" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-text-main mr-2">الاسم بالكامل</label>
                  <input type="text" placeholder="مثال: محمد أحمد" className="w-full h-14 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary font-medium" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-text-main mr-2">رقم الموبايل</label>
                  <input type="tel" placeholder="0912345678" className="w-full h-14 rounded-2xl bg-slate-50 border-none px-6 focus:ring-2 focus:ring-primary font-medium" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-text-main mr-2">الرسالة</label>
                <textarea rows={4} placeholder="كيف يمكننا مساعدتك؟" className="w-full rounded-2xl bg-slate-50 border-none p-6 focus:ring-2 focus:ring-primary font-medium"></textarea>
              </div>
              <button className="w-full h-16 bg-primary text-white text-xl font-black rounded-2xl shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all">
                إرسال الرسالة
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
