import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru';
import kk from './kk';

const resources = {
  ru: { translation: ru },
  kk: { translation: kk },
};

i18next.use(initReactI18next).init({
  resources,
  lng: 'ru', // Default language
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18next;

export type AppLanguage = 'ru' | 'kk';

export function changeLanguage(lang: AppLanguage) {
  return i18next.changeLanguage(lang);
}

export function getCurrentLanguage(): AppLanguage {
  return (i18next.language as AppLanguage) || 'ru';
}
