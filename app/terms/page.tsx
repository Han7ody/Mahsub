import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import BackToHome from "@/components/marketing/BackToHome";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-20 text-right">
        <BackToHome />
        <h1 className="text-4xl font-black text-text-main mb-10">شروط الاستخدام</h1>
        <div className="prose prose-lg max-w-none text-text-muted space-y-6 leading-relaxed">
          <p className="font-bold text-text-main">تاريخ التحديث: يناير 2025</p>
          <p>باستخدامك لتطبيق "محسوب"، فإنك توافق على الشروط التالية:</p>
          
          <h2 className="text-2xl font-bold text-text-main">1. أهلية الاستخدام</h2>
          <p>التطبيق مخصص لمساعدة التجار والأفراد في تنظيم معاملاتهم المالية. أنت مسؤول عن دقة البيانات التي تدخلها في دفترك الرقمي.</p>
          
          <h2 className="text-2xl font-bold text-text-main">2. الحساب والأمان</h2>
          <p>أنت مسؤول عن الحفاظ على سرية معلومات دخولك وحماية هاتفك. "محسوب" يضمن لك مزامنة البيانات وتشفيرها ولكن لا يتحمل مسؤولية وصول الآخرين لهاتفك المفتوح.</p>
          
          <h2 className="text-2xl font-bold text-text-main">3. إخلاء المسؤولية</h2>
          <p>محسوب هو أداة تنظيمية فقط. نحن لا نتدخل في النزاعات المالية بينك وبين عملائك. دورنا ينتهي عند توفير السجل الرقمي وتسهيل التنبيهات.</p>
          
          <h2 className="text-2xl font-bold text-text-main">4. التعديلات</h2>
          <p>نحتفظ بالحق في تحديث هذه الشروط أو ميزات التطبيق لتحسين الخدمة، وسنقوم بإخطارك بأي تغييرات جوهرية.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
