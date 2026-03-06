import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/lib/loading-context";
import { ToastProvider } from "@/lib/toast-context";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import RouteLoadingHandler from "@/components/common/RouteLoadingHandler";

const cairo = Cairo({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "محسوب - إدارة ديونك وحساباتك بكل سهولة",
  description: "صُمم خصيصاً للتجار والأفراد في السودان لإدارة الديون المالية والطلبيات والتحصيل بشكل رقمي وآمن.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="light" data-scroll-behavior="smooth">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${cairo.variable} font-display bg-background-light dark:bg-background-dark text-text-main dark:text-white transition-colors duration-300 antialiased`}
      >
        <LanguageProvider>
          <AuthProvider>
            <LoadingProvider>
              <ToastProvider>
                <RouteLoadingHandler />
                {children}
              </ToastProvider>
            </LoadingProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
