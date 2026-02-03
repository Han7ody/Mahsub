"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ar, en, Dictionary } from "./dictionaries";

type Language = "ar" | "en";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Dictionary) => string;
    dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("ar");

    // Load language from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("app_language");
        if (stored === "en" || stored === "ar") {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("app_language", lang);
        // User requested NOT to flip direction. Keeping layout RTL.
        // document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
    };

    // Update document direction on mount/change
    useEffect(() => {
        // document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = language;
    }, [language]);

    const t = (key: keyof Dictionary) => {
        const dict = language === "ar" ? ar : en;
        return dict[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === "ar" ? "rtl" : "ltr" }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
