"use client";

import React, { useState, useRef, useEffect } from "react";
import SearchInput from "./SearchInput";

interface FloatingSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  triggerClassName?: string;
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export default function FloatingSearch({
  value,
  onChange,
  placeholder,
  className = "",
  triggerClassName = "",
  isVisible = false,
  onVisibilityChange,
}: FloatingSearchProps) {
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = onVisibilityChange ? isVisible : internalVisible;
  const setVisible = onVisibilityChange || setInternalVisible;

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && visible) {
        setVisible(false);
        onChange("");
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible, setVisible, onChange]);

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        visible
      ) {
        setVisible(false);
        if (!value) {
          onChange("");
        }
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [visible, value, setVisible, onChange]);

  const handleToggle = () => {
    const newVisible = !visible;
    setVisible(newVisible);
    if (newVisible) {
      setShouldAutoFocus(true);
    } else {
      onChange("");
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Trigger Button */}
      <button
        onClick={handleToggle}
        className={`size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-all ${
          visible ? "bg-primary text-white border-primary" : ""
        } ${triggerClassName}`}
      >
        <span className="material-symbols-outlined text-[20px]">
          {visible ? "close" : "search"}
        </span>
      </button>

      {/* Floating Search Overlay */}
      {visible && (
        <>
          {/* Mobile Full Screen Search */}
          <div className="md:hidden fixed inset-0 bg-white z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                <button
                  onClick={handleToggle}
                  className="size-10 rounded-2xl border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="flex-1">
                  <SearchInput
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoFocus={shouldAutoFocus}
                  />
                </div>
              </div>
              
              {/* Search Results Area */}
              <div className="flex-1 p-4">
                {value ? (
                  <div className="text-sm text-text-muted">
                    <p>البحث عن: "{value}"</p>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted">
                    <p>ابدأ بكتابة كلمة البحث</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Desktop Dropdown */}
          <div className="hidden md:block absolute top-12 right-0 z-50 w-96 animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100">
              <SearchInput
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={shouldAutoFocus}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}