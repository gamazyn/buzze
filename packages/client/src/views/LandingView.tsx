import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { usePlayerStore } from '../store/playerStore.js';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js';

/* ─── Hero wordmark inline ─────────────────────────────────────── */
function HeroWordmark() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Lightning bolt icon */}
      <svg width="72" height="72" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bzHero" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#bzHero)" />
        <path d="M24 5L13 22h10L16 35 31 17H21L29 5z" fill="white" fillOpacity="0.95" />
      </svg>
      {/* Wordmark */}
      <span
        style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(56px, 9vw, 88px)',
          letterSpacing: '-0.04em',
          color: '#f0ecff',
          lineHeight: 1,
        }}
      >
        buzze<span style={{ color: '#c084fc' }}>.io</span>
      </span>
    </div>
  );
}

/* ─── Landing ───────────────────────────────────────────────────── */
export function LandingView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSession, reset: resetGame } = useGameStore();
  const { myName, setMyName, setMyId, setBuzzerPosition } = usePlayerStore();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim() || !myName.trim()) return;
    setIsJoining(true);
    setError('');
    resetGame();
    setBuzzerPosition(null);
    socket.disconnect();
    socket.connect();
    socket.once('connect', () => {
      setMyId(socket.id ?? '');
      socket.emit('player:join', { joinCode: joinCode.toUpperCase(), playerName: myName });
    });
    socket.once('player:joined', ({ allPlayers }) => {
      const me = allPlayers.find((p) => p.id === socket.id);
      if (me) {
        setSession(joinCode.toUpperCase(), null, null, null, false);
        navigate(`/game/${joinCode.toUpperCase()}/player`);
      }
      setIsJoining(false);
    });
    socket.once('error', ({ message }) => {
      setError(message);
      setIsJoining(false);
      socket.off('player:joined');
      socket.disconnect();
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 48px',
        gap: 48,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Language switcher — top right */}
      <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 50 }}>
        <LanguageSwitcher />
      </div>

      {/* Subtle grid */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Hero section ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 18, textAlign: 'center', position: 'relative', zIndex: 1,
        }}
      >
        {/* Pill badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center',
            border: '1px solid rgba(192,132,252,0.28)',
            borderRadius: 9999,
            padding: '6px 18px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, letterSpacing: '0.18em',
            color: '#b8b0d8', textTransform: 'uppercase',
          }}
        >
          {t('landing.pill')}
        </div>

        <HeroWordmark />

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(22px, 3.5vw, 34px)',
            color: '#b8b0d8',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {t('landing.tagline')}
        </p>

        {/* Description */}
        <p
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontSize: 15, color: '#6b6390',
            maxWidth: 380, lineHeight: 1.65,
            textAlign: 'center', margin: 0,
          }}
        >
          {t('landing.description')}
        </p>
      </div>

      {/* ── Cards ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', gap: 16,
          width: '100%', maxWidth: 720,
          position: 'relative', zIndex: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Host card */}
        <div
          style={{
            flex: '1 1 300px',
            display: 'flex', flexDirection: 'column', gap: 0,
            borderRadius: 16, padding: 28,
            background: 'linear-gradient(150deg, #15122a 0%, #0d0b18 100%)',
            border: '1px solid rgba(124,58,237,0.28)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.18em', color: '#c084fc',
              textTransform: 'uppercase', margin: '0 0 14px',
            }}
          >
            → {t('landing.host_label')}
          </p>
          <h2
            style={{
              fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
              fontSize: 24, color: '#f0ecff',
              margin: '0 0 8px', letterSpacing: '-0.02em',
            }}
          >
            {t('landing.host_title')}
          </h2>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              color: '#6b6390', margin: '0 0 24px', lineHeight: 1.55,
            }}
          >
            {t('landing.host_description')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => navigate('/host')}
            >
              {t('landing.create_room')}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '10px 18px', fontSize: 14 }}
              onClick={() => navigate('/editor')}
            >
              {t('landing.quiz_editor')}
            </button>
          </div>
        </div>

        {/* Join card */}
        <div
          style={{
            flex: '1 1 300px',
            display: 'flex', flexDirection: 'column',
            borderRadius: 16, padding: 28,
            background: 'linear-gradient(150deg, #0e0c1c 0%, #080810 100%)',
            border: '1px solid rgba(192,132,252,0.16)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.18em', color: '#c084fc',
              textTransform: 'uppercase', margin: '0 0 14px',
            }}
          >
            → {t('landing.join_label')}
          </p>
          <h2
            style={{
              fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
              fontSize: 24, color: '#f0ecff',
              margin: '0 0 20px', letterSpacing: '-0.02em',
            }}
          >
            {t('landing.join_title')}
          </h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <input
              type="text"
              placeholder={t('landing.your_name')}
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              maxLength={30}
              className="editor-input"
              style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15 }}
            />
            <input
              type="text"
              placeholder={t('landing.room_code_placeholder')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="editor-input"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700, textAlign: 'center',
                fontSize: 20, letterSpacing: '0.35em',
                textTransform: 'uppercase',
              }}
            />
            {error && (
              <p style={{ color: '#ff4d6d', fontSize: 13, fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary"
              disabled={isJoining || !joinCode.trim() || !myName.trim()}
              style={{ marginTop: 'auto' }}
            >
              {isJoining ? t('landing.joining') : t('landing.join_game')}
            </button>
          </form>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex', width: '100%', maxWidth: 720,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: 28, position: 'relative', zIndex: 1,
          gap: 0, flexWrap: 'wrap',
        }}
      >
        {(
          [
            { n: '01', tk: 'feature1' },
            { n: '02', tk: 'feature2' },
            { n: '03', tk: 'feature3' },
          ] as const
        ).map(({ n, tk }, i) => (
          <div
            key={n}
            style={{
              flex: '1 1 160px',
              paddingLeft: i > 0 ? 24 : 0,
              paddingRight: i < 2 ? 24 : 0,
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              paddingBottom: 16,
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                fontWeight: 700, color: '#c084fc',
                letterSpacing: '0.12em', margin: '0 0 6px',
              }}
            >
              {n}
            </p>
            <p
              style={{
                fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
                fontSize: 14, color: '#f0ecff', margin: '0 0 4px',
              }}
            >
              {t(`landing.${tk}_title`)}
            </p>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                color: '#6b6390', margin: 0, lineHeight: 1.45,
              }}
            >
              {t(`landing.${tk}_desc`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
