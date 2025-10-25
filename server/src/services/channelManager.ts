/**
 * 채널 관리 서비스
 *
 * Socket.IO 채널의 구독, 메시지 브로드캐스트, ACK 처리 및 중복 필터링을 담당합니다
 * - screenId 기반 채널 룸 관리
 * - txId 기반 idempotency 필터링 (최근 100개 캐시)
 * - 메시지 브로드캐스트 및 클라이언트 추적
 * - ACK 이벤트 처리 및 로깅
 */

import { Server, Socket, Namespace } from 'socket.io';
import { logger } from '../utils/logger';
import { AckMessage, ChannelStatus, EmitResult } from '../types';

/**
 * 최근 100개의 txId를 캐시하여 중복 메시지를 필터링합니다
 */
const recentTxIds = new Set<string>();
const MAX_TX_CACHE_SIZE = 100;

/**
 * txId가 이미 처리되었는지 확인합니다
 *
 * @param txId - 트랜잭션 ID
 * @returns 중복 여부 (true: 이미 처리됨, false: 새로운 요청)
 */
function isDuplicateTx(txId: string): boolean {
  return recentTxIds.has(txId);
}

/**
 * 새로운 txId를 캐시에 추가합니다
 *
 * FIFO 방식으로 오래된 txId를 제거하여 메모리 사용량을 일정하게 유지합니다
 *
 * @param txId - 트랜잭션 ID
 */
function addTxId(txId: string): void {
  recentTxIds.add(txId);

  // 캐시 크기가 초과하면 가장 오래된 항목 제거 (FIFO)
  if (recentTxIds.size > MAX_TX_CACHE_SIZE) {
    const first = recentTxIds.values().next().value;
    recentTxIds.delete(first);
  }
}

/**
 * 클라이언트를 screenId 채널에 구독합니다
 *
 * 인증 성공 후 호출되며, 클라이언트가 해당 screenId 채널의 메시지를 수신할 수 있도록 등록합니다
 * ACK 이벤트 리스너를 함께 등록하여 클라이언트의 응답을 처리합니다
 *
 * @param socket - Socket.IO 소켓 인스턴스
 * @param screenId - 화면 ID (채널 식별자)
 *
 * @example
 * // 인증 성공 후 호출
 * handleDisplayAuth() {
 *   // ... 인증 로직
 *   subscribeToChannel(socket, screenId);
 * }
 */
export function subscribeToChannel(socket: Socket, screenId: string): void {
  // 1. screenId 채널에 소켓 추가 (room join)
  socket.join(screenId);

  // 2. ACK 이벤트 리스너 등록
  // 클라이언트가 메시지 처리 결과를 서버로 전송할 때 호출
  socket.on('ack', (data: AckMessage) => {
    logAck(data.txId, data.result, screenId, data.tabId, data.error);
  });

  // 3. 채널 구독 로깅
  const deviceId = (socket.data as any)?.deviceId || 'unknown';
  logger.info('채널 구독: screenId=%s, deviceId=%s, socketId=%s', screenId, deviceId, socket.id);
}

/**
 * 특정 채널로 메시지를 브로드캐스트합니다
 *
 * 지정된 screenId 채널의 모든 연결된 클라이언트에게 메시지를 전송합니다
 * txId 기반 중복 필터링과 클라이언트 존재 확인을 수행합니다
 *
 * @param io - Socket.IO 서버 인스턴스
 * @param screenId - 메시지를 수신할 채널 ID
 * @param eventType - 이벤트 타입 (navigate, command, update 등)
 * @param payload - 메시지 페이로드 (txId, data 등 포함)
 * @returns EmitResult - 브로드캐스트 결과
 *
 * @example
 * const result = emitToChannel(io, 'screen-1', 'navigate', {
 *   txId: 'tx-001',
 *   url: 'https://example.com',
 *   timestamp: Date.now()
 * });
 * if (result.ok) {
 *   console.log(`${result.clientCount}개 클라이언트로 메시지 전송 완료`);
 * } else {
 *   console.log(`전송 실패: ${result.reason}`);
 * }
 */
