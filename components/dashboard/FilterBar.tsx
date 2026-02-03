"use client";
// @ts-nocheck - Next.js TS plugin incorrectly flags client component function props

import { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row gap-3 mb-6">{children}</div>;
}

export function FilterSegmented({
  options,
  value,
  onChangeAction = () => {},
}: {
  options: { label: string; value: string }[];
  value: string;
  onChangeAction?: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChangeAction(option.value)}
          className={`flex-1 px-4 py-2 rounded-md transition-colors ${
            value === option.value
              ? "bg-white shadow-sm text-primary font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterSelect({
  options,
  value,
  onChangeAction = () => {},
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChangeAction?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChangeAction(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
