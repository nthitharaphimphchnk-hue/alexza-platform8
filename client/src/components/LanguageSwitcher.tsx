import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Language Switcher Component
 * Design: Monochrome metallic theme
 * - Dropdown to switch between English and Thai
 * - Persists language preference to localStorage
 */

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', label: t('common.english') || 'English' },
    { code: 'th', label: t('common.thai') || 'ไทย' },
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition flex items-center gap-2 text-gray-300 hover:text-white"
        title={t('common.language')}
      >
        <Globe size={18} />
        <span className="text-sm font-medium uppercase">{i18n.language?.startsWith('th') ? 'TH' : 'EN'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-40 bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    i18n.language === lang.code
                      ? 'bg-[#c0c0c0]/20 text-[#c0c0c0]'
                      : 'text-gray-300 hover:bg-[rgba(255,255,255,0.06)]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
