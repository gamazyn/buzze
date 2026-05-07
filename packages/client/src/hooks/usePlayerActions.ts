import { useCallback } from 'react';
import { socket } from '../socket.js';

interface PlayerActionContext {
  sessionId: string;
  playerId: string;
}

export function usePlayerActions({ sessionId, playerId }: PlayerActionContext) {
  return {
    buzz: useCallback(() => {
      socket.emit('player:buzz', { sessionId, playerId });
    }, [playerId, sessionId]),
    submitFinalWager: useCallback((amount: number) => {
      socket.emit('player:finalWager', { sessionId, playerId, amount });
    }, [playerId, sessionId]),
    submitDoubleWager: useCallback((amount: number) => {
      socket.emit('player:doubleWager', { sessionId, playerId, amount });
    }, [playerId, sessionId]),
    submitSpeedAnswer: useCallback((answer: string) => {
      socket.emit('player:speedAnswer', { sessionId, answer });
    }, [sessionId]),
  };
}
