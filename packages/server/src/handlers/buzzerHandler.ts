import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, BuzzerEntry } from '@buzze/shared';
import { getSession, updateSession } from '../managers/sessionManager.js';
import { socketRateLimit } from '../middleware/rateLimiter.js';
import { closeQuestion } from './gameHandler.js';
import { startTimer } from '../managers/timerManager.js';
import { applyJudgeResult, applySpeedAnswer, clampDoubleWager } from '../domain/buzzerRules.js';
import { requireHost } from './requireHost.js';

export function registerBuzzerHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): void {
  // PLAYER: apertar buzzer
  socket.on('player:buzz', (payload) => {
    if (!socketRateLimit(socket.id, 'player:buzz', 3)) {
      socket.emit('error', { code: 'RATE_LIMITED', message: 'Muitas tentativas.' });
      return;
    }

    const serverTimestamp = Date.now(); // Sempre timestamp do servidor

    const session = getSession(payload.sessionId);
    if (!session) return;

    // Aceita buzz em question, all_play e buzzer_queue (para montar a fila completa)
    if (session.phase !== 'question' && session.phase !== 'all_play' && session.phase !== 'buzzer_queue') return;

    const player = session.players[socket.id];
    if (!player) return;

    // Dupla Aposta: só o jogador atribuído pode buzzar
    if (session.activeQuestion?.question.type === 'double' && session.doublePlayerId && socket.id !== session.doublePlayerId) return;

    // all_play: rejeitar player bloqueado por erro anterior
    if (session.phase === 'all_play' && session.activeQuestion?.lockedPlayerIds?.includes(socket.id)) return;

    // Evitar duplicata na fila
    if (session.buzzerQueue.some((e) => e.playerId === socket.id)) return;

    const entry: BuzzerEntry = {
      playerId: socket.id,
      playerName: player.name,
      timestamp: serverTimestamp,
      responded: false,
    };

    const updatedQueue = [...session.buzzerQueue, entry].sort((a, b) => a.timestamp - b.timestamp);

    updateSession(payload.sessionId, {
      phase: 'buzzer_queue',
      buzzerQueue: updatedQueue,
    });

    // Confirmar posição para o player que buzzou
    const position = updatedQueue.findIndex((e) => e.playerId === socket.id) + 1;
    socket.emit('buzzer:confirmed', { position });

    // Enviar fila completa apenas ao host
    io.to(`host:${payload.sessionId}`).emit('buzzer:queueUpdate', {
      queue: updatedQueue,
      phase: 'buzzer_queue',
    });
  });

  // HOST: julgar resposta (standard, all_play, double, challenge)
  socket.on('host:judge', (payload) => {
    const session = requireHost(socket, payload.sessionId, payload.hostToken);
    if (!session) return;

    if (session.phase !== 'buzzer_queue') return;

    const activeQuestion = session.activeQuestion;
    if (!activeQuestion) return;

    const isChallenge = activeQuestion.question.type === 'challenge' &&
      session.challengeState?.challengedId === payload.playerId;

    // Para challenge, o jogador desafiado pode não estar na fila — bypass da verificação
    if (!isChallenge) {
      const playerEntry = session.buzzerQueue.find(
        (e) => e.playerId === payload.playerId && !e.responded,
      );
      if (!playerEntry) return;
    }

    const player = session.players[payload.playerId];
    if (!player) return;

    const result = applyJudgeResult(session, {
      playerId: payload.playerId,
      correct: payload.correct,
    });

    // all_play com erro: bloquear player e reabrir buzzer
    if (activeQuestion.question.type === 'all_play' && !payload.correct && !isChallenge) {
      updateSession(payload.sessionId, {
        phase: result.phase,
        players: result.players,
        buzzerQueue: result.buzzerQueue,
        activeQuestion: result.activeQuestion,
      });

      io.to(`session:${payload.sessionId}`).emit('judge:result', {
        playerId: payload.playerId,
        correct: false,
        scoreChange: result.scoreChange,
        newScore: result.newScore,
        nextInQueue: null,
        phase: result.phase,
      });
      io.to(`session:${payload.sessionId}`).emit('score:update', {
        players: Object.values(result.players),
      });

      if (result.closeQuestion) {
        closeQuestion(io, payload.sessionId, true);
      }
      return;
    }

    updateSession(payload.sessionId, {
      phase: result.phase,
      players: result.players,
      buzzerQueue: result.buzzerQueue,
    });

    io.to(`session:${payload.sessionId}`).emit('judge:result', {
      playerId: payload.playerId,
      correct: payload.correct,
      scoreChange: result.scoreChange,
      newScore: result.newScore,
      nextInQueue: result.nextInQueue,
      phase: result.phase,
    });

    io.to(`session:${payload.sessionId}`).emit('score:update', {
      players: Object.values(result.players),
    });

    if (result.closeQuestion) {
      closeQuestion(io, payload.sessionId, true);
    } else {
      io.to(`host:${payload.sessionId}`).emit('buzzer:queueUpdate', {
        queue: result.buzzerQueue,
        phase: 'buzzer_queue',
      });
    }
  });

  // HOST: definir jogador desafiado (questão challenge)
  socket.on('host:setChallenge', (payload) => {
    const session = requireHost(socket, payload.sessionId, payload.hostToken);
    if (!session || session.phase !== 'buzzer_queue') return;

    const activeQuestion = session.activeQuestion;
    if (!activeQuestion || activeQuestion.question.type !== 'challenge') return;

    const challenged = session.players[payload.challengedId];
    if (!challenged) {
      socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Jogador não encontrado.' });
      return;
    }

    // Challenger é o primeiro da fila que ainda não respondeu
    const challenger = session.buzzerQueue.find((e) => !e.responded);
    if (!challenger) return;

    const challengeState = {
      challengerId: challenger.playerId,
      challengerName: challenger.playerName,
      challengedId: payload.challengedId,
      challengedName: challenged.name,
    };

    updateSession(payload.sessionId, { challengeState });

    io.to(`session:${payload.sessionId}`).emit('challenge:assigned', { challengeState });
  });

  // PLAYER: enviar aposta da Dupla Aposta
  socket.on('player:doubleWager', (payload) => {
    const session = getSession(payload.sessionId);
    if (!session || session.phase !== 'double_wager') return;

    // Só o jogador atribuído pode apostar
    if (session.doublePlayerId !== socket.id) return;
    // Só uma aposta
    if (session.doubleWager !== null) return;

    const player = session.players[socket.id];
    if (!player) return;

    const activeQuestion = session.activeQuestion;
    if (!activeQuestion) return;

    const amount = clampDoubleWager({
      requestedAmount: payload.amount,
      playerScore: player.score,
      questionValue: activeQuestion.question.value,
    });

    // Salva aposta e transita para question (clue revela para todos, timer inicia)
    updateSession(payload.sessionId, {
      phase: 'question',
      doubleWager: amount,
    });

    // Avisa todos que a aposta foi feita e o clue vai ser revelado
    io.to(`session:${payload.sessionId}`).emit('double:wagerLocked', {
      assignedPlayerId: socket.id,
      amount,
    });

    // Re-emite question:selected para revelar o clue (com phase=question)
    io.to(`session:${payload.sessionId}`).emit('question:selected', {
      activeQuestion,
      phase: 'question',
    });

    // Inicia o timer
    const timerMs = activeQuestion.timerDuration;
    startTimer(io, payload.sessionId, timerMs, () => {
      const current = getSession(payload.sessionId);
      if (current?.phase === 'question') {
        closeQuestion(io, payload.sessionId, false);
      }
    });
  });

  // PLAYER: enviar resposta no modo Rodada Rápida
  socket.on('player:speedAnswer', (payload) => {
    if (!socketRateLimit(socket.id, 'player:speedAnswer', 10)) return;

    const session = getSession(payload.sessionId);
    if (!session || session.phase !== 'speed_round') return;

    const player = session.players[socket.id];
    if (!player) return;

    const activeQuestion = session.activeQuestion;
    if (!activeQuestion) return;

    const result = applySpeedAnswer(session, {
      playerId: socket.id,
      answer: payload.answer,
      timestamp: Date.now(),
    });
    if (!result.accepted) return;

    updateSession(payload.sessionId, {
      players: result.players,
      activeQuestion: result.activeQuestion,
      ...(result.closeQuestion ? { phase: 'answer_reveal' } : {}),
    });

    io.to(`session:${payload.sessionId}`).emit('speed:answered', {
      correct: result.activeQuestion.speedRoundCorrect ?? [],
      phase: result.phase,
    });

    if (result.scoreChange > 0) {
      io.to(`session:${payload.sessionId}`).emit('score:update', {
        players: Object.values(result.players),
      });
    }

    if (result.closeQuestion) {
      closeQuestion(io, payload.sessionId, true);
    }
  });

  // HOST: pular player da fila
  socket.on('host:skipPlayer', (payload) => {
    const session = requireHost(socket, payload.sessionId, payload.hostToken);
    if (!session) return;

    const updatedQueue = session.buzzerQueue.map((e) =>
      e.playerId === payload.playerId ? { ...e, responded: true } : e,
    );

    const nextInQueue = updatedQueue.find((e) => !e.responded) ?? null;
    const newPhase = nextInQueue ? 'buzzer_queue' : 'board';

    updateSession(payload.sessionId, {
      phase: newPhase as 'buzzer_queue' | 'board',
      buzzerQueue: updatedQueue,
    });

    io.to(`host:${payload.sessionId}`).emit('buzzer:queueUpdate', {
      queue: updatedQueue,
      phase: newPhase as 'buzzer_queue' | 'board',
    });

    if (!nextInQueue) {
      closeQuestion(io, payload.sessionId, true);
    }
  });
}
