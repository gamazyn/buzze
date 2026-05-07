import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { useSocketEvents } from '../hooks/useSocketEvents.js';
import { BuzzeLogo } from '../components/ui/BuzzeLogo.js';
import type { GameConfig } from '@buzze/shared';

const MAX_LOBBY_SLOTS = 8;

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, system-ui, sans-serif',
        fontWeight: 800, fontSize: 14, color: '#fff',
        flexShrink: 0,
        boxShadow: `0 0 8px ${color}80`,
      }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

/* ─── CopyButton ──────────────────────────────────────────── */
function CopyButton({ text, label, labelDone }: { text: string; label: string; labelDone: string }) {
  const [done, setDone] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    });
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: done ? 'rgba(62,230,122,0.15)' : 'rgba(124,58,237,0.2)',
        color: done ? '#3ee67a' : '#c084fc',
        flexShrink: 0, transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {done ? labelDone : label}
    </button>
  );
}

/* ─── LobbyView ───────────────────────────────────────────── */
export function LobbyView() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { state } = useLocation() as { state?: { gameId?: string } };
  const navigate = useNavigate();
  const { players, phase, hostToken, tunnelUrl, localUrl, isHost } = useGameStore();
  const [gameConfig, setGameConfig] = useState<Omit<GameConfig, 'finalChallengeAnswer'> | null>(null);
  useSocketEvents();

  useEffect(() => {
    if (state?.gameId) {
      fetch(`/api/games/${state.gameId}`)
        .then((r) => r.json())
        .then(setGameConfig)
        .catch(() => {});
    }
  }, [state?.gameId]);

  useEffect(() => {
    if (phase === 'board') {
      navigate(isHost ? `/host/${sessionId}/board` : `/game/${sessionId}/player`);
    }
  }, [phase]);

  function handleStart() {
    if (!sessionId || !hostToken) return;
    socket.emit('host:start', { sessionId, hostToken });
  }

  function handleLeave() {
    socket.disconnect();
    navigate('/');
  }

  const joinBase = localUrl ?? tunnelUrl ?? '';
  const joinUrl = joinBase ? `${joinBase}/join/${sessionId}` : '';
  const tunnelJoinUrl = tunnelUrl ? `${tunnelUrl}/join/${sessionId}` : '';
  const questionCount = gameConfig?.categories.reduce((s, c) => s + c.questions.length, 0) ?? 0;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: 12,
          background: 'rgba(13,11,24,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 40,
        }}
      >
        <BuzzeLogo size={20} />

        <div style={{ flex: 1 }} />

        {/* Room code badge */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '4px 12px',
            fontFamily: 'DM Sans, sans-serif', fontSize: 12,
          }}
        >
          <span style={{ color: '#6b6390', fontWeight: 500 }}>{t('lobby.room_code_label')}</span>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            color: '#c084fc', letterSpacing: '0.1em',
          }}>
            {sessionId}
          </span>
        </div>

        {/* Live indicator */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '4px 12px',
          }}
        >
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#3ee67a',
            boxShadow: '0 0 6px #3ee67a',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#f0ecff' }}>
            {t('lobby.live')}
          </span>
        </div>

        {/* Leave */}
        <button
          onClick={handleLeave}
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
            padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: '#b8b0d8', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {t('lobby.leave')}
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-6 lg:p-8 max-w-[1100px] w-full mx-auto items-start"
      >
        {/* ── Left column ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status + heading */}
          <div>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.18em', color: '#6b6390',
              textTransform: 'uppercase', margin: '0 0 10px',
            }}>
              {t('lobby.status')}
            </p>
            <h1 style={{
              fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              color: '#f0ecff', letterSpacing: '-0.02em',
              margin: '0 0 8px',
            }}>
              {t('lobby.invite_title')}
            </h1>
            <p style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              color: '#6b6390', margin: 0,
            }}>
              {t('lobby.invite_subtitle')}
            </p>
          </div>

          {/* QR card */}
          <div
            style={{
              borderRadius: 16, padding: 20,
              background: '#0d0b18',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              display: 'flex', gap: 24, alignItems: 'flex-start',
            }}
          >
            {/* QR block */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                background: '#fff', borderRadius: 12, padding: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                <QRCodeSVG
                  value={joinUrl || `buzze.io/join/${sessionId}`}
                  size={128}
                  bgColor="#ffffff"
                  fgColor="#15122a"
                />
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                fontWeight: 700, letterSpacing: '0.2em',
                color: '#6b6390', textTransform: 'uppercase',
              }}>
                {t('lobby.scan')}
              </span>
            </div>

            {/* Info block */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Room code */}
              <div>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.18em', color: '#6b6390',
                  textTransform: 'uppercase', margin: '0 0 4px',
                }}>
                  {t('lobby.room_code_label')}
                </p>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                  fontSize: 'clamp(32px, 4vw, 48px)',
                  color: '#c084fc', letterSpacing: '0.1em', lineHeight: 1,
                  textShadow: '0 0 24px rgba(192,132,252,0.6)',
                }}>
                  {sessionId}
                </span>
              </div>

              {/* Local link */}
              {localUrl && (
                <div>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.14em', color: '#6b6390',
                    textTransform: 'uppercase', margin: '0 0 6px',
                  }}>
                    {t('lobby.wifi_label')}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      flex: 1, background: '#15122a', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '6px 10px',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      color: '#b8b0d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {joinUrl.replace(/^https?:\/\//, '')}
                    </div>
                    <CopyButton text={joinUrl} label={t('lobby.copy')} labelDone={t('lobby.copied')} />
                  </div>
                </div>
              )}

              {/* Tunnel link */}
              {tunnelUrl && (
                <div>
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.14em', color: '#6b6390',
                    textTransform: 'uppercase', margin: '0 0 6px',
                  }}>
                    {t('lobby.tunnel_label')}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      flex: 1, background: '#15122a', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6, padding: '6px 10px',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      color: '#b8b0d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tunnelJoinUrl.replace(/^https?:\/\//, '')}
                    </div>
                    <CopyButton text={tunnelJoinUrl} label={t('lobby.copy')} labelDone={t('lobby.copied')} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Game info card */}
          {gameConfig && (
            <div
              style={{
                borderRadius: 16, padding: '18px 20px',
                background: '#0d0b18',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.18em', color: '#6b6390',
                textTransform: 'uppercase', margin: '0 0 8px',
              }}>
                {t('lobby.selected_game')}
              </p>
              <p style={{
                fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 600,
                fontSize: 18, color: '#f0ecff', margin: '0 0 12px',
              }}>
                {gameConfig.name}
              </p>
              {/* Category tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {gameConfig.categories.map((cat) => (
                  <span
                    key={cat.id}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '3px 9px', borderRadius: 6,
                      background: 'rgba(124,58,237,0.15)',
                      border: '1px solid rgba(124,58,237,0.25)',
                      color: '#b8b0d8',
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
              {/* Stats line */}
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                color: '#6b6390', margin: 0,
              }}>
                {gameConfig.categories.length} {t('lobby.selected_game').toLowerCase().includes('jog') ? 'categorias' : 'categories'}
                {' · '}
                {questionCount} {questionCount === 1 ? 'questão' : 'questões'}
                {gameConfig.finalChallengeEnabled && ` · ${t('lobby.final_challenge_label')}`}
                {' · '}{t('lobby.timer_label', { sec: gameConfig.defaultTimer })}
              </p>
            </div>
          )}

          {/* Start / waiting */}
          {isHost ? (
            <button
              className="btn-primary"
              style={{ width: '100%', fontSize: 16, padding: '14px 24px' }}
              disabled={players.length === 0}
              onClick={handleStart}
            >
              {players.length === 0 ? t('lobby.waiting_players_btn') : t('lobby.start_game')}
            </button>
          ) : (
            <div
              style={{
                borderRadius: 12, padding: '16px 20px', textAlign: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#6b6390', margin: 0 }}>
                {t('lobby.waiting_start')}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column — players ────────────────────────── */}
        <div
          style={{
            borderRadius: 16, overflow: 'hidden',
            background: '#0d0b18',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.15em', color: '#6b6390', textTransform: 'uppercase',
            }}>
              {t('lobby.players_label')}
              <span style={{ color: '#c084fc', marginLeft: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                · {players.length}
              </span>
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: '#3a3558',
            }}>
              {t('lobby.max_players', { max: MAX_LOBBY_SLOTS })}
            </span>
          </div>

          {/* Player rows */}
          <div>
            {players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <Avatar name={p.name} color={p.avatarColor} />
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                  fontSize: 15, color: '#f0ecff', flex: 1,
                }}>
                  {p.name}
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  fontWeight: 700, letterSpacing: '0.12em',
                  color: p.isConnected ? '#3ee67a' : '#ff4d6d',
                  textTransform: 'uppercase',
                }}>
                  {p.isConnected ? t('lobby.ready') : t('lobby.disconnected')}
                </span>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: p.isConnected ? '#3ee67a' : '#3a3558',
                  boxShadow: p.isConnected ? '0 0 6px #3ee67a80' : 'none',
                }} />
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, Math.min(2, MAX_LOBBY_SLOTS - players.length)) }).map((_, i) => (
              <div
                key={`slot-${i}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  animation: `waitingPulse 2s ease-in-out ${i * 0.4}s infinite`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: '1px dashed rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  letterSpacing: '0.12em', color: '#3a3558',
                  textTransform: 'uppercase',
                }}>
                  {t('lobby.waiting_slot')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes waitingPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
