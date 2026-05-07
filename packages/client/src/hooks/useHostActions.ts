import { useCallback } from 'react';
import { socket } from '../socket.js';

interface HostActionContext {
  sessionId: string;
  hostToken: string;
}

export function useHostActions({ sessionId, hostToken }: HostActionContext) {
  const withHost = useCallback(
    <T extends object>(payload: T) => ({ sessionId, hostToken, ...payload }),
    [hostToken, sessionId],
  );

  return {
    start: useCallback(() => {
      socket.emit('host:start', withHost({}));
    }, [withHost]),
    selectQuestion: useCallback((categoryId: string, questionId: string) => {
      socket.emit('host:selectQuestion', withHost({ categoryId, questionId }));
    }, [withHost]),
    judge: useCallback((playerId: string, correct: boolean) => {
      socket.emit('host:judge', withHost({ playerId, correct }));
    }, [withHost]),
    skipPlayer: useCallback((playerId: string) => {
      socket.emit('host:skipPlayer', withHost({ playerId }));
    }, [withHost]),
    clearQuestion: useCallback((revealAnswer: boolean) => {
      socket.emit(revealAnswer ? 'host:clearQuestion' : 'host:clearQuestionNoReveal', withHost({}));
    }, [withHost]),
    timerControl: useCallback((action: 'pause' | 'resume' | 'extend' | 'set', seconds?: number) => {
      socket.emit('host:timerControl', withHost({ action, seconds }));
    }, [withHost]),
    continueBoard: useCallback(() => {
      socket.emit('host:continueBoard', withHost({}));
    }, [withHost]),
    assignDouble: useCallback((playerId: string) => {
      socket.emit('host:assignDouble', withHost({ playerId }));
    }, [withHost]),
    setChallenge: useCallback((challengedId: string) => {
      socket.emit('host:setChallenge', withHost({ challengedId }));
    }, [withHost]),
    revealFinal: useCallback((playerId: string, isCorrect: boolean) => {
      socket.emit('host:revealFinal', withHost({ playerId, isCorrect }));
    }, [withHost]),
    startFinal: useCallback(() => {
      socket.emit('host:startFinal', withHost({}));
    }, [withHost]),
    endGame: useCallback(() => {
      socket.emit('host:endGame', withHost({}));
    }, [withHost]),
    audioControl: useCallback((action: 'play' | 'pause' | 'seek', currentTime: number) => {
      socket.emit('host:audioControl', withHost({ action, currentTime }));
    }, [withHost]),
  };
}
