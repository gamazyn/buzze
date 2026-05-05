import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { socket } from '../socket.js';
import { useGameStore } from '../store/gameStore.js';
import { useSocketEvents } from '../hooks/useSocketEvents.js';
import { BuzzeLogo } from '../components/ui/BuzzeLogo.js';

export function LobbyView() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { players, phase, hostToken, tunnelUrl, localUrl, isHost } = useGameStore();
  useSocketEvents();

  useEffect(() => {
    if (phase === 'board') {
      navigate(isHost ? `/host/${sessionId}/board` : `/game/${sessionId}/player`);
    }
  }, [phase]);

  function handleStart() {
    if (!sessionId || !hostToken) return;
    socket.emit('host:start', { sessionId, hostToken });
  }

  const joinUrl = localUrl ?? tunnelUrl;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-lg relative z-10 flex flex-col gap-5">
        {/* Logo topo */}
        <div className="flex justify-center mb-1">
          <BuzzeLogo size={22} />
        </div>

        {/* Room code hero */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(160deg, #15122a 0%, #0d0b18 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-buzze-fg-dim font-body text-xs uppercase tracking-widest mb-3">{ t('lobby.room_code') }</p>
          <div
            className="font-mono text-6xl md:text-7xl text-buzze-fuchsia tracking-[0.15em] leading-none mb-1"
            style={{ textShadow: '0 0 30px rgba(192,132,252,0.7), 0 0 60px rgba(192,132,252,0.3)' }}
          >
            {sessionId}
          </div>
          <p className="text-buzze-fg-dim font-body text-xs mt-2">{ t('lobby.qr_hint') }</p>
        </div>

        {/* QR code */}
        {sessionId && joinUrl && (
          <div
            className="rounded-2xl p-5 flex flex-col items-center gap-3"
            style={{
              background: '#0d0b18',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="bg-white rounded-xl p-3"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
            >
              <QRCodeSVG
                value={`${joinUrl}/join/${sessionId}`}
                size={148}
                bgColor="#ffffff"
                fgColor="#15122a"
              />
            </div>
            <p className="text-buzze-fg-dim font-body text-xs">{ t('lobby.wifi_hint') }</p>
            {tunnelUrl && (
              <button
                className="font-body text-sm transition-colors text-buzze-fuchsia hover:text-buzze-pink"
                onClick={() => navigator.clipboard.writeText(`${tunnelUrl}/join/${sessionId}`)}
              >
                {t('lobby.copy_remote_link')}
              </button>
            )}
          </div>
        )}

        {/* Player list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#0d0b18',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-buzze-fg-dim font-body text-xs uppercase tracking-widest">{ t('lobby.players') }</p>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: players.length > 0 ? '#c084fc' : '#3a3558' }}
            >
              {players.length}
            </span>
          </div>

          {players.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-buzze-fg-dim font-body text-sm">{ t('lobby.waiting_players') }</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {players.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-buzze-fg-dis font-mono text-xs w-4 text-right">{i + 1}</span>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: p.avatarColor,
                      boxShadow: `0 0 6px ${p.avatarColor}80`,
                    }}
                  />
                  <span className="font-body font-medium text-buzze-fg-sub flex-1">{p.name}</span>
                  {!p.isConnected && (
                    <span className="text-buzze-danger font-body text-xs">{ t('lobby.disconnected') }</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action */}
        {isHost ? (
          <button
            className="btn-primary w-full text-lg py-4"
            disabled={players.length === 0}
            onClick={handleStart}
          >
            {players.length === 0 ? t('lobby.waiting_players_btn') : t('lobby.start_game', { count: players.length })}
          </button>
        ) : (
          <div
            className="rounded-2xl px-5 py-4 text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-buzze-fg-dim font-body text-sm">{ t('lobby.waiting_start') }</p>
          </div>
        )}
      </div>
    </div>
  );
}
