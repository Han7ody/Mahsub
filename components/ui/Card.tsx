import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-surface-dark rounded-lg shadow-card border border-slate-100 dark:border-border-dark overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
