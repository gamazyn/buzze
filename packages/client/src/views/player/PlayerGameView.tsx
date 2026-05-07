import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socket } from '../../socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { useSocketEvents } from '../../hooks/useSocketEvents.js';
import { GameBoard } from '../../components/board/GameBoard.js';
import { BuzzeLogo } from '../../components/ui/BuzzeLogo.js';
import { useTranslation } from 'react-i18next';

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: color, color: '#07060f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, system-ui, sans-serif',
        fontWeight: 800, fontSize: Math.round(size * 0.43),
        flexShrink: 0,
        boxShadow: `0 0 8px ${color}80`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function PlayerGameView() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    gameConfig, players, phase, activeQuestion, timer,
    myWagerSent, finalClue, finalMedia,
    setMyWagerSent, doublePlayerId, doublePlayerName, doubleWager,
    challengeState, reset: resetGame,
  } = useGameStore();
  const { myId, myName, buzzerPosition, setBuzzerPosition } = usePlayerStore();
  const [wagerAmount, setWagerAmount] = useState('');
  const [wagerAnswer, setWagerAnswer] = useState('');
  const [wagerStep, setWagerStep] = useState<'bet' | 'answer'>('bet');
  const [doubleWagerInput, setDoubleWagerInput] = useState('');
  const [doubleWagerSent, setDoubleWagerSent] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);

  const audioCallbackRef = useCallback((el: HTMLAudioElement | null) => {
    if (el !== null) audioRef.current = el;
  }, []);
  const autoPlayCallbackRef = useCallback((el: HTMLAudioElement | null) => {
    if (el !== null) {
      audioRef.current = el;
      el.play().catch(() => {});
    }
  }, []);

  useSocketEvents();

  useEffect(() => {
    function unlock() {
      if (audioUnlocked.current) return;
      audioUnlocked.current = true;
      const silent = new Audio();
      silent.play().catch(() => {});
    }
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('click', unlock);
    };
  }, []);

  useEffect(() => {
    function handleAudioSync({ action, currentTime }: { action: 'play' | 'pause' | 'seek'; currentTime: number }) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = currentTime;
      if (action === 'play') el.play().catch(() => {});
      else if (action === 'pause') el.pause();
    }
    socket.on('audio:sync', handleAudioSync);
    return () => { socket.off('audio:sync', handleAudioSync); };
  }, []);

  const myPlayer = players.find((p) => p.id === myId);
  const myScore = myPlayer?.score ?? 0;
  const myColor = myPlayer?.avatarColor ?? '#7c3aed';

  function buzz() {
    if (!sessionId || !myId) return;
    socket.emit('player:buzz', { sessionId, playerId: myId });
  }

  function submitWager(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !myId) return;
    const amount = Math.max(0, parseInt(wagerAmount) || 0);
    socket.emit('player:finalWager', { sessionId, playerId: myId, amount, answer: wagerAnswer });
    setMyWagerSent();
  }

  function submitDoubleWager(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !myId) return;
    const amount = Math.max(0, parseInt(doubleWagerInput) || 0);
    socket.emit('player:doubleWager', { sessionId, playerId: myId, amount });
    setDoubleWagerSent(true);
  }

  if (!gameConfig) {
    const myAvatarColor = players.find((p) => p.id === myId)?.avatarColor ?? '#7c3aed';
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#07060f', position: 'relative', overflow: 'hidden' }}>
        {/* grid bg */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* sticky header */}
        <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(13,11,24,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
          <BuzzeLogo size={18} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ee67a', boxShadow: '0 0 6px #3ee67a', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#f0ecff' }}>{t('lobby.live')}</span>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 20, position: 'relative', zIndex: 1 }}>

          {/* Player identity card */}
          <div style={{ borderRadius: 16, padding: 24, textAlign: 'center', background: 'linear-gradient(160deg, #15122a 0%, #0d0b18 100%)', border: '1px solid rgba(124,58,237,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 340, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Avatar name={myName} color={myAvatarColor} size={64} />
            </div>
            <p style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700, fontSize: 20, color: '#f0ecff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{myName}</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6b6390', margin: '0 0 20px' }}>
              {t('player.waiting_host')}
            </p>
            {/* room code */}
            <div style={{ borderRadius: 10, padding: '10px 16px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6b6390' }}>{t('lobby.room_code_label')}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 22, color: '#c084fc', letterSpacing: '0.12em', textShadow: '0 0 16px rgba(192,132,252,0.5)' }}>{sessionId}</span>
            </div>
          </div>

          {/* Players in room */}
          {players.length > 0 && (
            <div style={{ borderRadius: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.07)', maxWidth: 340, width: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6b6390' }}>
                  {t('player.players_in_room', { count: players.length })}
                </span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {players.map((p) => (
                  <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Avatar name={p.name} color={p.avatarColor} size={30} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#f0ecff', flex: 1 }}>{p.name}</span>
                    {p.id === myId && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#c084fc' }}>{t('player.you')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  const isDoubleAndNotAssigned = activeQuestion?.question.type === 'double' && doublePlayerId && doublePlayerId !== myId;
  const isQuestionPhase = phase === 'question' || phase === 'all_play' || phase === 'buzzer_queue';
  const canBuzz = isQuestionPhase && !buzzerPosition && !isDoubleAndNotAssigned;

  const activeCategory = activeQuestion
    ? gameConfig.categories.find((c) => c.id === activeQuestion.categoryId)
    : null;

  // ── Full-screen overlays for special phases ──────────────────────
  if (phase === 'double_wager' && activeQuestion) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16, background: '#07060f', overflow: 'auto' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>🎯</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 28, color: '#7c3aed', margin: 0 }}>{t('player.double_wager_title')}</h2>
        <div
          style={{
            borderRadius: 14, padding: '12px 16px',
            background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)',
            width: '100%', maxWidth: 360,
          }}
        >
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6b6390', letterSpacing: '0.15em', marginBottom: 4 }}>{t('player.value_label')}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 700, color: '#c084fc' }}>${activeQuestion.question.value}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3a3558', marginTop: 3 }}>
            máx: ${Math.max(myScore, activeQuestion.question.value).toLocaleString('pt-BR')}
          </div>
        </div>

        {doublePlayerId === myId ? (
          !doubleWagerSent ? (
            <form onSubmit={submitDoubleWager} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6b6390', letterSpacing: '0.15em' }}>{t('player.wager_input_label')}</div>
              <input
                type="number" min={0}
                max={Math.max(myScore, activeQuestion.question.value)}
                value={doubleWagerInput}
                onChange={(e) => setDoubleWagerInput(e.target.value)}
                style={{
                  background: '#0d0b18', border: '1px solid rgba(192,132,252,0.4)',
                  borderRadius: 10, padding: '12px 16px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700,
                  color: '#c084fc', textAlign: 'center', outline: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
                placeholder="0"
                autoFocus
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '14px', fontFamily: 'Syne, sans-serif',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >
                {t('player.confirm_wager')} →
              </button>
            </form>
          ) : (
            <div style={{ borderRadius: 14, padding: 20, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', maxWidth: 360, width: '100%' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.2em', color: '#c084fc' }}>{t('player.wager_sent_title')}</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6b6390', marginTop: 6 }}>{t('player.waiting_host_reveal')}</div>
            </div>
          )
        ) : doublePlayerId ? (
          <div style={{ textAlign: 'center', color: '#b8b0d8' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: '#f0ecff', margin: '0 0 6px' }}>{doublePlayerName}</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390', animation: 'pulse 2s ease-in-out infinite', margin: 0 }}>{t('player.other_wagering')}</p>
          </div>
        ) : (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390' }}>{t('player.waiting_assign')}</p>
        )}
      </div>
    );
  }

  if (phase === 'final_challenge') {
    const maxBet = Math.max(myScore, 0);
    const betAmt = parseInt(wagerAmount) || 0;
    const betValid = betAmt >= 0 && betAmt <= maxBet;
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#07060f' }}>

        {/* Header — identical to question view */}
        <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(13,11,24,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40, flexShrink: 0 }}>
          <BuzzeLogo size={18} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ee67a', boxShadow: '0 0 6px #3ee67a', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#f0ecff', letterSpacing: '0.12em' }}>{t('lobby.live')}</span>
          </div>
        </header>

        {/* Body — same padding/gap as question view */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '10px 16px 28px', gap: 10 }}>

          {/* Score card — identical to question view */}
          <div style={{ borderRadius: 12, padding: '10px 14px', background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={myName} color={myColor} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#f0ecff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{gameConfig.name}</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: myScore < 0 ? '#ff4d6d' : '#c084fc', textShadow: myScore >= 0 ? '0 0 12px rgba(192,132,252,0.5)' : undefined }}>
              {myScore < 0 ? '-' : ''}${Math.abs(myScore).toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Clue card — same style as question clue card */}
          <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c084fc', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
              ◆ {t('player.final_title')} · {wagerStep === 'bet' ? t('player.confirm_wager') : t('player.your_answer')}
            </div>
            {finalMedia && (
              finalMedia.type === 'audio'
                ? <audio src={`/media/${gameConfig.id}/${finalMedia.filename}`} autoPlay controls style={{ width: '100%', marginBottom: 8 }} />
                : <img src={`/media/${gameConfig.id}/${finalMedia.filename}`} alt="" style={{ width: '100%', maxHeight: 'clamp(200px, 45vh, 560px)', objectFit: 'contain', borderRadius: 10, marginBottom: 8 }} />
            )}
            {finalClue && (
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 17, lineHeight: 1.3, color: '#f0ecff' }}>
                {finalClue}
              </div>
            )}
          </div>

          {/* Interaction area */}
          {!myWagerSent ? (
            wagerStep === 'bet' ? (
              /* Step 1 — wager */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.15em', marginBottom: 10, textTransform: 'uppercase' }}>
                    {t('player.confirm_wager')} · <span style={{ color: '#c084fc' }}>{t('player.max_wager', { value: maxBet.toLocaleString('en-US') })}</span>
                  </div>
                  <input
                    type="number" min={0} max={maxBet}
                    value={wagerAmount} onChange={(e) => setWagerAmount(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#15122a', border: `1px solid ${!betValid && wagerAmount !== '' ? 'rgba(255,77,109,0.5)' : 'rgba(192,132,252,0.3)'}`, borderRadius: 10, padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700, color: '#c084fc', textAlign: 'center', outline: 'none', caretColor: '#c084fc' }}
                    placeholder="0"
                  />
                  {!betValid && wagerAmount !== '' && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#ff4d6d', margin: '6px 0 0', textAlign: 'center' }}>{t('player.max_wager', { value: maxBet.toLocaleString('en-US') })}</p>
                  )}
                </div>
                <button onClick={() => setWagerStep('answer')} disabled={!betValid} className="btn-primary" style={{ padding: '14px', fontSize: 15, opacity: betValid ? 1 : 0.4 }}>
                  {t('player.confirm_wager')} →
                </button>
              </div>
            ) : (
              /* Step 2 — answer */
              <form onSubmit={submitWager} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{t('player.your_answer')}</div>
                    <button type="button" onClick={() => setWagerStep('bet')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                      ← ${betAmt.toLocaleString('en-US')}
                    </button>
                  </div>
                  <input
                    type="text" value={wagerAnswer} onChange={(e) => setWagerAnswer(e.target.value)}
                    maxLength={500} placeholder={t('player.answer_placeholder')} autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', background: '#15122a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 16, color: '#f0ecff', outline: 'none', caretColor: '#c084fc' }}
                  />
                </div>
                <button type="submit" disabled={!wagerAnswer.trim()} className="btn-primary" style={{ padding: '14px', fontSize: 15, opacity: wagerAnswer.trim() ? 1 : 0.4 }}>
                  {t('player.send_answer')} →
                </button>
              </form>
            )
          ) : (
            /* Sent */
            <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3ee67a', letterSpacing: '0.18em', marginBottom: 6 }}>{t('player.wager_sent')}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3a3558', letterSpacing: '0.14em', animation: 'pulse 2s ease-in-out infinite' }}>{t('player.waiting_host_reveal')}</div>
            </div>
          )}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  if (phase === 'final_reveal') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#07060f' }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(13,11,24,0.9)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40, flexShrink: 0 }}>
          <BuzzeLogo size={18} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ee67a', boxShadow: '0 0 6px #3ee67a', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#f0ecff', letterSpacing: '0.12em' }}>{t('lobby.live')}</span>
          </div>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '10px 16px 28px', gap: 10 }}>
          <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c084fc', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>◆ {t('player.final_reveal_title')}</div>
            {finalClue && <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 17, lineHeight: 1.3, color: '#f0ecff' }}>{finalClue}</div>}
          </div>
          <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3a3558', letterSpacing: '0.14em', animation: 'pulse 2s ease-in-out infinite' }}>{t('player.host_revealing')}</div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  if (phase === 'game_over') {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 14, background: '#07060f', overflow: 'auto' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 32, color: '#c084fc', textShadow: '0 0 30px rgba(192,132,252,0.6)', margin: 0, letterSpacing: '-0.03em' }}>
          {t('player.game_over')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 380 }}>
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const isFirst = i === 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 10,
                  background: isFirst ? 'rgba(124,58,237,0.12)' : '#0d0b18',
                  border: isFirst ? '1px solid rgba(192,132,252,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isFirst ? '0 0 20px -8px rgba(192,132,252,0.5)' : 'none',
                }}
              >
                <span style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{medals[i] ?? `#${i + 1}`}</span>
                <Avatar name={p.name} color={p.avatarColor} size={30} />
                <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: isFirst ? '#c084fc' : '#b8b0d8' }}>{p.name}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13, color: p.score < 0 ? '#ff4d6d' : isFirst ? '#c084fc' : '#f0ecff' }}>
                  {p.score < 0 ? '-' : ''}${Math.abs(p.score).toLocaleString('pt-BR')}
                </span>
              </motion.div>
            );
          })}
        </div>
        <button
          style={{
            marginTop: 8, background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
            padding: '10px 20px', fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 600, color: '#b8b0d8', cursor: 'pointer',
          }}
          onClick={() => { socket.disconnect(); resetGame(); setBuzzerPosition(null); navigate('/'); }}
        >
          {t('player.back_menu')}
        </button>
      </div>
    );
  }

  // ── Main scrollable layout ───────────────────────────────────────
  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#07060f' }}>

      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 18px', flexShrink: 0,
          background: 'rgba(13,11,24,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 40,
        }}
      >
        <BuzzeLogo size={18} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '3px 8px',
            }}
          >
            <div
              style={{
                width: 6, height: 6, borderRadius: '50%', background: '#3ee67a',
                boxShadow: '0 0 6px #3ee67a', animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: '#f0ecff', letterSpacing: '0.12em' }}>
              {t('lobby.live')}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          padding: '10px 16px 28px', gap: 10,
        }}
      >

        {/* Score card */}
        <div
          style={{
            borderRadius: 12, padding: '10px 14px',
            background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Avatar name={myName} color={myColor} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#f0ecff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {myName}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {gameConfig.name}
            </div>
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700,
              color: myScore < 0 ? '#ff4d6d' : '#c084fc',
              textShadow: myScore >= 0 ? '0 0 12px rgba(192,132,252,0.5)' : undefined,
            }}
          >
            {myScore < 0 ? '-' : ''}${Math.abs(myScore).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* ── BOARD (idle) ── */}
        {(phase === 'board') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3a3558', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t('player.board_readonly')}
            </div>
            <GameBoard
              categories={gameConfig.categories}
              gameId={gameConfig.id}
              activeQuestionId={activeQuestion?.questionId}
            />
            <div
              style={{
                borderRadius: 10, padding: 12,
                background: '#0d0b18', border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: '#3a3558', letterSpacing: '0.18em',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                {t('player.waiting_next_question')}
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTION PHASES (buzzer) ── */}
        {isQuestionPhase && activeQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

            {/* Challenge notification */}
            {challengeState?.challengedId === myId && (
              <div style={{ borderRadius: 10, padding: '10px 14px', background: 'rgba(255,200,87,0.12)', border: '1px solid rgba(255,200,87,0.3)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#ffc857' }}>
                {t('player.challenged_by', { name: challengeState.challengerName })}
              </div>
            )}

            {/* Clue card */}
            <div
              style={{
                borderRadius: 12, padding: 14,
                background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#c084fc', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>
                {activeCategory?.name} · ${activeQuestion.question.value}
                {phase === 'all_play' && <span style={{ marginLeft: 8, color: '#ffc857' }}>· {t('player.all_play')}</span>}
              </div>

              {activeQuestion.question.media && (
                <img
                  src={`/media/${gameConfig.id}/${activeQuestion.question.media.filename}`}
                  alt=""
                  style={{ maxHeight: 'clamp(200px, 45vh, 560px)', objectFit: 'contain', borderRadius: 10, marginBottom: 8, width: '100%' }}
                />
              )}

              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 17, lineHeight: 1.3, color: '#f0ecff' }}>
                {activeQuestion.question.clue}
              </div>

              {/* Audio sync indicator */}
              {activeQuestion.question.clueAudio && (
                <>
                  <audio
                    key={activeQuestion.question.clueAudio.filename}
                    ref={autoPlayCallbackRef}
                    src={`/media/${gameConfig.id}/${activeQuestion.question.clueAudio.filename}`}
                  />
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginTop: 10, padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0, color: '#fff' }}>▶</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '42%', height: '100%', background: '#7c3aed', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#6b6390', marginTop: 2 }}>{t('player.audio_sync')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Buzzer button */}
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 200, padding: '16px 0' }}>
              {!isDoubleAndNotAssigned && (
                <motion.button
                  whileTap={canBuzz ? { y: 6 } : {}}
                  onClick={canBuzz ? buzz : undefined}
                  disabled={!!buzzerPosition}
                  style={{
                    width: 'min(60vw, 190px)', height: 'min(60vw, 190px)',
                    borderRadius: '50%', border: 'none', cursor: canBuzz ? 'pointer' : 'default',
                    fontFamily: 'Syne, sans-serif', fontWeight: 800,
                    fontSize: 'clamp(18px, 5vw, 28px)', letterSpacing: '0.06em',
                    color: '#fff',
                    background: buzzerPosition === 1
                      ? 'radial-gradient(circle at 35% 25%, color-mix(in oklab, #3ee67a 90%, white), #3ee67a 55%, color-mix(in oklab, #3ee67a 55%, black))'
                      : buzzerPosition
                        ? 'radial-gradient(circle at 35% 25%, #1e1a38, #15122a)'
                        : 'radial-gradient(circle at 35% 25%, color-mix(in oklab, #7c3aed 90%, white), #7c3aed 55%, color-mix(in oklab, #7c3aed 55%, black))',
                    boxShadow: buzzerPosition === 1
                      ? '0 14px 0 color-mix(in oklab, #3ee67a 45%, black), 0 20px 60px -10px #3ee67a, inset 0 2px 0 rgba(255,255,255,0.3)'
                      : buzzerPosition
                        ? '0 6px 0 rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.05)'
                        : '0 14px 0 color-mix(in oklab, #7c3aed 45%, black), 0 20px 60px -10px #7c3aed, inset 0 2px 0 rgba(255,255,255,0.3)',
                  }}
                >
                  {buzzerPosition === 1
                    ? t('player.your_turn')
                    : buzzerPosition
                      ? `#${buzzerPosition}`
                      : t('player.buzz')}
                </motion.button>
              )}
            </div>

            {/* Status bar */}
            <div
              style={{
                borderRadius: 10, padding: '10px 14px',
                background: '#0d0b18', border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              {!buzzerPosition && (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#c084fc', letterSpacing: '0.18em', animation: 'pulse 2s ease-in-out infinite' }}>
                  {t('player.buzzer_open')}
                </div>
              )}
              {buzzerPosition && buzzerPosition > 1 && (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#b8b0d8', letterSpacing: '0.14em' }}>
                  {t('player.buzzer_position', { pos: buzzerPosition })}
                </div>
              )}
              {buzzerPosition === 1 && (
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3ee67a', letterSpacing: '0.18em' }}>
                  {t('player.your_turn')} — {t('player.respond')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANSWER REVEAL ── */}
        {phase === 'answer_reveal' && activeQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

            {/* Clue + audio indicator */}
            <div style={{ borderRadius: 12, padding: 14, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#6b6390', letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>
                {t('player.clue_label')} · {activeCategory?.name} · ${activeQuestion.question.value}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#b8b0d8', fontStyle: 'italic', lineHeight: 1.4 }}>
                {activeQuestion.question.clue}
              </div>
              {/* Answer audio indicator */}
              {(activeQuestion.question.answerAudio || activeQuestion.question.clueAudio) && (
                <>
                  {activeQuestion.question.clueAudio && !activeQuestion.question.answerAudio && (
                    <audio key={activeQuestion.question.clueAudio.filename} ref={audioCallbackRef} src={`/media/${gameConfig.id}/${activeQuestion.question.clueAudio.filename}`} />
                  )}
                  {activeQuestion.question.answerAudio && (
                    <audio key={activeQuestion.question.answerAudio.filename} ref={autoPlayCallbackRef} src={`/media/${gameConfig.id}/${activeQuestion.question.answerAudio.filename}`} />
                  )}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginTop: 10, padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(62,230,122,0.08)',
                      border: '1px solid rgba(62,230,122,0.25)',
                    }}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3ee67a', color: '#041a14', display: 'grid', placeItems: 'center', fontSize: 10, flexShrink: 0 }}>▶</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '58%', height: '100%', background: '#3ee67a', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#6b6390', marginTop: 2 }}>{t('player.audio_answer')}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Answer card */}
            <div
              style={{
                borderRadius: 12, padding: 16,
                background: 'color-mix(in oklab, #3ee67a 8%, #0d0b18)',
                border: '1px solid #3ee67a',
              }}
            >
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#3ee67a', marginBottom: 6 }}>{t('player.correct_answer')}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#f0ecff', lineHeight: 1.2 }}>
                {activeQuestion.question.answer}
              </div>
            </div>

            {/* Answer media */}
            {activeQuestion.question.answerMedia && (
              <img
                src={`/media/${gameConfig.id}/${activeQuestion.question.answerMedia.filename}`}
                alt=""
                style={{ maxHeight: 'clamp(220px, 48vh, 600px)', objectFit: 'contain', borderRadius: 12, border: '1px solid rgba(62,230,122,0.3)', width: '100%' }}
              />
            )}

            {/* Waiting */}
            <div style={{ borderRadius: 10, padding: 10, background: '#0d0b18', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3a3558', letterSpacing: '0.14em' }}>
                {t('player.waiting_host_continue')}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
