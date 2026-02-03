"use client";

import React, { useState, useRef, useEffect } from "react";
import SearchInput from "./SearchInput";

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export default function MobileSearchBar({
  value,
  onChange,
  placeholder,
  className = "",
}: MobileSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

  // Auto-expand if there's a search value
  useEffect(() => {
    if (value && !isExpanded) {
      setIsExpanded(true);
    }
  }, [value, isExpanded]);

  const handleExpand = () => {
    setIsExpanded(true);
    setShouldAutoFocus(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onChange("");
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (!newValue) {
      setIsExpanded(false);
    }
  };

  return (
    <div className={`${className}`}>
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleCollapse}
            className="size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
          <div className="flex-1">
            <SearchInput
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              autoFocus={shouldAutoFocus}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}