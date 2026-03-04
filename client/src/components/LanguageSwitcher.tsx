import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALEXZA_LANG_STORAGE_KEY = 'alexza_lang';

/**
 * Language labels for the switcher dropdown.
 * Static labels ensure readable display regardless of current language.
 */
const LANG_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh-CN', label: '中文(简体)' },
  { code: 'zh-TW', label: '中文(繁體)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português(BR)' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
];

/**
 * Language Switcher Component
 * Design: Monochrome metallic theme (dark/tech)
 * - Dropdown to switch between 12 languages
 * - Persists language preference to localStorage under "alexza_lang"
 * - No page refresh required on change
 */
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel =
    LANG_OPTIONS.find((l) => l.code === i18n.language || i18n.language?.startsWith(l.code + '-'))
      ?.label ?? LANG_OPTIONS[0].label;

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ALEXZA_LANG_STORAGE_KEY, langCode);
    }
    setIsOpen(false);
    // Sanity debug: confirm language change triggers UI update
    if (import.meta.env.DEV) {
      console.log('[i18n] language:', i18n.language);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition flex items-center gap-2 text-gray-300 hover:text-white"
        title={t('common.language')}
      >
        <Globe size={18} />
        <span className="text-sm font-medium max-w-[4rem] truncate">{currentLabel}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-44 max-h-72 overflow-y-auto bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2">
              {LANG_OPTIONS.map((lang) => {
                const isActive =
                  i18n.language === lang.code || i18n.language?.startsWith(lang.code + '-');
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-[#c0c0c0]/20 text-[#c0c0c0]'
                        : 'text-gray-300 hover:bg-[rgba(255,255,255,0.06)]'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
