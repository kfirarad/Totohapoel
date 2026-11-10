import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import heCommon from "@/locales/he/common.json";
import heGlossary from "@/locales/he/glossary.json";
import enCommon from "@/locales/en/common.json";
import enGlossary from "@/locales/en/glossary.json";
import heGroups from "@/locales/he/groups.json";
import enGroups from "@/locales/en/groups.json";
import { DEFAULT_MARKET, getMarket } from "@/markets/registry";

// Bundled, no HTTP backend: every locale ships with the app
export const resources = {
  he: { common: heCommon, glossary: heGlossary, groups: heGroups },
  en: { common: enCommon, glossary: enGlossary, groups: enGroups },
} as const;

export type Language = keyof typeof resources;
export const LANGUAGES = Object.keys(resources) as Language[];
export const isLanguage = (lng: unknown): lng is Language => typeof lng === "string" && lng in resources;

const RTL_LANGUAGES = new Set(["he", "ar"]);
export const dirOf = (lng: string): "rtl" | "ltr" => (RTL_LANGUAGES.has(lng.split("-")[0]) ? "rtl" : "ltr");

// ponytail: per-device choice until profiles carry a locale (then: profile -> group -> market default)
const STORAGE_KEY = "lang";

const readStoredLanguage = (): Language | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
};

const marketDefault = getMarket(DEFAULT_MARKET).defaultLocale;
const DEFAULT_LANGUAGE: Language = isLanguage(marketDefault) ? marketDefault : "en";

/** <html lang dir> and the tab title follow the active language */
const applyToDocument = (lng: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lng;
  document.documentElement.dir = dirOf(lng);
  document.title = i18n.t("app.name");
};

i18n.on("languageChanged", applyToDocument);

i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLanguage() ?? DEFAULT_LANGUAGE,
  fallbackLng: "en",
  supportedLngs: LANGUAGES,
  ns: ["common", "glossary", "groups"],
  defaultNS: "common",
  // React escapes output already
  interpolation: { escapeValue: false },
  initAsync: false,
});

/** The device's explicit choice, if any (kept until the profile has one) */
export const storedLanguage = readStoredLanguage;

/**
 * Language precedence: the user's own choice (profile, then this device), then the group's, then
 * the group's market default. Returns the language to show.
 */
export const resolveLanguage = (opts: { profile?: string | null; group?: string | null; market?: string | null }): Language => {
  for (const lng of [opts.profile, readStoredLanguage(), opts.group, opts.market]) {
    if (isLanguage(lng)) return lng;
  }
  return DEFAULT_LANGUAGE;
};

/** Switch the UI language and remember it on this device */
export const setLanguage = (lng: Language) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // storage unavailable (private mode / quota): the choice lasts for this visit only
  }
  return i18n.changeLanguage(lng);
};

export default i18n;
