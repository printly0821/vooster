/**
 * Socket.IO 소켓 관리 유틸리티
 *
 * 네임스페이스 내 소켓 검색, 기존 연결 정리 등의 관리 기능을 제공합니다.
 */

import { Namespace, Socket } from 'socket.io';
import { logger } from './logger';

/**
 * 네임스페이스에서 특정 deviceId를 가진 소켓을 찾습니다.
 *
 * 네임스페이스의 모든 소켓을 순회하며 socket.data.deviceId가
 * 요청한 deviceId와 일치하는 소켓을 반환합니다.
 *
 * @param namespace - 검색할 Socket.IO 네임스페이스
 * @param deviceId - 찾을 기기의 고유 식별자
 * @returns 일치하는 소켓 객체, 없으면 null
 *
 * @example
 * const socket = findSocketByDeviceId(io.of('/display'), 'device-123');
 * if (socket) {
 *   console.log('소켓 찾음:', socket.id);
 * }
 */
export function findSocketByDeviceId(namespace: Namespace, deviceId: string): Socket | null {
  // 1. 네임스페이스의 모든 소켓 순회
  const sockets = Array.from(namespace.sockets.values());

  // 2. deviceId 일치 확인
  for (const socket of sockets) {
    if (socket.data?.deviceId === deviceId) {
      return socket;
    }
  }

  // 3. 일치하는 소켓 없음
  return null;
}

/**
 * 동일한 deviceId를 가진 기존 소켓을 찾아 강제로 연결을 해제합니다.
 *
 * 같은 기기에서 새로운 연결이 들어올 때 기존 연결을 정리하는 데 사용됩니다.
 * 기존 소켓이 발견되면 'device:replaced' 이벤트를 발송한 후 disconnect 합니다.
 *
 * @param namespace - 검색할 Socket.IO 네임스페이스
 * @param deviceId - 정리할 기기의 고유 식별자
 * @returns 소켓 연결 해제 성공 여부
 *
 * @example
 * const disconnected = disconnectExistingDevice(io.of('/display'), 'device-123');
 * if (disconnected) {
 *   console.log('기존 연결 정리됨');
 * }
 */
export function disconnectExistingDevice(namespace: Namespace, deviceId: string): boolean {
  // 1. 기존 소켓 찾기
  const existingSocket = findSocketByDeviceId(namespace, deviceId);

  // 2. 기존 소켓이 없으면 false 반환
  if (!existingSocket) {
    return false;
  }

  // 3. 클라이언트에 기기 교체 알림
  existingSocket.emit('device:replaced', {
    reason: '같은 기기로 새로운 연결이 감지되었습니다.',
    timestamp: new Date().toISOString(),
  });

  // 4. 기존 소켓 강제 연결 해제
  const oldSocketId = existingSocket.id;
  existingSocket.disconnect(true);

  // 5. 로그 기록
  logger.info('기존 기기 연결 정리: deviceId=%s, socketId=%s', deviceId, oldSocketId);

  // 6. 성공 반환
  return true;
}
