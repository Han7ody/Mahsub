"use client";
import Image from "next/image";
import { AppleLogo, GooglePlayLogo } from "@phosphor-icons/react";
import ScrollReveal from "./ScrollReveal";

export default function DownloadSection() {
  return (
    <section className="px-6 md:px-20 py-24 bg-white dark:bg-background-dark overflow-hidden" id="download">
      <ScrollReveal>
        <div className="max-w-[1200px] mx-auto bg-[#0a0f0b] rounded-[3rem] p-10 md:p-24 flex flex-col lg:flex-row items-center gap-16 relative shadow-[0_40px_80px_-20px_rgba(34,197,94,0.2)]">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[120px] -z-10"></div>

          <div className="flex-1 flex flex-col gap-10 text-center lg:text-right">
            <h2 className="text-white text-4xl md:text-7xl font-black leading-tight">
              محسوب دايماً <br />
              <span className="text-primary">في جيبك.</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-[500px]">
              حمّل التطبيق الآن واستمتع بتجربة إدارة ديون سلسة وسريعة أينما كنت، حتى بدون إنترنت.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-5 mt-4">
              <button className="flex items-center gap-3 bg-white hover:bg-gray-100 text-black px-10 py-5 rounded-2xl transition-all hover:scale-105 shadow-xl">
                <AppleLogo size={36} weight="fill" />
                <div className="text-right flex flex-col">
                  <span className="text-[10px] font-bold uppercase opacity-60">قريباً على</span>
                  <span className="text-xl font-black leading-tight">App Store</span>
                </div>
              </button>

              <button className="flex items-center gap-3 bg-white hover:bg-gray-100 text-black px-10 py-5 rounded-2xl transition-all hover:scale-105 shadow-xl">
                <GooglePlayLogo size={36} weight="fill" />
                <div className="text-right flex flex-col">
                  <span className="text-[10px] font-bold uppercase opacity-60">قريباً على</span>
                  <span className="text-xl font-black leading-tight">Google Play</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex justify-center">
            <div className="w-[280px] md:w-[340px] aspect-[9/19] bg-slate-900 rounded-[3rem] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="size-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
                      <span className="text-3xl font-black">M</span>
                    </div>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest leading-loose">تحميل النسخة التجريبية</p>
                  </div>
               </div>
            </div>
            <div className="absolute -top-12 -right-12 size-24 bg-primary rounded-full blur-3xl opacity-50"></div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
