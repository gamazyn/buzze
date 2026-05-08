import type { ActiveQuestion, BuzzerEntry, GamePhase, GameSession, Player, SpeedRoundCorrect } from '@buzze/shared';
import { sanitizeAnswer } from '@buzze/shared';

interface JudgeInput {
  playerId: string;
  correct: boolean;
}

interface JudgeResult {
  phase: GamePhase;
  players: Record<string, Player>;
  buzzerQueue: BuzzerEntry[];
  activeQuestion: ActiveQuestion;
  scoreChange: number;
  newScore: number;
  nextInQueue: BuzzerEntry | null;
  closeQuestion: boolean;
}

interface DoubleWagerInput {
  requestedAmount: number;
  playerScore: number;
  questionValue: number;
}

interface SpeedAnswerInput {
  playerId: string;
  answer: string;
  timestamp: number;
}

interface SpeedAnswerIgnored {
  accepted: false;
}

interface SpeedAnswerAccepted {
  accepted: true;
  phase: GamePhase;
  players: Record<string, Player>;
  activeQuestion: ActiveQuestion;
  scoreChange: number;
  closeQuestion: boolean;
}

export function clampDoubleWager({ requestedAmount, playerScore, questionValue }: DoubleWagerInput): number {
  const maxWager = Math.max(playerScore, questionValue);
  return Math.max(50, Math.min(requestedAmount, maxWager));
}

export function applyJudgeResult(session: GameSession, input: JudgeInput): JudgeResult {
  const activeQuestion = session.activeQuestion;
  if (!activeQuestion) throw new Error('Cannot judge without active question.');

  const player = session.players[input.playerId];
  if (!player) throw new Error('Cannot judge unknown player.');

  const isChallenge = activeQuestion.question.type === 'challenge' &&
    session.challengeState?.challengedId === input.playerId;

  const players = { ...session.players };
  const { scoreChange, newScore } = scoreJudgement(session, input, player, players, isChallenge);
  const buzzerQueue = session.buzzerQueue.map((entry) =>
    entry.playerId === input.playerId ? { ...entry, responded: true } : entry,
  );

  if (activeQuestion.question.type === 'all_play' && !input.correct && !isChallenge) {
    const lockedPlayerIds = [...(activeQuestion.lockedPlayerIds ?? []), input.playerId];
    const allLocked = lockedPlayerIds.length >= Object.keys(session.players).length;
    return {
      phase: allLocked ? 'answer_reveal' : 'all_play',
      players,
      buzzerQueue: [],
      activeQuestion: { ...activeQuestion, lockedPlayerIds },
      scoreChange,
      newScore,
      nextInQueue: null,
      closeQuestion: allLocked,
    };
  }

  const nextInQueue = isChallenge ? null : (buzzerQueue.find((entry) => !entry.responded) ?? null);
  const phase = input.correct ? 'answer_reveal' : (nextInQueue ? 'buzzer_queue' : 'board');

  return {
    phase,
    players,
    buzzerQueue,
    activeQuestion,
    scoreChange,
    newScore,
    nextInQueue,
    closeQuestion: input.correct || !nextInQueue,
  };
}

export function applySpeedAnswer(
  session: GameSession,
  input: SpeedAnswerInput,
): SpeedAnswerIgnored | SpeedAnswerAccepted {
  const activeQuestion = session.activeQuestion;
  if (!activeQuestion) return { accepted: false };

  const player = session.players[input.playerId];
  if (!player) return { accepted: false };

  const correct = sanitizeAnswer(input.answer).toLowerCase() ===
    sanitizeAnswer(activeQuestion.question.answer).toLowerCase();
  if (!correct) return { accepted: false };

  const alreadyCorrect = activeQuestion.speedRoundCorrect ?? [];
  if (alreadyCorrect.some((entry) => entry.playerId === input.playerId)) return { accepted: false };

  const rank = alreadyCorrect.length + 1;
  const scoreChange = Math.round(activeQuestion.question.value * speedRoundMultiplier(rank));
  const entry: SpeedRoundCorrect = {
    playerId: input.playerId,
    playerName: player.name,
    scoreChange,
    rank,
    timestamp: input.timestamp,
  };

  const speedRoundCorrect = [...alreadyCorrect, entry];
  const players = { ...session.players };
  if (scoreChange > 0) {
    players[input.playerId] = { ...player, score: player.score + scoreChange };
  }

  const closeQuestion = speedRoundCorrect.length >= 3;
  return {
    accepted: true,
    phase: closeQuestion ? 'answer_reveal' : 'speed_round',
    players,
    activeQuestion: { ...activeQuestion, speedRoundCorrect },
    scoreChange,
    closeQuestion,
  };
}

function scoreJudgement(
  session: GameSession,
  input: JudgeInput,
  player: Player,
  players: Record<string, Player>,
  isChallenge: boolean,
): { scoreChange: number; newScore: number } {
  const activeQuestion = session.activeQuestion;
  if (!activeQuestion) throw new Error('Cannot score without active question.');

  if (isChallenge && session.challengeState) {
    const challenger = session.players[session.challengeState.challengerId];
    const value = activeQuestion.question.value;
    const scoreChange = input.correct ? value : -value;
    players[input.playerId] = { ...player, score: player.score + scoreChange };
    if (challenger) {
      players[session.challengeState.challengerId] = {
        ...challenger,
        score: challenger.score + (input.correct ? -value : value),
      };
    }
    return { scoreChange, newScore: players[input.playerId].score };
  }

  const wager = activeQuestion.question.type === 'double' && session.doubleWager !== null
    ? session.doubleWager
    : activeQuestion.question.value;
  const scoreChange = input.correct ? wager : -wager;
  const newScore = player.score + scoreChange;
  players[input.playerId] = { ...player, score: newScore };
  return { scoreChange, newScore };
}

function speedRoundMultiplier(rank: number): number {
  if (rank === 1) return 1;
  if (rank === 2) return 0.75;
  if (rank === 3) return 0.5;
  return 0;
}
