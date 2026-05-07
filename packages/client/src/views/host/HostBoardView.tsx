import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { socket } from '../../socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { useSocketEvents } from '../../hooks/useSocketEvents.js';
import { GameBoard } from '../../components/board/GameBoard.js';
import { Scoreboard } from '../../components/scores/Scoreboard.js';
import { ConfirmModal } from '../../components/ui/ConfirmModal.js';
import { BuzzeLogo } from '../../components/ui/BuzzeLogo.js';
import { QuestionTimer } from '../../components/question/QuestionTimer.js';

// ─── Timer circle ────────────────────────────────────────────────────────────
function TimerCircle({ remainingMs, totalMs, isPaused }: { remainingMs: number; totalMs: number; isPaused: boolean }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const frac = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  const offset = circ * (1 - frac);
  const secs = Math.ceil(remainingMs / 1000);
  const color = isPaused ? '#6b6390' : frac > 0.4 ? '#c084fc' : frac > 0.2 ? '#ffc857' : '#ff4d6d';
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#6b6390' }}>TIMER</span>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={36} cy={36} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          style={{ transition: isPaused ? 'none' : 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
        />
        <text x={36} y={41} textAnchor="middle" fill={color}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700 }}>
          {secs}
        </text>
      </svg>
    </div>
  );
}

