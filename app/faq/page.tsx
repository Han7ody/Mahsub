import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import BackToHome from "@/components/marketing/BackToHome";

export default function FAQPage() {
  const faqs = [
    {
      q: "هل تطبيق محسوب مجاني؟",
      a: "نعم، النسخة الأساسية من محسوب مجانية تماماً للتجار والأفراد."
    },
    {
      q: "ماذا يحدث لو فقدت هاتفي؟",
      a: "بياناتك محفوظة سحابياً. بمجرد تسجيل الدخول من هاتف جديد، ستجد كل سجلاتك كما هي."
    },
    {
      q: "هل يمكنني إرسال تذكيرات عبر الواتساب؟",
      a: "نعم، يوفر محسوب ميزة إرسال تذكير احترافي للعميل بضغطة زر واحدة."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-20 text-right">
        <BackToHome />
        <h1 className="text-4xl font-black text-text-main text-center mb-4">الأسئلة الشائعة</h1>
        <p className="text-text-muted text-center mb-16">كل ما تود معرفته عن منصة محسوب</p>
        
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-text-main mb-4">{faq.q}</h3>
              <p className="text-text-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
