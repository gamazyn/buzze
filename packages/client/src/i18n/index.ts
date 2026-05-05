import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en:      { translation: en },
      es:      { translation: es },
    },
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es'],
    // Mapeia variantes regionais para os idiomas suportados
    // ex: en-US → en, pt-PT → pt-BR, es-MX → es
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      // Para o Electron: lê --app-locale passado pelo main process
      convertDetectedLanguage: (lng: string) => {
        if (lng.startsWith('pt')) return 'pt-BR';
        if (lng.startsWith('es')) return 'es';
        if (lng.startsWith('en')) return 'en';
        return lng;
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
