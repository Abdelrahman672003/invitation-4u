import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  LOCALES,
  PASSWORD_MIN_LENGTH,
  directionFor,
  type Locale,
} from '@invite/shared';
import ar from './locales/ar.json';
import en from './locales/en.json';

const STORAGE_KEY = 'daawa.locale';

function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Preference only; ignore unavailable storage.
  }
}

function applyDocumentLocale(locale: string) {
  const resolved = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
  document.documentElement.lang = resolved;
  document.documentElement.dir = directionFor(resolved);
}

void i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: readStoredLocale() ?? DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  interpolation: { escapeValue: false, defaultVariables: { min: PASSWORD_MIN_LENGTH } },
});

applyDocumentLocale(i18n.language);
i18n.on('languageChanged', applyDocumentLocale);

export function currentLocale(): Locale {
  return (LOCALES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Locale)
    : DEFAULT_LOCALE;
}

export default i18n;
