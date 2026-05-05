import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { usePlayerStore } from '../store/playerStore.js';
import { BuzzeLogo } from '../components/ui/BuzzeLogo.js';

export function JoinView() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { setSession, reset: resetGame } = useGameStore();
  const { myName, setMyName, setMyId, setBuzzerPosition } = usePlayerStore();
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!myName.trim() || !sessionId) return;
    setIsJoining(true);
    setError('');

    resetGame();
    setBuzzerPosition(null);
    socket.disconnect();
    socket.connect();

    socket.once('connect', () => {
      setMyId(socket.id ?? '');
      socket.emit('player:join', { joinCode: sessionId.toUpperCase(), playerName: myName });
    });

    socket.once('player:joined', ({ allPlayers }) => {
      const me = allPlayers.find((p) => p.id === socket.id);
      if (me) {
        setSession(sessionId.toUpperCase(), null, null, null, false);
        navigate(`/game/${sessionId.toUpperCase()}/player`);
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center flex flex-col items-center gap-3">
        <BuzzeLogo size={36} />
        <p className="text-buzze-fg-dim font-body text-sm">{ t('join.room') }</p>
        <p className="text-3xl font-mono font-bold tracking-widest text-buzze-fuchsia">{sessionId?.toUpperCase()}</p>
      </div>

      <div className="card w-full max-w-sm">
        <h2 className="font-display text-xl text-buzze-fuchsia mb-4">{ t('join.enter_room') }</h2>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder={t('join.your_name')}
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            maxLength={30}
            autoFocus
            className="editor-input"
          />
          {error && <p className="text-buzze-danger text-sm font-body">{error}</p>}
          <button
            type="submit"
            className="btn-primary"
            disabled={isJoining || !myName.trim()}
          >
            {isJoining ? t('join.joining') : t('join.join')}
          </button>
        </form>
      </div>

      <button className="btn-ghost text-sm" onClick={() => navigate('/')}>
        {t('join.back')}
      </button>
    </div>
  );
}
