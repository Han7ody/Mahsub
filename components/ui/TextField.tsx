import React from "react";

interface TextFieldProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  required?: boolean;
  dir?: "rtl" | "ltr";
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url";
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      type = "text",
      placeholder,
      value,
      onChange,
      onInput,
      onFocus,
      onBlur,
      required,
      dir = "ltr",
      inputMode,
      maxLength,
      minLength,
      pattern,
      autoComplete,
      icon,
      label,
      className = "",
    },
    ref
  ) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-text dark:text-text-dark text-base font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={type}
            dir={dir}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onInput={onInput}
            onFocus={onFocus}
            onBlur={onBlur}
            required={required}
            inputMode={inputMode}
            maxLength={maxLength}
            minLength={minLength}
            pattern={pattern}
            autoComplete={autoComplete}
            className={`w-full rounded-md text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary border border-slate-100 dark:border-border-dark bg-white dark:bg-background-dark h-12 md:h-14 placeholder:text-text-muted px-4 ${icon ? "pr-12 pl-4" : ""} text-base ${className}`}
          />
          {icon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

TextField.displayName = "TextField";
