"use client";

import React, { useState, useRef, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  compact?: boolean;
  autoFocus?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
  compact = false,
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-muted">
        <span className="material-symbols-outlined text-[20px]">search</span>
      </span>
      <input
        ref={inputRef}
        className={`w-full bg-slate-50 border border-slate-100 rounded-full pr-11 text-sm focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all placeholder:text-text-muted focus:scale-[1.02] transform ${
          compact ? "py-2 pl-3" : "py-2.5 pl-4"
        }`}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}