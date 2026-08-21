import * as React from "react";
import {
  clearSession,
  get,
  getStoredUser,
  getToken,
  post,
  setSession,
  setUnauthorizedHandler,
} from "@/lib/api";

/* ------------------------------- Theme -------------------------------- */

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const THEME_KEY = "cms-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme) || "system",
  );
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/* ------------------------------ Settings ------------------------------ */

export interface SiteSettings {
  siteTitle: string;
  logoUrl: string;
  logoSmallUrl: string;
  faviconUrl: string;
  authLogoUrl: string;
}

const FALLBACK_SETTINGS: SiteSettings = {
  siteTitle: "CMS",
  logoUrl: "/branding/netpro-logo.png",
  logoSmallUrl: "/branding/netpro-mark.png",
  faviconUrl: "/branding/netpro-favicon.ico",
  authLogoUrl: "/branding/netpro-logo.png",
};

interface SettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<SiteSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await get<{ success: boolean; data: SiteSettings }>(
        "/api/v1/settings",
      );
      if (res?.data) setSettings(res.data);
    } catch {
      // Branding must never block the app - keep the fallback.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep the document title and favicon in sync with the CMS settings.
  React.useEffect(() => {
    document.title = settings.siteTitle;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

/* -------------------------------- Auth -------------------------------- */

export interface AuthUser {
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(() => getStoredUser());
  const [ready, setReady] = React.useState(false);

  // A stored token may be expired; verify it once on boot. The response also
  // carries the user, so a valid token still signs in even when the cached
  // user record is missing or unreadable.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getToken()) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const res = await get<{ success: boolean; user: AuthUser }>(
          "/api/v1/auth/verify",
        );
        if (!cancelled && res?.user) {
          setUser(res.user);
          localStorage.setItem("user", JSON.stringify(res.user));
        }
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = React.useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  React.useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await post<{ success: boolean; token: string; user: AuthUser }>(
      "/api/v1/auth/login",
      { email, password },
      { allowUnauthorized: true },
    );
    setSession(res.token, res.user);
    setUser(res.user ?? null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
