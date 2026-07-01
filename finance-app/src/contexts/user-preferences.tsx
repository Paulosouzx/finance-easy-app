import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useGetUsersMe, usePatchUsersMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetUsersMeQueryKey } from "@workspace/api-client-react";

export type AppTheme = "light" | "dark" | "green-light" | "green-dark";

const DEFAULT_MODULES = [
  "dashboard", "transactions", "accounts",
  "credit-cards", "bills", "budgets", "goals", "categories", "reports"
];

function applyThemeToDOM(theme: AppTheme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  if (theme === "dark" || theme === "green-dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

type UserPreferencesContextType = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  enabledModules: string[];
  toggleModule: (key: string) => void;
  isModuleEnabled: (key: string) => boolean;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [theme, setThemeLocal] = useState<AppTheme>(() => {
    const stored = localStorage.getItem("finance-theme") as AppTheme | null;
    return stored ?? "dark";
  });

  const [enabledModules, setModulesLocal] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("finance-modules");
      return stored ? JSON.parse(stored) : DEFAULT_MODULES;
    } catch {
      return DEFAULT_MODULES;
    }
  });

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const { data: prefs } = useGetUsersMe();
  const { mutate: patch } = usePatchUsersMe();

  useEffect(() => {
    if (!prefs) return;
    const t = (prefs.theme as AppTheme) ?? "dark";
    const m = (prefs.enabledModules as string[]) ?? DEFAULT_MODULES;
    setThemeLocal(t);
    setModulesLocal(m);
    localStorage.setItem("finance-theme", t);
    localStorage.setItem("finance-modules", JSON.stringify(m));
    applyThemeToDOM(t);
  }, [prefs]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeLocal(newTheme);
    localStorage.setItem("finance-theme", newTheme);
    applyThemeToDOM(newTheme);
    patch({ data: { theme: newTheme } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUsersMeQueryKey() }),
    });
  };

  const toggleModule = (key: string) => {
    const next = enabledModules.includes(key)
      ? enabledModules.filter(m => m !== key)
      : [...enabledModules, key];
    setModulesLocal(next);
    localStorage.setItem("finance-modules", JSON.stringify(next));
    patch({ data: { enabledModules: next } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetUsersMeQueryKey() }),
    });
  };

  const isModuleEnabled = (key: string) => enabledModules?.includes(key) ?? false;

  return (
    <UserPreferencesContext.Provider value={{ theme, setTheme, enabledModules, toggleModule, isModuleEnabled }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences must be used inside UserPreferencesProvider");
  return ctx;
}