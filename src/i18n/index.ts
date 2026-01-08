import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enSettings from './locales/en/settings.json';
import enJobs from './locales/en/jobs.json';
import enJobCards from './locales/en/jobCards.json';
import enProfile from './locales/en/profile.json';
import enErrors from './locales/en/errors.json';
import enMessages from './locales/en/messages.json';
import enNotifications from './locales/en/notifications.json';
import enHelp from './locales/en/help.json';

// Hindi translations
import hiCommon from './locales/hi/common.json';
import hiAuth from './locales/hi/auth.json';
import hiSettings from './locales/hi/settings.json';
import hiJobs from './locales/hi/jobs.json';
import hiJobCards from './locales/hi/jobCards.json';
import hiProfile from './locales/hi/profile.json';
import hiErrors from './locales/hi/errors.json';
import hiMessages from './locales/hi/messages.json';
import hiNotifications from './locales/hi/notifications.json';
import hiHelp from './locales/hi/help.json';

// Merge all translations
const en = {
  common: enCommon,
  auth: enAuth,
  settings: enSettings,
  jobs: enJobs,
  jobCards: enJobCards,
  profile: enProfile,
  errors: enErrors,
  messages: enMessages,
  notifications: enNotifications,
  help: enHelp,
};

const hi = {
  common: hiCommon,
  auth: hiAuth,
  settings: hiSettings,
  jobs: hiJobs,
  jobCards: hiJobCards,
  profile: hiProfile,
  errors: hiErrors,
  messages: hiMessages,
  notifications: hiNotifications,
  help: hiHelp,
};

const LANGUAGE_KEY = '@app_language';

// Language detection
const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return stored || 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n synchronously first, then update language from storage
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: {translation: en},
      hi: {translation: hi},
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Load stored language after initialization
getStoredLanguage().then(language => {
  i18n.changeLanguage(language);
});

// Change language
export const changeLanguage = async (language: 'en' | 'hi') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

export default i18n;
