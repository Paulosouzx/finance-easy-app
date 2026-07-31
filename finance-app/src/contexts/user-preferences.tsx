import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, type AppTheme, type AppLanguage } from "@/services/profile";
import { THEME_OPTIONS } from "@/lib/theme-options";

export type { AppTheme, AppLanguage };

const DEFAULT_MODULES = [
  "dashboard", "transactions", "accounts",
  "credit-cards", "bills", "budgets", "goals", "categories", "reports"
];

function buildFaviconDataUri(primary: string) {
  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="512" height="512" rx="112" fill="${primary}"/>` +
    `<g transform="translate(96,96) scale(13.333)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/>` +
    `<path d="M16 10h.01"/>` +
    `<path d="M2 8v1a2 2 0 0 0 2 2h1"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function applyThemeToDOM(theme: AppTheme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  if (theme === "dark" || theme === "green-dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  const option = THEME_OPTIONS.find((o) => o.key === theme);
  if (!option) return;

  const themeColorMeta = document.getElementById("theme-color-meta");
  if (themeColorMeta) themeColorMeta.setAttribute("content", option.bg);

  const faviconLink = document.getElementById("favicon-link") as HTMLLinkElement | null;
  if (faviconLink) faviconLink.href = buildFaviconDataUri(option.primary);
}

type UserPreferencesContextType = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  enabledModules: string[];
  toggleModule: (key: string) => void;
  isModuleEnabled: (key: string) => boolean;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [theme, setThemeLocal] = useState<AppTheme>(() => {
    return (localStorage.getItem("finance-theme") as AppTheme) ?? "dark";
  });

  const [language, setLanguageLocal] = useState<AppLanguage>(() => {
    return (localStorage.getItem("finance-language") as AppLanguage) ?? "pt";
  });

  const [enabledModules, setModulesLocal] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("finance-modules");
      return stored ? JSON.parse(stored) : DEFAULT_MODULES;
    } catch {
      return DEFAULT_MODULES;
    }
  });

  useEffect(() => { applyThemeToDOM(theme); }, [theme]);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  useEffect(() => {
    if (!profile) return;
    setThemeLocal(profile.theme);
    setLanguageLocal(profile.language);
    setModulesLocal(profile.enabled_modules);
    localStorage.setItem("finance-theme", profile.theme);
    localStorage.setItem("finance-language", profile.language);
    localStorage.setItem("finance-modules", JSON.stringify(profile.enabled_modules));
    applyThemeToDOM(profile.theme);
  }, [profile]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeLocal(newTheme);
    localStorage.setItem("finance-theme", newTheme);
    applyThemeToDOM(newTheme);
    updateProfile({ theme: newTheme }).then(() => queryClient.invalidateQueries({ queryKey: ["profile"] }));
  };

  const setLanguage = (newLanguage: AppLanguage) => {
    setLanguageLocal(newLanguage);
    localStorage.setItem("finance-language", newLanguage);
    updateProfile({ language: newLanguage }).then(() => queryClient.invalidateQueries({ queryKey: ["profile"] }));
  };

  const toggleModule = (key: string) => {
    const next = enabledModules.includes(key)
      ? enabledModules.filter(m => m !== key)
      : [...enabledModules, key];
    setModulesLocal(next);
    localStorage.setItem("finance-modules", JSON.stringify(next));
    updateProfile({ enabled_modules: next }).then(() => queryClient.invalidateQueries({ queryKey: ["profile"] }));
  };

  const isModuleEnabled = (key: string) => enabledModules.includes(key);

  return (
    <UserPreferencesContext.Provider value={{ theme, setTheme, language, setLanguage, enabledModules, toggleModule, isModuleEnabled }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences must be used inside UserPreferencesProvider");
  return ctx;
}