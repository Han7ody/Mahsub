import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import BackToHome from "@/components/marketing/BackToHome";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-20 text-right">
        <BackToHome />
        <h1 className="text-4xl font-black text-text-main mb-10">أمن البيانات في محسوب</h1>
        <div className="prose prose-lg max-w-none text-text-muted space-y-8 leading-relaxed">
          <p className="text-xl font-medium">بياناتك المالية هي أغلى ما تملك، ونحن نتعامل معها بهذا المنطق.</p>
          
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <h2 className="text-2xl font-bold text-text-main mb-4">1. تشفير البيانات (End-to-End Encryption)</h2>
            <p>جميع المعلومات التي تدخلها في التطبيق يتم تشفيرها قبل إرسالها إلى خوادمنا، مما يضمن عدم قدرة أي طرف خارجي على قراءتها.</p>
          </div>
          
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <h2 className="text-2xl font-bold text-text-main mb-4">2. النسخ الاحتياطي التلقائي</h2>
            <p>نقوم بعمل نسخ احتياطية دورية لكل بياناتك في مراكز بيانات سحابية متعددة (Cloud Clusters)، مما يضمن استعادة بياناتك فوراً في حال فقدان جهازك.</p>
          </div>
          
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <h2 className="text-2xl font-bold text-text-main mb-4">3. الخصوصية المطلقة</h2>
            <p>نحن لا نبيع ولا نشارك بياناتك مع أي شركات إعلانية أو أطراف ثالثة. دفتر ديونك هو ملكك الخاص وحدك.</p>
          </div>
          
          <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20">
            <h2 className="text-2xl font-bold text-primary mb-4">التزامنا تجاهك</h2>
            <p className="text-text-main font-medium">نلتزم في "محسوب" باستخدام أحدث تقنيات الأمان العالمية لضمان تجربة مستخدم آمنة وموثوقة تماماً لكل تاجر سوداني.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
