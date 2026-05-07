import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { usePlayerStore } from '../store/playerStore.js';
import { ConfirmModal } from '../components/ui/ConfirmModal.js';
import { BuzzeLogo } from '../components/ui/BuzzeLogo.js';

interface GameSummary {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

const ACCENT_PALETTE = ['#7c3aed', '#c084fc', '#f0abfc', '#ffc857', '#3ee67a', '#60a5fa', '#f97316'];

function gameAccent(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length];
}

export function HostSetupView() {
  const navigate = useNavigate();
  const { setSession, reset: resetGame } = useGameStore();
  const { setMyId } = usePlayerStore();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation();

  function loadGames() {
    fetch('/api/games')
      .then((r) => r.json())
      .then(setGames)
      .catch(() => setGames([]));
  }

  useEffect(() => { loadGames(); }, []);

  function handleHost() {
    if (!selected) return;
    setLoading(true);
    setError('');
    resetGame();
    socket.disconnect();
    socket.connect();
    socket.once('connect', () => {
      setMyId(socket.id ?? '');
      socket.emit('host:create', { gameConfigId: selected }, (res) => {
        if ('code' in res) {
          setError(res.message);
          setLoading(false);
          socket.disconnect();
          return;
        }
        setSession(res.sessionId, res.hostToken, res.tunnelUrl, res.localUrl, true);
        navigate(`/host/${res.sessionId}`, { state: { gameId: selected } });
      });
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/games/${deleteTarget.id}`, { method: 'DELETE' });
      if (selected === deleteTarget.id) setSelected(null);
      setGames((gs) => gs.filter((g) => g.id !== deleteTarget.id));
    } catch {
      setError(t('errors.generic'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07060f', display: 'flex', flexDirection: 'column' }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Top nav */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <BuzzeLogo size={20} />
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: '#c084fc', letterSpacing: '0.15em', textTransform: 'uppercase',
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(192,132,252,0.3)',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.2)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.3)';
          }}
        >
          {t('host_setup.back')}
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 10,
        maxWidth: 900, margin: '0 auto', width: '100%',
        padding: '36px 28px 140px',
      }}>
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', color: '#7c3aed', textTransform: 'uppercase', margin: '0 0 10px',
          }}>
            {t('host_setup.hosting')}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h1 style={{
              fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800,
              fontSize: 'clamp(26px, 4vw, 40px)', color: '#f0ecff',
              letterSpacing: '-0.02em', margin: 0,
            }}>
              {t('host_setup.choose_game')}
            </h1>
            {games.length > 0 && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: '#3a3558', letterSpacing: '0.08em',
              }}>
                {t('host_setup.games_count', { count: games.length })}
              </span>
            )}
          </div>
        </motion.div>

        {/* Empty state */}
        {games.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'linear-gradient(160deg, #15122a 0%, #0d0b18 100%)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 20, padding: '64px 40px', textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, color: '#3a3558', marginBottom: 16 }}>[ ]</div>
            <p style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 18, color: '#f0ecff', margin: '0 0 8px' }}>{t('host_setup.no_games_title')}</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390', margin: '0 0 28px' }}>{t('host_setup.no_games_hint')}</p>
            <button className="btn-primary" onClick={() => navigate('/editor')}>{t('host_setup.create_game')}</button>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {games.map((g, index) => {
              const isSelected = selected === g.id;
              const accent = gameAccent(g.name);
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, ease: 'easeOut' }}
                  onClick={() => setSelected(isSelected ? null : g.id)}
                  style={{
                    background: isSelected
                      ? `linear-gradient(160deg, rgba(124,58,237,0.13) 0%, #0d0b18 100%)`
                      : '#0d0b18',
                    border: `1px solid ${isSelected ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: isSelected
                      ? `0 0 0 1px rgba(124,58,237,0.2), 0 8px 40px rgba(124,58,237,0.12)`
                      : 'none',
                    borderRadius: 16,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Accent top bar */}
                  <div style={{
                    height: 3,
                    background: isSelected
                      ? `linear-gradient(90deg, ${accent}, #c084fc)`
                      : `linear-gradient(90deg, ${accent}55, transparent)`,
                    transition: 'all 0.25s ease',
                  }} />

                  <div style={{ padding: '18px 18px 20px' }}>
                    {/* Avatar + action buttons row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 13,
                        background: `linear-gradient(135deg, ${accent}1a, ${accent}35)`,
                        border: `1px solid ${accent}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Syne, system-ui, sans-serif',
                        fontWeight: 800, fontSize: 22, color: accent,
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 0 16px ${accent}30` : 'none',
                      }}>
                        {g.name[0].toUpperCase()}
                      </div>

                      {/* Icon action buttons */}
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          title={t('host_setup.edit')}
                          onClick={() => navigate(`/editor/${g.id}`)}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#6b6390', fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = 'rgba(192,132,252,0.5)';
                            el.style.color = '#c084fc';
                            el.style.background = 'rgba(124,58,237,0.1)';
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = 'rgba(255,255,255,0.08)';
                            el.style.color = '#6b6390';
                            el.style.background = 'rgba(255,255,255,0.04)';
                          }}
                        >
                          ✎
                        </button>
                        <button
                          title={t('host_setup.delete')}
                          onClick={() => setDeleteTarget(g)}
                          style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: 'rgba(255,77,109,0.06)',
                            border: '1px solid rgba(255,77,109,0.2)',
                            color: '#ff4d6d', fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.18)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.06)'; }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Game info */}
                    <div style={{
                      fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 15,
                      color: isSelected ? '#c084fc' : '#f0ecff',
                      marginBottom: g.description ? 6 : 10,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color 0.2s ease',
                    }}>
                      {g.name}
                    </div>

                    {g.description && (
                      <div style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6390',
                        marginBottom: 10,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {g.description}
                      </div>
                    )}

                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                      color: '#3a3558', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      {t('host_setup.updated', { date: new Date(g.updatedAt).toLocaleDateString() })}
                    </div>
                  </div>

                  {/* Selected checkmark badge */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        style={{
                          position: 'absolute', bottom: 14, right: 14,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: '#fff', fontWeight: 700,
                        }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {error && (
          <p style={{
            color: '#ff4d6d', textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, marginTop: 16,
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Fixed bottom CTA bar */}
      {games.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
            padding: '16px 28px 28px',
            background: 'linear-gradient(to top, #07060f 70%, transparent)',
            display: 'flex', justifyContent: 'center',
          }}
        >
          <div style={{ maxWidth: 560, width: '100%', display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 15, opacity: selected && !loading ? 1 : 0.45, transition: 'opacity 0.2s' }}
              disabled={!selected || loading}
              onClick={handleHost}
            >
              {loading ? t('host_setup.creating') : t('host_setup.create_room')}
            </button>
            <button
              className="btn-ghost"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => navigate('/editor')}
            >
              {t('host_setup.new_game')}
            </button>
          </div>
        </motion.div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('host_setup.delete_confirm_title', { name: deleteTarget?.name })}
        description={t('host_setup.delete_confirm_desc')}
        confirmLabel={deleting ? t('host_setup.deleting') : t('host_setup.delete')}
        cancelLabel={t('host_setup.cancel')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
