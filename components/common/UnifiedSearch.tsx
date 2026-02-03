"use client";

import React, { useState, useRef, useEffect } from "react";
import SearchInput from "./SearchInput";

interface UnifiedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  expandedWidth?: string;
}

export default function UnifiedSearch({
  value,
  onChange,
  placeholder,
  className = "",
  expandedWidth = "flex-1",
}: UnifiedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand if there's a search value
  useEffect(() => {
    if (value && !isExpanded) {
      setIsExpanded(true);
    }
  }, [value, isExpanded]);

  // Handle clicks outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !value
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded, value]);

  const handleExpand = () => {
    setIsExpanded(true);
    setShouldAutoFocus(true);
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (!newValue) {
      setIsExpanded(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
      ) : (
        <div className={`${expandedWidth} transition-all duration-300 ease-out`}>
          <SearchInput
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            autoFocus={shouldAutoFocus}
            compact
          />
        </div>
      )}
    </div>
  );
}