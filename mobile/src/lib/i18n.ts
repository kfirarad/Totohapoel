import 'expo-sqlite/localStorage/install';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import he from '@/locales/he';
import en from '@/locales/en';

export type Lang = 'he' | 'en';
const KEY = 'lang';
const RTL: Record<Lang, boolean> = { he: true, en: false };

const saved = (() => { try { return localStorage.getItem(KEY) as Lang | null; } catch { return null; } })();
const device = getLocales()[0]?.languageCode === 'en' ? 'en' : 'he';
export const initialLang: Lang = saved ?? device;

i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: initialLang,
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
});

const applyDirection = (lang: Lang) => {
  const rtl = RTL[lang];
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
};
// Native direction only switches on restart: reload once if it doesn't match the saved language.
if (applyDirection(initialLang)) Updates.reloadAsync().catch(() => {});

/** Returns false when a manual restart is needed (dev builds can't reloadAsync). */
export const setLang = async (lang: Lang): Promise<boolean> => {
  localStorage.setItem(KEY, lang);
  await i18n.changeLanguage(lang);
  if (!applyDirection(lang)) return true;
  try { await Updates.reloadAsync(); return true; } catch { return false; }
};

export default i18n;
