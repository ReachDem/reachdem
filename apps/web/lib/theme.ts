export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME = "system";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<Theme, "system">;

const systemThemeMediaQuery = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(systemThemeMediaQuery).matches ? "dark" : "light";
}

export function resolveTheme(
  theme: Theme,
  enableSystem: boolean
): ResolvedTheme {
  if (theme === "system" && enableSystem) {
    return getSystemTheme();
  }

  return theme === "dark" ? "dark" : "light";
}

export function applyThemeToDocument({
  resolvedTheme,
  attribute = "class",
  enableColorScheme = true,
}: {
  resolvedTheme: ResolvedTheme;
  attribute?: string;
  enableColorScheme?: boolean;
}) {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }
}

export function getThemeScript({
  attribute = "class",
  defaultTheme = DEFAULT_THEME,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = THEME_STORAGE_KEY,
}: {
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
}) {
  return `(function(){try{var attribute=${JSON.stringify(attribute)};var defaultTheme=${JSON.stringify(defaultTheme)};var enableSystem=${JSON.stringify(enableSystem)};var enableColorScheme=${JSON.stringify(enableColorScheme)};var storageKey=${JSON.stringify(storageKey)};var root=document.documentElement;var storedTheme=localStorage.getItem(storageKey);var theme=storedTheme==="light"||storedTheme==="dark"||storedTheme==="system"?storedTheme:defaultTheme;var resolvedTheme=theme==="system"&&enableSystem&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":theme==="dark"?"dark":"light";if(attribute==="class"){root.classList.remove("light","dark");root.classList.add(resolvedTheme);}else{root.setAttribute(attribute,resolvedTheme);}if(enableColorScheme){root.style.colorScheme=resolvedTheme;}}catch(error){}})();`;
}
