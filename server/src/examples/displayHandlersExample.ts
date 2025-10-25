/**
 * displayHandlers 사용 예제
 *
 * Socket.IO 서버에서 /display 네임스페이스를 설정하고,
 * 브라우저 확장 클라이언트의 연결을 처리하는 예제입니다.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupDisplayNamespace } from '../events/displayHandlers';

/**
 * Socket.IO 서버 초기화 및 /display 네임스페이스 설정
 *
 * 이 함수는 일반적으로 Next.js API Route나 Express 애플리케이션에서
 * 다음과 같이 사용됩니다:
 *
 * @example
 * // pages/api/socket.ts (Next.js API Route)
 * import { initSocketServer } from './socket-init';
 *
 * export default async function handler(req, res) {
 *   if (res.socket.server.io) {
 *     res.status(200).json({ message: 'Socket.IO 서버가 이미 초기화되었습니다' });
 *     return;
 *   }
 *
 *   const io = initSocketServer(res.socket.server);
 *   res.socket.server.io = io;
 *   res.status(200).json({ message: 'Socket.IO 서버 초기화 완료' });
 * }
 */
export function initSocketServer(httpServer: any): Server {
  // 1. Socket.IO 서버 생성
  const io = new Server(httpServer, {
    path: '/socket.io',
    // CORS 설정: 개발 환경에서는 모든 origin 허용, 프로덕션은 특정 origin만 허용
    cors: {
      origin: process.env.NODE_ENV === 'development' ? '*' : (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true,
    },
    // 트랜스포트 설정
    transports: ['websocket', 'polling'],
  });

  // 2. /display 네임스페이스 설정
  setupDisplayNamespace(io);

  // 3. 다른 네임스페이스 설정 (선택사항)
  // setupDefaultNamespace(io); // 기본 네임스페이스
  // setupSessionNamespace(io); // 세션 네임스페이스

  return io;
}

/**
 * 개발용 예제: HTTP 서버와 Socket.IO 함께 실행
 *
 * 이 함수는 테스트 또는 로컬 개발 환경에서만 사용됩니다.
 */
export async function startDevServer(port: number = 3000) {
  const httpServer = createServer();
  const io = initSocketServer(httpServer);

  // 4. 서버 시작
  httpServer.listen(port, () => {
    console.log(`Socket.IO 서버가 포트 ${port}에서 실행 중입니다`);
    console.log(`클라이언트 연결: ws://localhost:${port}/display`);
  });

  return { httpServer, io };
}

/**
 * 브라우저 확장 클라이언트 연결 흐름
 *
 * 클라이언트 측 구현 예제 (TypeScript/JavaScript):
 *
 * @example
 * import { io, Socket } from 'socket.io-client';
 *
 * // 1. Socket.IO 클라이언트 생성 및 /display 네임스페이스로 연결
 * const socket: Socket = io('http://localhost:3000/display', {
 *   transports: ['websocket'],
 *   reconnection: true,
 * });
 *
 * // 2. 연결 성공 이벤트 처리
 * socket.on('connect', () => {
 *   console.log('서버에 연결되었습니다');
 *
 *   // 3. 인증 토큰과 함께 auth 이벤트 전송
 *   socket.emit('auth', {
 *     token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *     deviceId: 'chrome-extension-device-123',
 *     screenId: 'screen-1',
 *   });
 * });
 *
 * // 4. 인증 성공 처리
 * socket.on('auth_success', (data) => {
 *   console.log('인증 성공:', data.screenId);
 *   // 이제 원격 디스플레이 명령을 수신할 준비
 * });
 *
 * // 5. 인증 실패 처리
 * socket.on('auth_failed', (data) => {
 *   console.error('인증 실패:', data.reason);
 *   // reason: 'invalid_token' | 'invalid_payload'
 * });
 *
 * // 6. 인증 타임아웃 처리
 * socket.on('auth_timeout', (data) => {
 *   console.error('인증 타임아웃:', data.reason);
 * });
 *
 * // 7. 기기 교체 알림 (다른 곳에서 같은 기기로 연결됨)
 * socket.on('device:replaced', (data) => {
 *   console.warn('기기가 다른 곳에서 연결되었습니다:', data.reason);
 *   // 기존 연결이 자동으로 종료됨
 * });
 *
 * // 8. 연결 해제 처리
 * socket.on('disconnect', () => {
 *   console.log('서버와의 연결이 해제되었습니다');
 * });
 */

/**
 * JWT 토큰 생성 예제 (서버에서 클라이언트에 전달)
 *
 * 이 토큰은 브라우저 확장이 Socket.IO 연결 시 서버에 전송합니다.
 *
 * @example
 * import { sign } from 'jsonwebtoken';
 *
 * function generateDisplayToken(
 *   deviceId: string,
 *   screenId: string,
 *   userId: string,
 *   expiresIn: string = '7d'
 * ): string {
 *   return sign(
 *     {
 *       sub: userId,
 *       deviceId,
 *       screenId,
 *       scopes: [`display:${screenId}`, 'display:all'], // 권한 배열
 *     },
 *     process.env.JWT_SECRET || 'your-secret-key',
 *     { expiresIn }
 *   );
 * }
 *
 * // 사용 예
 * const token = generateDisplayToken(
 *   'chrome-extension-device-123',
 *   'screen-1',
 *   'user-456'
 * );
 * // 토큰을 클라이언트에 전달
 */

/**
 * 서버 측 원격 명령 전송 예제
 *
 * 인증된 클라이언트에게 명령을 전송하는 방법
 *
 * @example
 * // displayHandlers.ts에서 설정한 io 객체를 사용
 *
 * // 1. 특정 deviceId의 클라이언트에게 명령 전송
 * function sendCommandToDevice(
 *   io: Server,
 *   deviceId: string,
 *   command: string,
 *   data: any
 * ) {
 *   const displayNs = io.of('/display');
 *   const sockets = Array.from(displayNs.sockets.values());
 *
 *   for (const socket of sockets) {
 *     if (socket.data?.deviceId === deviceId) {
 *       socket.emit('remote:command', { command, data });
 *       return true;
 *     }
 *   }
 *   return false;
 * }
 *
 * // 사용 예
 * sendCommandToDevice(io, 'chrome-extension-device-123', 'navigate', {
 *   url: 'https://example.com',
 *   orderNo: 'ORD-12345',
 * });
 *
 * // 2. 특정 screenId의 모든 클라이언트에게 명령 전송
 * function broadcastToScreen(
 *   io: Server,
 *   screenId: string,
 *   event: string,
 *   data: any
 * ) {
 *   const displayNs = io.of('/display');
 *   const sockets = Array.from(displayNs.sockets.values());
 *
 *   for (const socket of sockets) {
 *     if (socket.data?.screenId === screenId) {
 *       socket.emit(event, data);
 *     }
 *   }
 * }
 *
 * // 3. 모든 클라이언트에게 명령 전송
 * function broadcastToAll(io: Server, event: string, data: any) {
 *   io.of('/display').emit(event, data);
 * }
 */
