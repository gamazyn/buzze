import { useTranslation } from 'react-i18next';
import { setLanguage, SUPPORTED } from '../../i18n/index.js';

const LABELS: Record<string, string> = {
  'pt-BR': 'PT',
  en:      'EN',
  es:      'ES',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 2,
        background: 'rgba(13,11,24,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 3,
        backdropFilter: 'blur(8px)',
      }}
    >
      {SUPPORTED.map((code) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '4px 10px',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.12s',
            background: i18n.language === code ? 'rgba(124,58,237,0.35)' : 'transparent',
            color:      i18n.language === code ? '#c084fc' : '#6b6390',
          }}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
