"use client";

import { useState, useCallback } from "react";

export type HermesLang = "en" | "fr";

const COOKIE_KEY = "hermes_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(): HermesLang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  const val = match?.split("=")[1];
  return val === "en" || val === "fr" ? val : null;
}

function writeCookie(lang: HermesLang) {
  document.cookie = `${COOKIE_KEY}=${lang}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function useLangPreference() {
  const [lang, setLangState] = useState<HermesLang | null>(() => readCookie());

  const setLang = useCallback((value: HermesLang) => {
    writeCookie(value);
    setLangState(value);
  }, []);

  const clearLang = useCallback(() => {
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
    setLangState(null);
  }, []);

  return { lang, setLang, clearLang, hasPref: lang !== null };
}