export function emitToChannel(
  io: Server,
  screenId: string,
  eventType: string,
  payload: any
): EmitResult {
  try {
    const { txId } = payload;

    // 1. 입력값 검증
    if (!txId || !screenId || !eventType) {
      logger.warn('emitToChannel 입력값 누락: screenId=%s, eventType=%s, txId=%s', screenId, eventType, txId);
      return {
        ok: false,
        reason: 'error',
      };
    }

    // 2. 중복 txId 확인 (idempotency)
    if (isDuplicateTx(txId)) {
      logger.debug('중복 메시지 필터링: screenId=%s, txId=%s, eventType=%s', screenId, txId, eventType);
      return {
        ok: false,
        txId,
        reason: 'duplicate',
      };
    }

    // 3. txId를 캐시에 추가
    addTxId(txId);

    // 4. /display 네임스페이스에서 채널 룸 조회
    const displayNs: Namespace = io.of('/display');
    const room = displayNs.adapter.rooms.get(screenId);

    // 5. 채널에 연결된 클라이언트 확인
    if (!room || room.size === 0) {
      logger.warn('클라이언트 없음: screenId=%s, txId=%s, eventType=%s', screenId, txId, eventType);
      return {
        ok: false,
        txId,
        reason: 'no_clients',
      };
    }

    // 6. 메시지 브로드캐스트
    // to(screenId)는 해당 room의 모든 소켓에게만 메시지 전송
    displayNs.to(screenId).emit(eventType, payload);

    const clientCount = room.size;

    // 7. 브로드캐스트 성공 로깅
    logger.info('메시지 브로드캐스트: screenId=%s, eventType=%s, txId=%s, clientCount=%d', screenId, eventType, txId, clientCount);

    // 8. 결과 반환
    return {
      ok: true,
      txId,
      clientCount,
    };
  } catch (error) {
    logger.error('emitToChannel 에러: screenId=%s, eventType=%s, error=%s', screenId, eventType, (error as Error).message);
    return {
      ok: false,
      reason: 'error',
    };
  }
}

/**
 * 특정 채널의 상태를 조회합니다
 *
 * 채널에 현재 연결된 클라이언트 수와 온라인 여부를 반환합니다
 * 모니터링 API에서 채널 상태를 확인할 때 사용됩니다
 *
 * @param io - Socket.IO 서버 인스턴스
 * @param screenId - 상태를 조회할 채널 ID
 * @returns ChannelStatus - 채널 상태 정보
 *
 * @example
 * const status = getChannelStatus(io, 'screen-1');
 * console.log(`화면 1: ${status.connected}개 클라이언트 연결됨`);
 * if (status.online) {
 *   console.log('화면이 온라인입니다');
 * }
 */
export function getChannelStatus(io: Server, screenId: string): ChannelStatus {
  try {
    const displayNs: Namespace = io.of('/display');
    const room = displayNs.adapter.rooms.get(screenId);

    const connected = room ? room.size : 0;
    const online = connected > 0;

    logger.debug('채널 상태 조회: screenId=%s, connected=%d, online=%s', screenId, connected, online);

    return {
      screenId,
      connected,
      online,
    };
  } catch (error) {
    logger.error('getChannelStatus 에러: screenId=%s, error=%s', screenId, (error as Error).message);
    return {
      screenId,
      connected: 0,
      online: false,
    };
  }
}

/**
 * 클라이언트의 ACK 메시지를 로깅합니다
 *
 * 클라이언트가 메시지를 수신하고 처리한 후 전송하는 ACK를 기록합니다
 * 향후 데이터베이스 저장이나 모니터링 시스템으로의 확장이 가능하도록 설계되었습니다
 *
 * @param txId - 원본 메시지의 트랜잭션 ID
 * @param result - 실행 결과 (success | failed | timeout)
 * @param screenId - ACK를 전송한 클라이언트의 화면 ID
 * @param tabId - 선택적, 브라우저 탭 ID
 * @param error - 선택적, 실패 시 에러 메시지
 *
 * @example
 * // 클라이언트에서 수신한 ACK
 * socket.on('ack', (data) => {
 *   logAck(data.txId, data.result, screenId, data.tabId, data.error);
 * });
 */
export function logAck(
  txId: string,
  result: 'success' | 'failed' | 'timeout',
  screenId: string,
  tabId?: string,
  error?: string
): void {
  try {
    if (result === 'success') {
      logger.info('ACK 수신 (성공): txId=%s, screenId=%s, tabId=%s', txId, screenId, tabId || 'none');
    } else if (result === 'failed') {
      logger.warn('ACK 수신 (실패): txId=%s, screenId=%s, tabId=%s, error=%s', txId, screenId, tabId || 'none', error || 'unknown');
    } else if (result === 'timeout') {
      logger.warn('ACK 수신 (타임아웃): txId=%s, screenId=%s, tabId=%s', txId, screenId, tabId || 'none');
    }

    // 향후 확장: DB 저장, 모니터링 시스템 알림 등
    // await saveAckLog({ txId, result, screenId, tabId, error, ts: Date.now() });
  } catch (error) {
    logger.error('logAck 에러: txId=%s, error=%s', txId, (error as Error).message);
  }
}
