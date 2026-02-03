"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

interface MobileProfileSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileProfileSlideOver({
  isOpen,
  onClose,
}: MobileProfileSlideOverProps) {
  const { currentBusiness, user, signOut } = useAuth();
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Slide-over panel from right */}
      <div className="fixed inset-y-0 right-0 w-80 z-50 lg:hidden">
        <div className="bg-white h-full overflow-y-auto shadow-xl">
          {/* Close button */}
          <div className="p-6">
            <button
              onClick={onClose}
              className="self-start text-text-muted hover:text-text-main transition-colors mb-4"
              title="إغلاق"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Business/User profile content (same as desktop) */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-20 rounded-full border-4 border-white shadow-lg overflow-hidden ring-2 ring-primary bg-primary-soft flex items-center justify-center">
                {currentBusiness?.logo_url ? (
                  <img
                    alt="store avatar"
                    className="w-full h-full object-cover"
                    src={currentBusiness.logo_url}
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary">
                    {currentBusiness?.name?.slice(0, 2) || 'م'}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-text-main mt-3">{currentBusiness?.name || 'متجر الخير'}</h2>
              <span className="bg-primary-soft text-primary text-[10px] font-bold px-2.5 py-1 rounded-full mt-1">
                حساب تجاري نشط
              </span>
            </div>

            <div className="space-y-3 flex-1 mb-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-medium text-text-main">{currentBusiness?.address || 'العنوان غير محدد'}</span>
                <div className="flex items-center gap-1.5 text-text-muted text-xs">
                  <span>الموقع</span>
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-medium text-text-main truncate max-w-[180px]">{user?.email || 'تحميل...'}</span>
                <div className="flex items-center gap-1.5 text-text-muted text-xs shrink-0">
                  <span>الحساب</span>
                  <span className="material-symbols-outlined text-[16px]">person</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm font-medium text-text-main">{currentBusiness?.phone || 'لا يوجد هاتف'}</span>
                <div className="flex items-center gap-1.5 text-text-muted text-xs">
                  <span>الهاتف</span>
                  <span className="material-symbols-outlined text-[16px]">phone</span>
                </div>
              </div>
            </div>

            {/* Footer actions (same as desktop) */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/dashboard/settings#business-profile"
                className="w-full bg-primary text-white font-bold py-2.5 rounded-xl shadow-md shadow-primary/20 flex items-center justify-center gap-2 hover:bg-green-600 transition"
                onClick={onClose}
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                فتح الإعدادات
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  router.push('/auth/login');
                }}
                className="w-full text-red-500 font-bold py-2 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
