import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@buzze/shared';
import { getSession } from '../managers/sessionManager.js';
import { validateHostToken } from '../middleware/authMiddleware.js';

export function requireHost(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  sessionId: string,
  hostToken: string,
): ReturnType<typeof getSession> | null {
  const session = getSession(sessionId);
  if (!session) {
    socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Sessão não encontrada.' });
    return null;
  }
  if (session.hostId !== socket.id || !validateHostToken(session.hostToken, hostToken)) {
    socket.emit('error', { code: 'NOT_HOST', message: 'Ação não permitida.' });
    return null;
  }
  return session;
}
