export default function UnderDevelopmentBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] border-t border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-background-dark/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1200px] px-4 py-2 text-center text-xs md:text-sm font-bold text-text-main dark:text-white">
        الموقع تحت التطوير حالياً — بعض الميزات (التسجيل/تسجيل الدخول) غير متاحة.
      </div>
    </div>
  );
}
