import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { usePlayerStore } from '../store/playerStore.js';
import { BuzzeLogo } from '../components/ui/BuzzeLogo.js';

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-10 relative overflow-hidden">
      {/* grid background sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Logo */}
      <div className="text-center relative z-10 flex flex-col items-center gap-3">
        <BuzzeLogo size={48} />
        <p className="text-buzze-fg-dim font-body tracking-widest text-sm uppercase">{t('app.tagline')}</p>
      </div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-5 w-full max-w-2xl relative z-10">
        {/* Card: Hospedar */}
        <div
          className="flex-1 flex flex-col gap-4 rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(160deg, #15122a 0%, #0d0b18 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <div className="text-3xl mb-2">🎙️</div>
            <h2 className="font-display text-xl text-buzze-fuchsia tracking-wide mb-1">{t('landing.host_title')}</h2>
            <p className="text-buzze-fg-dim font-body text-sm">{t('landing.host_description')}</p>
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <button className="btn-primary" onClick={() => navigate('/host')}>
              {t('landing.create_room')}
            </button>
            <button className="btn-ghost text-sm" onClick={() => navigate('/editor')}>
              {t('landing.quiz_editor')}
            </button>
          </div>
        </div>

        {/* Divider mobile */}
        <div className="flex md:hidden items-center gap-3">
          <div className="flex-1 h-px bg-buzze-raised" />
          <span className="text-buzze-fg-dim font-mono text-xs">{t('landing.or')}</span>
          <div className="flex-1 h-px bg-buzze-raised" />
        </div>

        {/* Card: Entrar */}
        <div
          className="flex-1 flex flex-col gap-4 rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(160deg, #0d1a12 0%, #080f0b 100%)',
            border: '1px solid rgba(62,230,122,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div>
            <div className="text-3xl mb-2">🎮</div>
            <h2 className="font-display text-xl text-buzze-success tracking-wide mb-1">{t('landing.join_title')}</h2>
            <p className="text-buzze-fg-dim font-body text-sm">{t('landing.join_description')}</p>
          </div>
          <form onSubmit={handleJoin} className="flex flex-col gap-3 mt-auto">
            <input
              type="text"
              placeholder={t('landing.your_name')}
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              maxLength={30}
              className="editor-input font-body"
            />
            <input
              type="text"
              placeholder={t('landing.room_code')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="editor-input font-mono font-bold text-center text-xl tracking-[0.3em] uppercase"
            />
            {error && <p className="text-buzze-danger text-sm font-body">{error}</p>}
            <button
              type="submit"
              className="btn-primary mt-1"
              disabled={isJoining || !joinCode.trim() || !myName.trim()}
              style={isJoining ? undefined : {
                background: 'linear-gradient(180deg, #3ee67a 0%, #16a34a 60%, #0d7a3a 100%)',
                boxShadow: '0 2px 0 #065f46, 0 4px 12px rgba(62,230,122,0.3)',
                color: '#03260f',
              }}
            >
              {isJoining ? t('landing.joining') : t('landing.join_game')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
