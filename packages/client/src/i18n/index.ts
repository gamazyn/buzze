import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

const SUPPORTED = ['pt-BR', 'en', 'es'] as const;
type SupportedLng = (typeof SUPPORTED)[number];

function detectLng(): SupportedLng {
  // 1. localStorage persistido pelo switcher
  const stored = localStorage.getItem('buzze_lang');
  if (stored && SUPPORTED.includes(stored as SupportedLng)) return stored as SupportedLng;

  // 2. argumento Electron --app-locale
  const electronArg = (window as Window & { __APP_LOCALE__?: string }).__APP_LOCALE__;
  if (electronArg) {
    if (electronArg.startsWith('pt')) return 'pt-BR';
    if (electronArg.startsWith('es')) return 'es';
    if (electronArg.startsWith('en')) return 'en';
  }

  // 3. navigator.languages
  for (const lang of navigator.languages ?? [navigator.language]) {
    if (!lang) continue;
    if (lang.startsWith('pt')) return 'pt-BR';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('en')) return 'en';
  }

  return 'pt-BR';
}

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en:      { translation: en },
    es:      { translation: es },
  },
  lng:          detectLng(),
  fallbackLng:  'pt-BR',
  interpolation: { escapeValue: false },
  initAsync: false,
});

export function setLanguage(lng: SupportedLng) {
  localStorage.setItem('buzze_lang', lng);
  i18n.changeLanguage(lng);
}

export { SUPPORTED };
export default i18n;
