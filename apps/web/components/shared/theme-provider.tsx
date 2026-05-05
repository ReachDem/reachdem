"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  getSystemTheme,
  isTheme,
  resolveTheme,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

type ThemeProviderProps = {
  attribute?: string;
  children: ReactNode;
  defaultTheme?: Theme;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  forcedTheme?: Theme;
  storageKey?: string;
};

type ThemeContextValue = {
  forcedTheme?: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (value: Theme | ((currentTheme: Theme) => Theme)) => void;
  systemTheme: ResolvedTheme;
  theme: Theme;
  themes: Theme[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(defaultTheme: Theme, storageKey: string): Theme {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    return isTheme(storedTheme) ? storedTheme : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function ThemeProvider({
  attribute = "class",
  children,
  defaultTheme = DEFAULT_THEME,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialTheme(defaultTheme, storageKey)
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return getSystemTheme();
  });

  const activeTheme = forcedTheme ?? theme;
  const resolvedTheme = useMemo(
    () =>
      activeTheme === "system" && enableSystem
        ? systemTheme
        : resolveTheme(activeTheme, enableSystem),
    [activeTheme, enableSystem, systemTheme]
  );

  useEffect(() => {
    if (!enableSystem) {
      setSystemTheme("light");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, [enableSystem]);

  useEffect(() => {
    applyThemeToDocument({
      resolvedTheme,
      attribute,
      enableColorScheme,
    });
  }, [attribute, enableColorScheme, resolvedTheme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme);
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [defaultTheme, storageKey]);

  const setTheme = useCallback(
    (value: Theme | ((currentTheme: Theme) => Theme)) => {
      if (forcedTheme) {
        return;
      }

      setThemeState((currentTheme) => {
        const nextTheme =
          typeof value === "function" ? value(currentTheme) : value;

        try {
          window.localStorage.setItem(storageKey, nextTheme);
        } catch {}

        return nextTheme;
      });
    },
    [forcedTheme, storageKey]
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      theme: activeTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [
      activeTheme,
      enableSystem,
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
