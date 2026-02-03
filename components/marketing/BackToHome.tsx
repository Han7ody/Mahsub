"use client";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

export default function BackToHome() {
  return (
    <Link 
      href="/" 
      className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all mb-8 group"
    >
      <ArrowRight size={20} weight="bold" />
      <span>العودة للرئيسية</span>
    </Link>
  );
}
