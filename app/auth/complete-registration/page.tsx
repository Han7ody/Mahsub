"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

export default function CompleteRegistrationPage() {
  const router = useRouter();

  useEffect(() => {
    const completeRegistration = async () => {
      if (!USE_BACKEND) {
        router.push("/dashboard/customers");
        return;
      }

      const supabase = createBrowserClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Check if already has business
      const { data: existingMember } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        // Already has business, go to dashboard
        router.push("/dashboard/customers");
        return;
      }

      // Get pending registration data
      const pendingData = localStorage.getItem('pendingRegistration');
      if (!pendingData) {
        // No pending data, just go to dashboard (shouldn't happen)
        router.push("/dashboard/customers");
        return;
      }

      const { businessName, phone } = JSON.parse(pendingData);

      try {
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

        if (businessError) throw businessError;
        if (!business) throw new Error('Failed to create business');

        // Add user as owner (non-blocking if RLS prevents insert)
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
          console.warn('Membership insert blocked by RLS, proceeding as owner via businesses.owner_user_id:', memberError);
        }

        // Clear pending registration
        localStorage.removeItem('pendingRegistration');

        // Redirect to dashboard
        router.push("/dashboard/customers");
      } catch (error) {
        console.error("Failed to complete registration:", error);
        // Still redirect to dashboard even if business creation fails
        router.push("/dashboard/customers");
      }
    };

    completeRegistration();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-muted dark:text-text-muted-dark">جاري إكمال التسجيل...</p>
      </div>
    </div>
  );
}
