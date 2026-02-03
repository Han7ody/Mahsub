import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import BackToHome from "@/components/marketing/BackToHome";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-20 text-right">
        <BackToHome />
        <h1 className="text-4xl font-black text-text-main mb-10">سياسة الخصوصية</h1>
        <div className="prose prose-lg max-w-none text-text-muted space-y-6 leading-relaxed">
          <p className="font-bold text-text-main">تاريخ التحديث: يناير 2025</p>
          <p>نحن في "محسوب" نولي أهمية قصوى لخصوصية بياناتك المالية. نوضح لك هنا كيف نحمي معلوماتك:</p>
          <h2 className="text-2xl font-bold text-text-main">1. البيانات التي نجمعها</h2>
          <p>نجمع البيانات الأساسية اللازمة لعمل التطبيق مثل رقم الهاتف، أسماء العملاء، ومبالغ الديون التي تسجلها بنفسك.</p>
          <h2 className="text-2xl font-bold text-text-main">2. كيف نستخدم بياناتك</h2>
          <p>تُستخدم بياناتك فقط لعرضها لك عبر حسابك، ولتمكين ميزة إرسال رسائل التذكير لعملائك.</p>
          <h2 className="text-2xl font-bold text-text-main">3. حماية البيانات</h2>
          <p>جميع البيانات تُشفر وتُخزن in خوادم سحابية آمنة (Supabase). لا يمكن لأي طرف ثالث الوصول لدفتر ديونك الخاص.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
