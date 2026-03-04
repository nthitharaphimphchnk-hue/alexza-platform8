/**
 * i18n (i18next) configuration for ALEXZA client.
 *
 * QA checklist (for PR/commit):
 * - [ ] Switching language updates UI instantly
 * - [ ] Reload preserves language (alexza_lang in localStorage)
 * - [ ] Missing keys fall back to EN
 * - [ ] Build passes
 *
 * To add more languages:
 * 1. Create client/src/i18n/locales/{code}.json (copy from en.json as placeholder)
 * 2. Import and add to resources in this file
 * 3. Add code to supportedLngs
 * 4. Add { code, label } to LANG_OPTIONS in LanguageSwitcher.tsx
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import th from './locales/th.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import vi from './locales/vi.json';
import id from './locales/id.json';
import de from './locales/de.json';
import fr from './locales/fr.json';

const ALEXZA_LANG_STORAGE_KEY = 'alexza_lang';

// Migrate legacy i18nextLng to alexza_lang before init (so detector picks it up)
if (typeof window !== 'undefined') {
  const legacyLang = window.localStorage?.getItem('i18nextLng');
  if (legacyLang) {
    window.localStorage.setItem(ALEXZA_LANG_STORAGE_KEY, legacyLang);
    window.localStorage.removeItem('i18nextLng');
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      ja: { translation: ja },
      ko: { translation: ko },
      es: { translation: es },
      'pt-BR': { translation: ptBR },
      vi: { translation: vi },
      id: { translation: id },
      de: { translation: de },
      fr: { translation: fr },
    },
    supportedLngs: ['en', 'th', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'pt-BR', 'vi', 'id', 'de', 'fr'],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: ALEXZA_LANG_STORAGE_KEY,
    },
    react: {
      bindI18n: 'languageChanged',
      useSuspense: false,
    },
  });

export default i18n;
