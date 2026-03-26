"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { decodeJwt, resolveHashedFarmerId } from "../lib/backend";
import { siteCopy } from "../lib/site-copy";

const SiteStateContext = createContext(null);

const STORAGE_KEYS = {
  language: "agritech-language",
  theme: "agritech-theme",
  session: "agritech-session"
};

function normalizeSession(session) {
  if (!session || typeof session !== "object" || typeof session.token !== "string") {
    return null;
  }

  const payload = decodeJwt(session.token) || {};
  const farmerId = session.farmerId || payload.sub || "";
  const fullName = session.fullName || payload.name || "";
  const wallet = session.wallet || payload.wallet || "";
  const exp = typeof session.exp === "number" ? session.exp : typeof payload.exp === "number" ? payload.exp : null;

  if (exp && exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    token: session.token,
    email: typeof session.email === "string" ? session.email : "",
    farmerId,
    fullName: typeof fullName === "string" ? fullName : "",
    wallet,
    exp,
    hashedFarmerId:
      typeof session.hashedFarmerId === "string" && session.hashedFarmerId
        ? session.hashedFarmerId
        : resolveHashedFarmerId(farmerId)
  };
}

function readInitialTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function SiteStateProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("en");
  const [session, setSessionState] = useState(null);

  useEffect(() => {
    setTheme(readInitialTheme());

    const storedLanguage = window.localStorage.getItem(STORAGE_KEYS.language);

    if (storedLanguage === "en" || storedLanguage === "hi") {
      setLanguage(storedLanguage);
    }

    try {
      const storedSession = window.sessionStorage.getItem(STORAGE_KEYS.session);

      if (storedSession) {
        setSessionState(normalizeSession(JSON.parse(storedSession)));
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEYS.session);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEYS.language, language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEYS.session);
    }
  }, [session]);

  const value = useMemo(
    () => ({
      copy: siteCopy[language] || siteCopy.en,
      isAuthenticated: Boolean(session?.token),
      language,
      session,
      setSession: (nextSession) => {
        setSessionState(normalizeSession(nextSession));
      },
      clearSession: () => {
        setSessionState(null);
      },
      setLanguage,
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
      }
    }),
    [language, session, theme]
  );

  return <SiteStateContext.Provider value={value}>{children}</SiteStateContext.Provider>;
}

export function useSiteState() {
  const context = useContext(SiteStateContext);

  if (!context) {
    throw new Error("useSiteState must be used inside SiteStateProvider");
  }

  return context;
}
