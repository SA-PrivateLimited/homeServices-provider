import {useTranslation as useI18nTranslation} from 'react-i18next';

export type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

/**
 * Translations always resolve to a string so they are safe in React Native Text.
 */
const useTranslation = () => {
  const {t: translate, i18n} = useI18nTranslation();

  const t: TranslateFn = (key, options) => {
    const value = translate(key, options as Record<string, unknown>);
    return typeof value === 'string' ? value : String(value ?? '');
  };

  return {
    t,
    i18n,
    currentLanguage: i18n.language as 'en' | 'hi',
    changeLanguage: async (language: 'en' | 'hi') => {
      await i18n.changeLanguage(language);
    },
  };
};

export default useTranslation;