// ─── Custom Audio Player ──────────────────────────────────────────────────────
function AudioPlayer({
  src, audioRef, onPlay, onPause, onSeeked,
}: {
  src: string;
  audioRef: (el: HTMLAudioElement | null) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
}) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const combinedRef = useCallback((el: HTMLAudioElement | null) => {
    elRef.current = el;
    audioRef(el);
  }, [audioRef]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className="w-full rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <audio
        ref={combinedRef}
        src={src}
        onPlay={() => { setPlaying(true); onPlay(); }}
        onPause={() => { setPlaying(false); onPause(); }}
        onSeeked={onSeeked}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
      />
      {/* Play/Pause */}
      <button
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{ background: 'rgba(124,58,237,0.8)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.8)'; }}
        onClick={() => { elRef.current?.paused ? elRef.current.play() : elRef.current?.pause(); }}
      >
        {playing
          ? <span style={{ color: '#fff', fontSize: 12 }}>❚❚</span>
          : <span style={{ color: '#fff', fontSize: 13, paddingLeft: 2 }}>▶</span>}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Labels */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#6b6390' }}>ÁUDIO DA DICA</span>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3558' }}>HOST SYNC</span>
        </div>
        {/* Progress bar */}
        <div
          className="relative w-full h-1 rounded-full cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={(e) => {
            if (!elRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            elRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: '#7c3aed' }} />
        </div>
        {/* Time */}
        <span className="font-mono text-[10px]" style={{ color: '#6b6390' }}>
          {fmt(current)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Player Avatar (small) ────────────────────────────────────────────────────
function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-display font-bold"
      style={{ width: size, height: size, background: color, color: '#07060f', fontSize: Math.round(size * 0.43), lineHeight: 1, boxShadow: `0 0 8px ${color}55` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HostBoardView() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    gameConfig, players, phase, activeQuestion,
    buzzerQueue, timer, hostToken,
    finalClue, finalCorrectAnswer, wagersSubmitted, hostWagers, revealedWagers,
    doublePlayerId, doublePlayerName, challengeState,
    reset: resetGame,
  } = useGameStore();
  useSocketEvents();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [autoReveal, setAutoReveal] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCallbackRef = useCallback((el: HTMLAudioElement | null) => {
    if (el !== null) audioRef.current = el;
  }, []);

  function emitAudio(action: 'play' | 'pause' | 'seek') {
    if (!audioRef.current || !sessionId || !hostToken) return;
    socket.emit('host:audioControl', { sessionId, hostToken, action, currentTime: audioRef.current.currentTime });
  }

  if (!gameConfig || !sessionId || !hostToken) return null;

  const pendingBuzzers = buzzerQueue.filter((b) => !b.responded);
  const isFinalPhase = phase === 'final_challenge' || phase === 'final_reveal';
  const isQuestionView = !!activeQuestion && ['question', 'all_play', 'buzzer_queue', 'answer_reveal'].includes(phase ?? '');
  const totalQuestions = gameConfig.categories.reduce((sum, c) => sum + c.questions.length, 0);
  const usedQuestions = gameConfig.categories.reduce((sum, c) => sum + c.questions.filter((q) => q.used).length, 0);
  const totalPlayers = players.length;
  const totalWagered = wagersSubmitted.length;
  const allWagered = totalWagered >= totalPlayers && totalPlayers > 0;

  function selectQuestion(categoryId: string, questionId: string) {
    socket.emit('host:selectQuestion', { sessionId: sessionId!, hostToken: hostToken!, categoryId, questionId });
  }
  function judge(playerId: string, correct: boolean) {
    socket.emit('host:judge', { sessionId: sessionId!, hostToken: hostToken!, playerId, correct });
  }
  function skipPlayer(playerId: string) {
    socket.emit('host:skipPlayer', { sessionId: sessionId!, hostToken: hostToken!, playerId });
  }
  function clearQuestion() {
    if (autoReveal) {
      socket.emit('host:clearQuestion', { sessionId: sessionId!, hostToken: hostToken! });
    } else {
      socket.emit('host:clearQuestionNoReveal', { sessionId: sessionId!, hostToken: hostToken! });
    }
  }
  function timerControl(action: 'pause' | 'resume' | 'extend' | 'set', seconds?: number) {
    socket.emit('host:timerControl', { sessionId: sessionId!, hostToken: hostToken!, action, seconds });
  }
  function continueBoard() {
    socket.emit('host:continueBoard', { sessionId: sessionId!, hostToken: hostToken! });
  }
  function assignDouble(playerId: string) {
    socket.emit('host:assignDouble', { sessionId: sessionId!, hostToken: hostToken!, playerId });
  }
  function setChallenge(challengedId: string) {
    socket.emit('host:setChallenge', { sessionId: sessionId!, hostToken: hostToken!, challengedId });
  }
  function revealFinal(playerId: string, isCorrect: boolean) {
    socket.emit('host:revealFinal', { sessionId: sessionId!, hostToken: hostToken!, playerId, isCorrect });
  }
  function confirmEndGame() {
    socket.emit('host:endGame', { sessionId: sessionId!, hostToken: hostToken! });
    setShowEndConfirm(false);
  }

  // Category name for active question
  const activeCategory = activeQuestion
    ? gameConfig.categories.find((c) => c.id === activeQuestion.categoryId)
    : null;

  // Time deltas for buzzer queue
  const firstBuzzTs = buzzerQueue[0]?.timestamp ?? 0;

  // ── Shared header ────────────────────────────────────────────────────────────
  const Header = (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{ background: '#0d0b18', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 20px' }}
    >
      <BuzzeLogo size={18} />
      <div className="flex gap-2 items-center">
        {/* Código da sala — sempre visível */}
        <div
          className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold tracking-widest"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b82aa' }}
        >
          SALA <span style={{ color: '#c084fc' }}>{sessionId}</span>
        </div>

        {isQuestionView && activeQuestion && activeCategory ? (
          // Question context badge: CATEGORIA · $VALOR
          <div
            className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span style={{ color: '#8b82aa' }}>{activeCategory.name.toUpperCase()} · </span>
            <span style={{ color: '#c084fc' }}>${activeQuestion.question.value}</span>
          </div>
        ) : (
          <>
            {/* Contador de questões */}
            <div
              className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: usedQuestions === totalQuestions ? '#3ee67a' : '#94a3b8' }}
            >
              {usedQuestions}/{totalQuestions}
            </div>
            {/* Desafio Final */}
            {gameConfig.finalChallengeEnabled && !isFinalPhase && (
              <button
                className="text-sm py-1.5 px-3 rounded-lg font-body font-bold transition-all"
                style={{ border: '1px solid rgba(255,200,87,0.5)', color: '#ffc857', background: 'rgba(255,200,87,0.08)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,200,87,0.18)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,200,87,0.08)'; }}
                onClick={() => socket.emit('host:startFinal', { sessionId: sessionId!, hostToken: hostToken! })}
              >
                {t('host_board.final_challenge')}
              </button>
            )}
            {isFinalPhase && (
              <button
                className="text-sm py-1.5 px-3 rounded-lg transition-colors font-body"
                style={{ border: '1px solid rgba(239,68,68,0.5)', color: '#f87171', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                onClick={() => setShowEndConfirm(true)}
              >
                {t('host_board.end_game')}
              </button>
            )}
            <button className="btn-ghost text-sm py-1.5 px-3" onClick={() => setShowLeaveConfirm(true)}>
              {t('host_board.leave')}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#07060f' }}>
      {Header}

      {/* ── QUESTION LAYOUT ── */}
      {isQuestionView && activeQuestion ? (
        <div className="flex flex-1 gap-4 p-4 min-h-0">
          {/* Left column: question card + bottom bar */}
          <div className="flex flex-col flex-1 gap-3 min-w-0">
            {/* Question card */}
            <div
              className="flex-1 rounded-2xl flex flex-col items-center justify-start p-8 relative min-h-0 overflow-y-auto"
              style={{
                background: '#0d0b18',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 0 0 1px rgba(124,58,237,0.1)',
              }}
            >
              {/* Purple glow */}
              <div
                className="absolute pointer-events-none"
                style={{
                  bottom: '-80px', right: '-60px',
                  width: 400, height: 400,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
                }}
              />

              {/* Type pill */}
              {activeQuestion.question.type === 'all_play' && (
                <div
                  className="mb-6 px-4 py-1.5 rounded-full font-mono text-xs font-bold tracking-widest"
                  style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.5)', color: '#c084fc' }}
                >
                  ◆ {t('player.all_play')} ◆
                </div>
              )}
              {activeQuestion.question.type === 'challenge' && (
                <div
                  className="mb-6 px-4 py-1.5 rounded-full font-mono text-xs font-bold tracking-widest"
                  style={{ background: 'rgba(255,200,87,0.15)', border: '1px solid rgba(255,200,87,0.4)', color: '#ffc857' }}
                >
                  ⚔️ {t('host_board.challenge_title')}
                </div>
              )}

              {/* Category · value */}
              <p className="font-mono text-xs uppercase tracking-widest mb-4 z-10" style={{ color: '#6b6390' }}>
                {activeCategory?.name} · <span style={{ color: '#c084fc' }}>${activeQuestion.question.value}</span>
              </p>

              {/* Media */}
              {activeQuestion.question.media && (
                <img
                  src={`/media/${gameConfig.id}/${activeQuestion.question.media.filename}`}
                  alt=""
                  className="object-contain mb-6 rounded-xl z-10"
                  style={{ maxHeight: 'clamp(140px, 24vh, 320px)', maxWidth: '100%' }}
                />
              )}

              {/* Clue text */}
              <p
                className="text-center font-mono font-bold leading-snug z-10"
                style={{
                  fontSize: 'clamp(22px, 3vw, 38px)',
                  color: '#f0ecff',
                  textShadow: '0 2px 24px rgba(0,0,0,0.8)',
                  maxWidth: 680,
                }}
              >
                {activeQuestion.question.clue}
              </p>

              {/* Audio player — clue (hidden during answer reveal) */}
              {activeQuestion.question.clueAudio && phase !== 'answer_reveal' && (
                <div className="mt-6 w-full max-w-lg z-10">
                  <AudioPlayer
                    src={`/media/${gameConfig.id}/${activeQuestion.question.clueAudio.filename}`}
                    audioRef={audioCallbackRef}
                    onPlay={() => emitAudio('play')}
                    onPause={() => emitAudio('pause')}
                    onSeeked={() => emitAudio(audioRef.current?.paused ? 'seek' : 'play')}
                  />
                </div>
              )}

              {/* Answer hint (dim, host only) — hidden during reveal */}
              {phase !== 'answer_reveal' && (
                <p className="mt-4 font-body italic text-sm z-10" style={{ color: '#3a3558' }}>
                  {activeQuestion.question.answer}
                </p>
              )}

              {/* Timeout indicator */}
              {timer?.remainingMs === 0 && !timer.isPaused && phase !== 'answer_reveal' && (
                <div className="mt-4 font-display text-lg tracking-widest animate-pulse z-10" style={{ color: '#ff4d6d', textShadow: '0 0 16px rgba(255,77,109,0.6)' }}>
                  {t('host_board.time_up')}
                </div>
              )}

              {/* Answer reveal card */}
              {phase === 'answer_reveal' && (
                <div
                  className="mt-8 w-full max-w-xl z-10 rounded-xl px-7 py-5"
                  style={{
                    background: 'color-mix(in oklab, #3ee67a 15%, #07060f)',
                    border: '1px solid #3ee67a',
                  }}
                >
                  <div className="font-mono text-[11px] tracking-[0.2em] mb-1.5" style={{ color: '#3ee67a' }}>
                    {t('host_board.answer_label')}
                  </div>
                  <div className="font-display font-bold" style={{ fontSize: 22, color: '#f0ecff' }}>
                    {activeQuestion.question.answer}
                  </div>
                </div>
              )}

              {/* Answer media */}
              {phase === 'answer_reveal' && activeQuestion.question.answerMedia && (
                <img
                  src={`/media/${gameConfig.id}/${activeQuestion.question.answerMedia.filename}`}
                  alt=""
                  className="mt-6 object-contain rounded-xl z-10"
                  style={{ maxHeight: 'clamp(160px, 28vh, 360px)', maxWidth: '100%' }}
                />
              )}

              {/* Answer audio */}
              {phase === 'answer_reveal' && activeQuestion.question.answerAudio && (
                <div className="mt-4 w-full max-w-lg z-10">
                  <AudioPlayer
                    src={`/media/${gameConfig.id}/${activeQuestion.question.answerAudio.filename}`}
                    audioRef={audioCallbackRef}
                    onPlay={() => emitAudio('play')}
                    onPause={() => emitAudio('pause')}
                    onSeeked={() => emitAudio(audioRef.current?.paused ? 'seek' : 'play')}
                  />
                </div>
              )}
            </div>

            {/* Bottom control bar */}
            <div
              className="flex items-center gap-4 px-4 py-3 rounded-2xl flex-shrink-0"
              style={{ background: '#0d0b18', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Timer circle */}
              {timer ? (
                <TimerCircle remainingMs={timer.remainingMs} totalMs={timer.totalMs} isPaused={timer.isPaused} />
              ) : (
                <div className="w-[72px] h-[72px] flex-shrink-0" />
              )}

              {/* Timer controls — hidden during answer reveal */}
              {phase !== 'answer_reveal' && (
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => timerControl('set', activeQuestion.timerDuration / 1000)}>
                    Reset
                  </button>
                  <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => timerControl('extend', 10)}>+10s</button>
                  {timer?.isPaused
                    ? <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => timerControl('resume')}>{t('host_board.resume')}</button>
                    : <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => timerControl('pause')}>{t('host_board.pause')}</button>
                  }
                </div>
              )}

              <div className="flex-1" />

              {phase === 'answer_reveal' ? (
                /* Answer reveal: only Continue button */
                <button
                  className="py-2.5 px-8 rounded-xl font-body font-bold text-sm transition-all"
                  style={{ background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)', color: '#fff', boxShadow: '0 2px 0 #3b0764, 0 4px 12px rgba(124,58,237,0.35)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%)'; }}
                  onClick={continueBoard}
                >
                  {t('host_board.continue')}
                </button>
              ) : (
                <>
                  {/* Judge buttons — show only if someone is in queue */}
                  {pendingBuzzers.length > 0 && activeQuestion.question.type !== 'challenge' && (
                    <>
                      <button
                        className="py-2.5 px-6 rounded-xl font-body font-bold text-sm transition-all"
                        style={{ background: 'rgba(255,77,109,0.2)', border: '1px solid rgba(255,77,109,0.4)', color: '#ff4d6d' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.35)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.2)'; }}
                        onClick={() => judge(pendingBuzzers[0].playerId, false)}
                      >
                        × {t('host_board.wrong')}
                      </button>
                      <button
                        className="py-2.5 px-6 rounded-xl font-body font-bold text-sm transition-all"
                        style={{ background: 'rgba(62,230,122,0.2)', border: '1px solid rgba(62,230,122,0.4)', color: '#3ee67a' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(62,230,122,0.35)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(62,230,122,0.2)'; }}
                        onClick={() => judge(pendingBuzzers[0].playerId, true)}
                      >
                        ✓ {t('host_board.correct')}
                      </button>
                    </>
                  )}

                  {/* Challenge judge */}
                  {activeQuestion.question.type === 'challenge' && challengeState?.challengedId && (
                    <>
                      <button
                        className="py-2.5 px-6 rounded-xl font-body font-bold text-sm transition-all"
                        style={{ background: 'rgba(255,77,109,0.2)', border: '1px solid rgba(255,77,109,0.4)', color: '#ff4d6d' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.35)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,109,0.2)'; }}
                        onClick={() => judge(challengeState.challengedId!, false)}
                      >
                        × {t('host_board.wrong')}
                      </button>
                      <button
                        className="py-2.5 px-6 rounded-xl font-body font-bold text-sm transition-all"
                        style={{ background: 'rgba(62,230,122,0.2)', border: '1px solid rgba(62,230,122,0.4)', color: '#3ee67a' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(62,230,122,0.35)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(62,230,122,0.2)'; }}
                        onClick={() => judge(challengeState.challengedId!, true)}
                      >
                        ✓ {t('host_board.correct')}
                      </button>
                    </>
                  )}

                  {/* Reveal / Close */}
                  <button
                    className="py-2.5 px-6 rounded-xl font-body font-bold text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#f0ecff' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                    onClick={clearQuestion}
                  >
                    {autoReveal ? t('host_board.close_reveal') : t('host_board.close')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
            {/* Buzzer queue */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: '#6b6390' }}>
                {t('host_board.answer_queue')}
              </p>
              <div className="flex flex-col gap-1.5">
                {/* Challenge step 1: select challenged player */}
                {activeQuestion.question.type === 'challenge' && !challengeState?.challengedId && pendingBuzzers.length > 0 && (
                  <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#15122a', border: '1px solid rgba(255,200,87,0.3)' }}>
                    <p className="text-xs font-body font-bold text-white">
                      {t('host_board.challenge_who', { name: pendingBuzzers[0]?.playerName })}
                    </p>
                    <div className="flex flex-col gap-1">
                      {players.filter((p) => p.id !== pendingBuzzers[0]?.playerId).map((p) => (
                        <button
                          key={p.id}
                          className="text-left py-1.5 px-3 rounded-lg font-body text-sm font-bold transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,200,87,0.2)'; (e.currentTarget as HTMLElement).style.color = '#ffc857'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                          onClick={() => setChallenge(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <button className="btn-ghost text-xs py-1" onClick={() => skipPlayer(pendingBuzzers[0]?.playerId)}>{t('host_board.skip')}</button>
                  </div>
                )}

                {/* Standard buzzer queue rows */}
                {buzzerQueue.map((entry, i) => {
                  const isFirst = i === 0 && !entry.responded;
                  const delta = ((entry.timestamp - firstBuzzTs) / 1000).toFixed(2);
                  const player = players.find((p) => p.id === entry.playerId);
                  return (
                    <div
                      key={entry.playerId}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isFirst ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isFirst ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.06)',
                        opacity: entry.responded ? 0.4 : 1,
                      }}
                    >
                      <span className="font-mono text-xs w-5 text-center flex-shrink-0" style={{ color: isFirst ? '#c084fc' : '#6b6390' }}>
                        {i + 1}
                      </span>
                      <Avatar name={entry.playerName} color={player?.avatarColor ?? '#7c3aed'} size={30} />
                      <span className="flex-1 font-body font-semibold text-sm" style={{ color: isFirst ? '#f0ecff' : '#94a3b8' }}>
                        {entry.playerName}
                      </span>
                      <span className="font-mono text-xs flex-shrink-0" style={{ color: '#6b6390' }}>
                        +{delta}s
                      </span>
                    </div>
                  );
                })}

                {buzzerQueue.length === 0 && (
                  <p className="text-xs font-body py-3 text-center" style={{ color: '#3a3558' }}>
                    {t('host_board.waiting_wager_player')}
                  </p>
                )}
              </div>
            </div>

            {/* Live scoreboard */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: '#6b6390' }}>
                {t('scoreboard.title')} · {t('lobby.live')}
              </p>
              <div className="flex flex-col gap-1">
                {[...players].sort((a, b) => b.score - a.score).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 px-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.avatarColor }} />
                    <span className="flex-1 text-sm font-body truncate" style={{ color: '#94a3b8' }}>{p.name}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: p.score < 0 ? '#ff4d6d' : '#c084fc' }}>
                      {p.score < 0 ? '-' : ''}${Math.abs(p.score).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── BOARD LAYOUT ── */
        <div className="flex gap-4 flex-1 min-h-0 p-4">
          <div className="flex-1 min-h-0">
            <GameBoard
              categories={gameConfig.categories}
              gameId={gameConfig.id}
              onSelectQuestion={phase === 'board' ? selectQuestion : undefined}
              activeQuestionId={activeQuestion?.questionId}
              fillHeight
            />
          </div>
          <div className="w-64 flex-shrink-0">
            <Scoreboard players={players} />
          </div>
        </div>
      )}

      {/* ── OVERLAYS ── */}

      {/* Speed round overlay */}
      <AnimatePresence>
        {activeQuestion && phase === 'speed_round' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(7,6,15,0.97)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 50 }}
          >
            <div style={{ maxWidth: 720, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#3ee67a', textTransform: 'uppercase' }}>
                ⚡ {t('host_board.type_speed_round')}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 22, color: '#c084fc' }}>
                ${activeQuestion.question.value}
              </div>
              {activeQuestion.question.media?.type === 'image' && (
                <img src={`/media/${gameConfig.id}/${activeQuestion.question.media.filename}`} alt="" style={{ maxHeight: 200, objectFit: 'contain', borderRadius: 14 }} />
              )}
              <p style={{ fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 800, fontSize: 'clamp(22px, 3vw, 36px)', color: '#f0ecff', lineHeight: 1.3, margin: 0 }}>
                {activeQuestion.question.clue}
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6b6390', fontStyle: 'italic', margin: 0 }}>
                {t('host_board.answer_label')}: {activeQuestion.question.answer}
              </p>
              {(activeQuestion.speedRoundCorrect?.length ?? 0) > 0 && (
                <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                  {activeQuestion.speedRoundCorrect!.map((entry) => (
                    <div key={entry.playerId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(62,230,122,0.08)', border: '1px solid rgba(62,230,122,0.2)' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#3ee67a', width: 22, fontSize: 12 }}>#{entry.rank}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, color: '#f0ecff', flex: 1 }}>{entry.playerName}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3ee67a', fontSize: 13 }}>+${entry.scoreChange}</span>
                    </div>
                  ))}
                </div>
              )}
              {timer && (
                <div style={{ width: '100%', maxWidth: 480 }}>
                  <QuestionTimer remainingMs={timer.remainingMs} totalMs={timer.totalMs} isPaused={timer.isPaused} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                {timer?.isPaused
                  ? <button className="btn-ghost" onClick={() => timerControl('resume')}>{t('host_board.resume')}</button>
                  : <button className="btn-ghost" onClick={() => timerControl('pause')}>{t('host_board.pause')}</button>
                }
                <button className="btn-ghost" onClick={clearQuestion}>{t('host_board.close')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double wager overlay */}
      <AnimatePresence>
        {phase === 'double_wager' && activeQuestion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-buzze-bg/95 backdrop-blur-sm flex items-center justify-center p-8 z-50"
          >
            <div className="max-w-2xl w-full text-center flex flex-col items-center gap-6">
              <div className="text-6xl">🎯</div>
              <h2 className="font-display text-4xl text-buzze-fuchsia" style={{ textShadow: '0 0 24px rgba(192,132,252,0.6)' }}>{t('host_board.double_wager')}</h2>
              <div className="font-mono text-buzze-fuchsia text-xl">${activeQuestion.question.value} · {activeQuestion.question.clue}</div>
              <p className="text-slate-400 italic text-sm">{activeQuestion.question.answer}</p>
              {!doublePlayerId ? (
                <div className="w-full">
                  <p className="text-slate-300 mb-4">{t('host_board.assign_player')}</p>
                  <div className="flex flex-col gap-2">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        className="flex items-center gap-3 p-3 rounded-xl transition-colors font-bold"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,200,87,0.15)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                        onClick={() => assignDouble(p.id)}
                      >
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.avatarColor }} />
                        <span className="flex-1 text-left">{p.name}</span>
                        <span className="text-sm opacity-60">${p.score.toLocaleString('pt-BR')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{doublePlayerName}</p>
                  <p className="text-slate-400 mt-2 animate-pulse">{t('host_board.waiting_wager')}</p>
                </div>
              )}
              <button className="btn-ghost text-sm" onClick={clearQuestion}>{t('host_board.cancel_question')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final challenge overlay */}
      <AnimatePresence>
        {isFinalPhase && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
            style={{ background: '#07060f' }}
          >
            {/* Reuse same header */}
            {Header}

            {/* Body */}
            <div
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px', gap: 24, textAlign: 'center',
                maxWidth: 1000, margin: '0 auto', width: '100%',
              }}
            >
              {/* Pill badge */}
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{
                  display: 'inline-block', padding: '7px 18px', borderRadius: 9999,
                  border: '1px solid rgba(240,171,252,0.5)', color: '#f0abfc',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.3em',
                }}
              >
                ◆ {t('host_board.final_title')} ◆
              </motion.div>

              {/* Clue */}
              {finalClue && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                    fontSize: 'clamp(28px, 5vw, 58px)', lineHeight: 1.18,
                    letterSpacing: '-0.02em', maxWidth: 900,
                    margin: 0, color: '#f0ecff',
                  }}
                >
                  {finalClue}
                </motion.h1>
              )}

              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                style={{ width: '100%', maxWidth: 700, height: 6, borderRadius: 3, background: '#15122a', overflow: 'hidden' }}
              >
                <div
                  style={{
                    width: totalPlayers > 0 ? `${(totalWagered / totalPlayers) * 100}%` : '0%',
                    height: '100%',
                    background: phase === 'final_challenge' ? '#c084fc' : '#3ee67a',
                    borderRadius: 3, transition: 'width 0.5s ease, background 0.3s',
                  }}
                />
              </motion.div>

              {/* APOSTA — apostas recebidas */}
              {phase === 'final_challenge' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{
                    borderRadius: 16, padding: 24,
                    background: '#0d0b18', border: '1px solid rgba(255,255,255,0.07)',
                    width: '100%', maxWidth: 600, textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      color: '#6b6390', letterSpacing: '0.2em', marginBottom: 14, textAlign: 'center',
                    }}
                  >
                    {t('host_board.wagers_received', { count: totalWagered, total: totalPlayers })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {players.map((p) => {
                      const submitted = wagersSubmitted.some((w) => w.playerId === p.id);
                      const wager = hostWagers[p.id];
                      const revealed = revealedWagers[p.id];
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 10,
                            background: '#15122a', border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <Avatar name={p.name} color={p.avatarColor} size={32} />
                          <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#f0ecff' }}>
                            {p.name}
                          </span>
                          {revealed ? (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3a3558' }}>
                              {t('host_board.revealed')}
                            </span>
                          ) : submitted && wager ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ textAlign: 'right', marginRight: 4 }}>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c084fc', fontWeight: 700 }}>
                                  ${wager.amount.toLocaleString('pt-BR')}
                                </div>
                                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#b8b0d8', fontStyle: 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {wager.answer}
                                </div>
                              </div>
                              <button
                                style={{ background: 'rgba(62,230,122,0.2)', border: '1px solid rgba(62,230,122,0.4)', borderRadius: 6, padding: '5px 10px', color: '#3ee67a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                onClick={() => revealFinal(p.id, true)}
                              >✓</button>
                              <button
                                style={{ background: 'rgba(255,77,109,0.2)', border: '1px solid rgba(255,77,109,0.4)', borderRadius: 6, padding: '5px 10px', color: '#ff4d6d', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                onClick={() => revealFinal(p.id, false)}
                              >✕</button>
                            </div>
                          ) : submitted ? (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#3ee67a', fontWeight: 700 }}>
                              {t('host_board.wager_sent')}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3a3558', letterSpacing: '0.15em' }}>
                              {t('host_board.waiting_wager_player')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {totalWagered > 0 && !allWagered && (
                    <button
                      style={{
                        marginTop: 16, width: '100%', background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                        padding: '8px 16px', color: '#6b6390', fontSize: 12,
                        fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                      }}
                      onClick={() => socket.emit('host:revealFinal', {
                        sessionId: sessionId!, hostToken: hostToken!,
                        playerId: wagersSubmitted.find((w) => hostWagers[w.playerId])?.playerId ?? '',
                        isCorrect: false,
                      })}
                    >
                      {t('host_board.reveal_anyway', { count: totalWagered, total: totalPlayers })}
                    </button>
                  )}
                </motion.div>
              )}

              {/* REVELAÇÃO — mostrar resposta + resultado por jogador */}
              {phase === 'final_reveal' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  style={{
                    borderRadius: 16, padding: 24,
                    background: '#0d0b18', border: '1px solid rgba(255,255,255,0.07)',
                    width: '100%', maxWidth: 600, textAlign: 'left',
                  }}
                >
                  {finalCorrectAnswer && (
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3ee67a', letterSpacing: '0.2em', marginBottom: 6 }}>
                        {t('host_board.answer_ref', { answer: finalCorrectAnswer })}
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      color: '#6b6390', letterSpacing: '0.15em', marginBottom: 12, textAlign: 'center',
                    }}
                  >
                    {t('host_board.reveal_answer')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {players.map((p) => {
                      const wager = hostWagers[p.id];
                      const revealed = revealedWagers[p.id];
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 10,
                            background: revealed ? 'rgba(62,230,122,0.06)' : '#15122a',
                            border: `1px solid ${revealed ? 'rgba(62,230,122,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          <Avatar name={p.name} color={p.avatarColor} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#f0ecff' }}>{p.name}</div>
                            {wager && (
                              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#b8b0d8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {wager.answer}
                              </div>
                            )}
                          </div>
                          {wager && revealed ? (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c084fc', fontWeight: 700 }}>
                                ${wager.amount.toLocaleString('pt-BR')}
                              </div>
                            </div>
                          ) : wager && !revealed ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <div style={{ textAlign: 'right', marginRight: 4 }}>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#c084fc', fontWeight: 700 }}>
                                  ${wager.amount.toLocaleString('pt-BR')}
                                </div>
                              </div>
                              <button
                                style={{ background: 'rgba(62,230,122,0.2)', border: '1px solid rgba(62,230,122,0.4)', borderRadius: 6, padding: '5px 10px', color: '#3ee67a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                onClick={() => revealFinal(p.id, true)}
                              >✓</button>
                              <button
                                style={{ background: 'rgba(255,77,109,0.2)', border: '1px solid rgba(255,77,109,0.4)', borderRadius: 6, padding: '5px 10px', color: '#ff4d6d', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                                onClick={() => revealFinal(p.id, false)}
                              >✕</button>
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3a3558', letterSpacing: '0.15em' }}>
                              {t('host_board.waiting_wager_player')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over — results / podium */}
      <AnimatePresence>
        {phase === 'game_over' && (() => {
          const sorted = [...players].sort((a, b) => b.score - a.score);
          const winner = sorted[0];
          // Podium order: 2nd (left), 1st (center), 3rd (right)
          const podiumOrder = [1, 0, 2] as const;
          const pillarH = [220, 170, 140] as const; // by rank index (0=1st)
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
              style={{ background: '#07060f' }}
            >
              {/* Header */}
              {Header}

              {/* Body */}
              <div
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '40px 24px 56px',
                  gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%',
                }}
              >
                {/* "FIM DE JOGO" label */}
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: '#c084fc', letterSpacing: '0.3em', textTransform: 'uppercase',
                  }}
                >
                  {t('host_board.game_over')}
                </div>

                {/* Winner headline */}
                {winner && (
                  <motion.h1
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{
                      fontFamily: 'Syne, system-ui, sans-serif', fontWeight: 700,
                      fontSize: 'clamp(44px, 7vw, 84px)',
                      letterSpacing: '-0.04em', lineHeight: 1,
                      background: 'linear-gradient(120deg, #f0ecff, #c084fc, #7c3aed)',
                      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                      textAlign: 'center', margin: '8px 0 32px',
                    }}
                  >
                    {winner.name} venceu.
                  </motion.h1>
                )}

                {/* Podium */}
                {sorted.length >= 1 && (
                  <div
                    style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 16, width: '100%', maxWidth: 760,
                      alignItems: 'end', marginBottom: 32,
                    }}
                  >
                    {podiumOrder.map((rank, col) => {
                      const p = sorted[rank];
                      if (!p) return <div key={col} />;
                      const h = pillarH[rank];
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: col * 0.12 + 0.25 }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <div style={{ fontSize: 28, marginBottom: 6 }}>{medals[rank]}</div>
                          <Avatar name={p.name} color={p.avatarColor} size={56} />
                          <div
                            style={{
                              marginTop: 10, fontFamily: 'Syne, sans-serif',
                              fontWeight: 700, fontSize: 15, color: '#f0ecff',
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                              fontSize: 18, color: '#c084fc', marginBottom: 10,
                            }}
                          >
                            ${p.score.toLocaleString('en-US')}
                          </div>
                          <div
                            style={{
                              width: '100%', height: h,
                              borderRadius: '12px 12px 0 0',
                              background: rank === 0
                                ? 'linear-gradient(180deg, rgba(124,58,237,0.4) 0%, #15122a 100%)'
                                : 'linear-gradient(180deg, #1e1a38 0%, #0d0b18 100%)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderBottom: 'none',
                              display: 'grid', placeItems: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                                fontSize: 48,
                                color: rank === 0 ? 'rgba(192,132,252,0.6)' : 'rgba(255,255,255,0.15)',
                              }}
                            >
                              {rank + 1}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Full standings */}
                <div
                  style={{
                    borderRadius: 16, width: '100%', maxWidth: 760,
                    background: '#0d0b18', border: '1px solid rgba(255,255,255,0.07)',
                    padding: 8, overflow: 'hidden',
                  }}
                >
                  {sorted.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 + 0.5 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 14px',
                        borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                          fontSize: 13, color: '#6b6390', width: 24, flexShrink: 0,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <Avatar name={p.name} color={p.avatarColor} size={36} />
                      <div style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, color: '#f0ecff' }}>
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                          fontSize: 15,
                          color: p.score < 0 ? '#ff4d6d' : '#f0ecff',
                        }}
                      >
                        {p.score < 0 ? '−' : ''}${Math.abs(p.score).toLocaleString('en-US')}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                  <button
                    className="btn-primary"
                    onClick={() => { socket.disconnect(); resetGame(); navigate('/host'); }}
                  >
                    {t('host_board.new_room')}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => { socket.disconnect(); resetGame(); navigate('/'); }}
                  >
                    {t('host_board.back_menu')}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Confirm modals */}
      <ConfirmModal
        open={showEndConfirm}
        title={t('host_board.end_confirm_title')}
        description={t('host_board.end_confirm_desc')}
        confirmLabel={t('host_board.end')}
        cancelLabel={t('confirm.cancel')}
        danger
        onConfirm={confirmEndGame}
        onCancel={() => setShowEndConfirm(false)}
      />
      <ConfirmModal
        open={showLeaveConfirm}
        title={t('host_board.leave_confirm_title')}
        description={t('host_board.leave_confirm_desc')}
        confirmLabel={t('host_board.back_to_menu')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={() => { socket.disconnect(); resetGame(); navigate('/'); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
}
