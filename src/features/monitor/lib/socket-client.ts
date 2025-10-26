/**
 * 세컨드 모니터 Socket.IO 클라이언트
 */

import { io, Socket } from 'socket.io-client';

export interface SocketClientConfig {
  serverUrl: string;
  token: string;
}

export interface SocketEvents {
  'session:created': (data: {
    sessionId: string;
    pairingToken: string;
    expiresIn: number;
    pairingUrl: string;
  }) => void;
  'session:paired': (data: { sessionId: string; at: number }) => void;
  'session:error': (data: { code: string; message: string }) => void;
  navigate: (data: {
    orderNo: string;
    ts: number;
    nonce?: string;
    from: string;
  }) => void;
  'connect': () => void;
  'disconnect': () => void;
  'connect_error': (error: Error) => void;
}

/**
 * Socket.IO 클라이언트 생성
 */
export function createSocketClient(config: SocketClientConfig): Socket {
  const socket = io(config.serverUrl, {
    auth: {
      token: config.token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  return socket;
}

/**
 * Socket.IO 이벤트 리스너 등록
 */
export function attachSocketListeners(
  socket: Socket,
  handlers: Partial<SocketEvents>
): () => void {
  const listeners: [string, Function][] = [];

  Object.entries(handlers).forEach(([event, handler]) => {
    if (handler) {
      socket.on(event, handler as any);
      listeners.push([event, handler]);
    }
  });

  // cleanup 함수 반환
  return () => {
    listeners.forEach(([event, handler]) => {
      socket.off(event, handler as any);
    });
  };
}

/**
 * 세션 생성 요청
 */
export function requestSessionCreate(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    socket.emit('session:create');
    resolve();
  });
}

/**
 * 세션 페어링 요청
 */
export function requestSessionJoin(
  socket: Socket,
  sessionId: string,
  pairingToken: string
): Promise<void> {
  return new Promise((resolve) => {
    socket.emit('session:join', {
      sessionId,
      pairingToken,
    });
    resolve();
  });
}
