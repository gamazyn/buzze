import { describe, expect, it } from 'vitest';
import type { ActiveQuestion, BuzzerEntry } from '@buzze/shared';
import { applyJudgeResult, applySpeedAnswer, clampDoubleWager } from '../../domain/buzzerRules.js';
import { makePlayer, makeSession } from '../helpers/sessionFixture.js';

function activeQuestion(overrides: Partial<ActiveQuestion> = {}): ActiveQuestion {
  return {
    categoryId: 'cat-1',
    questionId: 'q-1',
    question: { id: 'q-1', value: 100, clue: 'Q1', answer: 'Answer', type: 'standard', used: false },
    startedAt: 1,
    timerDuration: 30000,
    ...overrides,
  };
}

function queueEntry(playerId: string, playerName = playerId): BuzzerEntry {
  return { playerId, playerName, timestamp: 1, responded: false };
}

describe('buzzerRules', () => {
  it('scores a standard correct answer and moves to answer reveal', () => {
    const session = makeSession({
      activeQuestion: activeQuestion(),
      buzzerQueue: [queueEntry('player-1', 'Alice')],
      phase: 'buzzer_queue',
    });

    const result = applyJudgeResult(session, { playerId: 'player-1', correct: true });

    expect(result.phase).toBe('answer_reveal');
    expect(result.scoreChange).toBe(100);
    expect(result.newScore).toBe(600);
    expect(result.players['player-1'].score).toBe(600);
    expect(result.nextInQueue).toBeNull();
  });

  it('keeps the buzzer queue open for the next player after a wrong standard answer', () => {
    const session = makeSession({
      activeQuestion: activeQuestion(),
      buzzerQueue: [queueEntry('player-1', 'Alice'), queueEntry('player-2', 'Bob')],
      phase: 'buzzer_queue',
    });

    const result = applyJudgeResult(session, { playerId: 'player-1', correct: false });

    expect(result.phase).toBe('buzzer_queue');
    expect(result.scoreChange).toBe(-100);
    expect(result.players['player-1'].score).toBe(400);
    expect(result.nextInQueue?.playerId).toBe('player-2');
    expect(result.buzzerQueue[0]?.responded).toBe(true);
  });

  it('blocks an all-play player after a wrong answer without closing until all players are locked', () => {
    const session = makeSession({
      activeQuestion: activeQuestion({
        question: { id: 'q-2', value: 200, clue: 'Q2', answer: 'A2', type: 'all_play', used: false },
        lockedPlayerIds: [],
      }),
      buzzerQueue: [queueEntry('player-1', 'Alice')],
      phase: 'buzzer_queue',
    });

    const result = applyJudgeResult(session, { playerId: 'player-1', correct: false });

    expect(result.phase).toBe('all_play');
    expect(result.closeQuestion).toBe(false);
    expect(result.activeQuestion.lockedPlayerIds).toEqual(['player-1']);
    expect(result.buzzerQueue).toEqual([]);
  });

  it('applies symmetric challenge scoring', () => {
    const session = makeSession({
      activeQuestion: activeQuestion({
        question: { id: 'q-4', value: 400, clue: 'Q4', answer: 'A4', type: 'challenge', used: false },
      }),
      players: {
        challenger: makePlayer('challenger', 'Challenger', 900),
        challenged: makePlayer('challenged', 'Challenged', 100),
      },
      challengeState: {
        challengerId: 'challenger',
        challengerName: 'Challenger',
        challengedId: 'challenged',
        challengedName: 'Challenged',
      },
      buzzerQueue: [queueEntry('challenger', 'Challenger')],
      phase: 'buzzer_queue',
    });

    const result = applyJudgeResult(session, { playerId: 'challenged', correct: false });

    expect(result.scoreChange).toBe(-400);
    expect(result.players.challenged.score).toBe(-300);
    expect(result.players.challenger.score).toBe(1300);
    expect(result.phase).toBe('board');
    expect(result.closeQuestion).toBe(true);
  });

  it('clamps double wagers to the higher of player score and question value with a minimum of 50', () => {
    expect(clampDoubleWager({ requestedAmount: 10, playerScore: 20, questionValue: 300 })).toBe(50);
    expect(clampDoubleWager({ requestedAmount: 999, playerScore: 200, questionValue: 300 })).toBe(300);
    expect(clampDoubleWager({ requestedAmount: 999, playerScore: 700, questionValue: 300 })).toBe(700);
  });

  it('accepts a first speed-round correct answer and awards full value', () => {
    const session = makeSession({
      activeQuestion: activeQuestion({
        question: { id: 'q-5', value: 500, clue: 'Q5', answer: 'Banana', type: 'speed_round', used: false },
        speedRoundCorrect: [],
      }),
      phase: 'speed_round',
    });

    const result = applySpeedAnswer(session, {
      playerId: 'player-1',
      answer: ' banana ',
      timestamp: 123,
    });

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('Expected speed answer to be accepted.');
    expect(result.phase).toBe('speed_round');
    expect(result.scoreChange).toBe(500);
    expect(result.players['player-1'].score).toBe(1000);
    expect(result.activeQuestion.speedRoundCorrect?.[0]).toMatchObject({
      playerId: 'player-1',
      rank: 1,
      scoreChange: 500,
      timestamp: 123,
    });
  });
});
