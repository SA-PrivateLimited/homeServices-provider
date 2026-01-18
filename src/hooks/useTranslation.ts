import {useTranslation as useI18nTranslation} from 'react-i18next';

/**
 * Custom hook for translations
 * Provides easy access to translation function with type safety
 */
const useTranslation = () => {
  const {t, i18n} = useI18nTranslation();

  return {
    t: (key: string, options?: any) => t(key, options),
    currentLanguage: i18n.language as 'en' | 'hi',
    changeLanguage: async (language: 'en' | 'hi') => {
      await i18n.changeLanguage(language);
    },
  };
};

export default useTranslation;

