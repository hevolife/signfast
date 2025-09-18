import React from 'react';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { Globe, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons' | 'compact';
  className?: string;
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  className = '',
  showLabel = true,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' },
    { code: 'en', name: t('language.english'), flag: '🇬🇧' },
    { code: 'es', name: t('language.spanish'), flag: '🇪🇸' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Globe className="h-4 w-4" />
            <span>{t('settings.language')}</span>
          </div>
        )}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                language === lang.code
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="mr-2">{lang.flag}</span>
              <span className="hidden sm:inline">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 hover:bg-white/20 transition-all"
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[150px] z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="mr-3">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Dropdown par défaut
  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>{t('settings.language')}</span>
          </div>
        </label>
      )}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};