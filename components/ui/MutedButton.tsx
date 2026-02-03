import React from "react";

interface MutedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function MutedButton({
  children,
  onClick,
  type = "button",
  className = "",
}: MutedButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-md h-12 md:h-14 px-5 bg-background-light dark:bg-surface-dark-2 text-text dark:text-text-dark text-lg font-bold hover:bg-bg-muted dark:hover:bg-border-dark transition-all ${className}`}
    >
      {children}
    </button>
  );
}
