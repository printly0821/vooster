/**
 * Socket.IO 클라이언트
 *
 * T-012 서버의 `/display` 네임스페이스와 연결하고
 * 원격 탭 제어 메시지를 처리합니다.
 *
 * 주요 기능:
 * - Socket.IO 자동 연결/재연결
 * - JWT 인증 처리
 * - 메시지 송수신 및 ACK
 * - 연결 상태 모니터링
 * - 배지 업데이트
 */

import type {
  AckMessage,
  SocketAuthData,
} from '../types/socket.js';
import type { ConnectionError, ConnectionEventHandlers } from '../types/connection.js';
import { ConnectionState, ConnectionErrorType, DEFAULT_RECONNECTION_CONFIG } from '../types/connection.js';
import { updateRuntimeState, addLog } from '../utils/storage.js';

/**
 * Socket.IO 클라이언트 클래스
 *
 * 책임:
 * - Socket.IO 연결 관리
 * - 인증 및 재연결
 * - 메시지 송수신
 * - 에러 처리 및 복구
 */
export class SocketClient {
  /**
   * Socket.IO 소켓 인스턴스
   *
   * 동적으로 로드되는 Socket.IO 클라이언트 라이브러리
   * @private
   */
  private socket: any = null;

  /**
   * 현재 연결 상태
   * @private
   */
  private connectionState: ConnectionState = ConnectionState.Disconnected;

  /**
   * 인증 데이터
   * @private
   */
  private authData: SocketAuthData | null = null;

  /**
   * 이벤트 핸들러 맵
   * @private
   */
  private eventHandlers: ConnectionEventHandlers = {};

  /**
   * 재연결 시도 횟수
   * @private
   */
  // private reconnectionAttempts: number = 0;
  // (Socket.IO 라이브러리가 자동으로 관리함)

  /**
   * Socket.IO 서버 URL
   * @private
   */
  private serverUrl: string;

  /**
   * 생성자
   *
   * @param serverUrl - Socket.IO 서버 URL (기본: http://localhost:3000)
   *
   * @example
   * const client = new SocketClient('http://localhost:3000');
   */
  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  /**
   * 초기화 및 연결 시작
   *
   * @param authData - 인증 정보
   * @param handlers - 이벤트 핸들러 (선택사항)
   * @throws {Error} Socket.IO 라이브러리 로드 실패 시
   *
   * @example
   * await client.connect(
   *   { token: 'jwt-token', deviceId: 'device-123', screenId: 'screen-456' },
   *   { [ConnectionEvent.Connected]: () => console.log('연결됨') }
   * );
   */
  public async connect(authData: SocketAuthData, handlers?: ConnectionEventHandlers): Promise<void> {
    try {
      // 1. Socket.IO 라이브러리 동적 로드
      await this.loadSocketIOLibrary();

      // 2. 인증 데이터 저장
      this.authData = authData;

      // 3. 이벤트 핸들러 등록
      if (handlers) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
      }

      // 4. 상태 업데이트
      this.setConnectionState(ConnectionState.Connecting);

      // 5. Socket.IO 초기화 및 연결
      await this.initializeSocket();

      console.log('[SocketClient] 연결 시작됨');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SocketClient] 연결 실패:', error);

      this.handleConnectionError({
        type: ConnectionErrorType.Unknown,
        message: `연결 초기화 실패: ${errorMsg}`,
        originalError: error instanceof Error ? error : undefined,
        retryable: true,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Socket.IO 라이브러리 동적 로드
   *
   * @private
   * @throws {Error} 라이브러리 로드 실패 시
   */
  private async loadSocketIOLibrary(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Socket.IO는 background 스크립트에 자동으로 주입됨
      // manifest.json에 따라 로드 완료 대기

      if (typeof (globalThis as any).io !== 'undefined') {
        resolve();
      } else {
        // 최대 5초 대기
        const timeout = setTimeout(() => {
          reject(new Error('Socket.IO 라이브러리 로드 타임아웃'));
        }, 5000);

        // 라이브러리 로드 대기
        const checkInterval = setInterval(() => {
          if (typeof (globalThis as any).io !== 'undefined') {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }
    });
  }

  /**
   * Socket.IO 소켓 초기화
   *
   * @private
   * @throws {Error} 소켓 초기화 실패 시
   */
  private async initializeSocket(): Promise<void> {
    if (!this.authData) {
      throw new Error('인증 데이터가 없습니다');
    }

    const io = (globalThis as any).io;

    // Socket.IO 옵션 설정
    const options = {
      namespace: '/display',
      reconnection: true,
      reconnectionDelay: DEFAULT_RECONNECTION_CONFIG.initialDelay,
      reconnectionDelayMax: DEFAULT_RECONNECTION_CONFIG.maxDelay,
      reconnectionAttempts: DEFAULT_RECONNECTION_CONFIG.maxAttempts,
      auth: {
        token: this.authData.token,
        deviceId: this.authData.deviceId,
        screenId: this.authData.screenId,
      },
    };

    // Socket.IO 소켓 생성
    this.socket = io(`${this.serverUrl}/display`, options);

    // 이벤트 핸들러 등록
    this.registerSocketEventHandlers();

    // 연결 완료 대기 (최대 5초)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket.IO 연결 타임아웃'));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        reject(new Error(`Socket.IO 연결 오류: ${error.message}`));
      });
    });
  }

  /**
   * Socket.IO 이벤트 핸들러 등록
   *
   * @private
   */
  private registerSocketEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    /**
     * 연결 성공 이벤트
     */
    this.socket.on('connect', () => {
      console.log('[SocketClient] 서버 연결 성공', this.socket.id);

      this.setConnectionState(ConnectionState.Connecting);

      // 인증 시작 (auth_success 이벤트 대기)
      setTimeout(() => {
        if (this.connectionState !== ConnectionState.Connected) {
          console.warn('[SocketClient] 인증 타임아웃');
        }
      }, 5000);
    });

    /**
     * 인증 성공 이벤트
     */
    this.socket.on('auth_success', async () => {
      console.log('[SocketClient] 인증 성공');

      this.setConnectionState(ConnectionState.Connected);

      // 배지 업데이트 (초록색)
      await this.updateBadge('connected');

      // 스토리지 업데이트
      await updateRuntimeState('wsConnectionStatus', 'connected');
      await updateRuntimeState('lastConnectedAt', Date.now());
      await updateRuntimeState('reconnectAttempts', 0);

      // 로그 기록
      await addLog({
        level: 'info',
        message: 'WebSocket 연결 성공',
        source: 'SocketClient',
        timestamp: new Date().toISOString(),
      });

      // 이벤트 핸들러 호출
      this.eventHandlers.authenticated?.();
    });

    /**
     * 인증 실패 이벤트
     */
    this.socket.on('auth_failed', async (data: any) => {
      console.error('[SocketClient] 인증 실패:', data?.reason);

      const reason = data?.reason || 'Unknown reason';
      this.setConnectionState(ConnectionState.Error);

      // 배지 업데이트 (빨강)
      await this.updateBadge('error');

      // 스토리지 업데이트
      await updateRuntimeState('wsConnectionStatus', 'disconnected');
      await updateRuntimeState('lastErrorMessage', `인증 실패: ${reason}`);
      await updateRuntimeState('lastErrorAt', Date.now());

      // 로그 기록
      await addLog({
        level: 'error',
        message: `인증 실패: ${reason}`,
        source: 'SocketClient',
        timestamp: new Date().toISOString(),
      });

      // 이벤트 핸들러 호출
      this.eventHandlers.authentication_failed?.(reason);

      // 소켓 해제 및 재연결
      this.disconnect();
    });

    /**
     * 연결 해제 이벤트
     */
    this.socket.on('disconnect', async (reason: any) => {
      console.log('[SocketClient] 서버 연결 해제:', reason);

      // 인증된 상태에서 의도하지 않은 해제
      if (this.connectionState === ConnectionState.Connected && reason !== 'client namespace disconnect') {
        this.setConnectionState(ConnectionState.Reconnecting);

        // 배지 업데이트 (회색)
        await this.updateBadge('disconnected');

        // 스토리지 업데이트
        await updateRuntimeState('wsConnectionStatus', 'disconnected');

        // 로그 기록
        await addLog({
          level: 'warn',
          message: `연결 해제: ${reason}`,
          source: 'SocketClient',
          timestamp: new Date().toISOString(),
        });

        // 이벤트 핸들러 호출
        this.eventHandlers.disconnected?.();
      }
    });

    /**
     * 연결 오류 이벤트
     */
    this.socket.on('connect_error', async (error: any) => {
      console.error('[SocketClient] 연결 오류:', error);

      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      this.handleConnectionError({
        type: ConnectionErrorType.NetworkError,
        message: `연결 오류: ${errorMsg}`,
        originalError: error instanceof Error ? error : undefined,
        retryable: true,
        timestamp: Date.now(),
      });
    });

    /**
     * 재연결 시도 이벤트
     */
    this.socket.on('reconnect_attempt', async (attemptNumber: number) => {
      console.log('[SocketClient] 재연결 시도:', attemptNumber);

      this.setConnectionState(ConnectionState.Reconnecting);

      // 배지 업데이트 (회색)
      await this.updateBadge('disconnected');

      // 스토리지 업데이트
      await updateRuntimeState('reconnectAttempts', Math.min(attemptNumber, 10));

      // 이벤트 핸들러 호출
      this.eventHandlers.reconnecting?.(attemptNumber);
    });

    /**
     * 재연결 실패 이벤트
     */
    this.socket.on('reconnect_failed', async () => {
      console.error('[SocketClient] 재연결 실패 (최대 시도 초과)');

      this.setConnectionState(ConnectionState.Error);

      // 배지 업데이트 (빨강)
      await this.updateBadge('error');

      // 스토리지 업데이트
      await updateRuntimeState('wsConnectionStatus', 'disconnected');
      await updateRuntimeState('lastErrorMessage', '재연결 최대 시도 초과');

      // 로그 기록
      await addLog({
        level: 'error',
        message: '재연결 실패 (최대 시도 초과)',
        source: 'SocketClient',
        timestamp: new Date().toISOString(),
      });

      // 이벤트 핸들러 호출
      this.eventHandlers.reconnection_failed?.('최대 시도 초과');
    });

    /**
     * 네비게이트 메시지 처리
     *
     * T-013 navigate 이벤트를 처리합니다.
     * navigate-handler.ts에서 별도로 등록된 핸들러에서 처리됨
     */
    this.socket.on('navigate', async (_data: any) => {
      console.log('[SocketClient] Navigate 메시지 수신 (navigate-handler에서 처리)');
      // navigate-handler.ts에서 별도로 등록된 핸들러에서 처리됨
    });

    /**
     * Ping 메시지 (연결 상태 확인)
     */
    this.socket.on('ping', () => {
      console.debug('[SocketClient] Ping 수신');

      // Pong 응답
      this.socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * ACK 메시지 전송
   *
   * navigate 메시지에 대한 응답을 서버로 전송합니다.
   *
   * @param txId - 응답할 트랜잭션 ID
   * @param result - 처리 결과
   * @param tabId - 업데이트된 탭 ID (성공 시)
   *
   * @example
   * await client.sendAck('tx-123', 'success', 456);
   */
  public async sendAck(txId: string, result: 'success' | 'failed', tabId?: number): Promise<void> {
    if (!this.socket || this.connectionState !== ConnectionState.Connected) {
      console.warn('[SocketClient] ACK 전송 실패: 연결되지 않음');
      return;
    }

    const ackMessage: AckMessage = {
      type: 'ack',
      payload: {
        txId,
        result,
        tabId,
        ts: Date.now(),
      },
    };

    try {
      this.socket.emit('ack', ackMessage, (response: any) => {
        if (response?.ok) {
          console.debug('[SocketClient] ACK 전송 완료:', txId);
        } else {
          console.warn('[SocketClient] ACK 전송 실패:', response?.error);
        }
      });
    } catch (error) {
      console.error('[SocketClient] ACK 전송 오류:', error);
    }
  }

  /**
   * 연결 상태 변경 처리
   *
   * @private
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) {
      return;
    }

    const oldState = this.connectionState;
    this.connectionState = state;

    console.log(`[SocketClient] 연결 상태 변경: ${oldState} → ${state}`);
  }

  /**
   * 연결 오류 처리
   *
   * @private
   */
  private async handleConnectionError(error: ConnectionError): Promise<void> {
    console.error('[SocketClient] 연결 오류:', error);

    this.setConnectionState(ConnectionState.Error);

    // 배지 업데이트 (빨강)
    await this.updateBadge('error');

    // 스토리지 업데이트
    await updateRuntimeState('wsConnectionStatus', 'disconnected');
    await updateRuntimeState('lastErrorMessage', error.message);
    await updateRuntimeState('lastErrorAt', Date.now());

    // 로그 기록
    await addLog({
      level: 'error',
      message: `연결 오류: ${error.message}`,
      data: { errorType: error.type, retryable: error.retryable },
      source: 'SocketClient',
      timestamp: new Date().toISOString(),
    });

    // 이벤트 핸들러 호출
    this.eventHandlers.error?.(error);
  }

  /**
   * 배지 업데이트
   *
   * 확장 아이콘 배지 색상을 변경합니다.
   * - green: 연결됨
   * - gray: 연결 안 됨
   * - red: 오류
   *
   * @private
   */
  private async updateBadge(status: 'connected' | 'disconnected' | 'error'): Promise<void> {
    try {
      let color: [number, number, number, number] = [128, 128, 128, 255]; // 회색 (기본)

      if (status === 'connected') {
        color = [0, 255, 0, 255]; // 초록색
      } else if (status === 'error') {
        color = [255, 0, 0, 255]; // 빨강
      }

      // Chrome MV3 배지 색상 설정
      chrome.action?.setBadgeBackgroundColor?.({ color });
      chrome.action?.setBadgeText?.({ text: '' });

      console.debug(`[SocketClient] 배지 업데이트: ${status}`);
    } catch (error) {
      console.warn('[SocketClient] 배지 업데이트 실패:', error);
    }
  }

  /**
   * 연결 종료
   *
   * @example
   * client.disconnect();
   */
  public disconnect(): void {
    if (this.socket) {
      try {
        this.socket.disconnect();
        this.socket = null;
      } catch (error) {
        console.error('[SocketClient] 연결 해제 오류:', error);
      }
    }

    this.setConnectionState(ConnectionState.Disconnected);
  }

  /**
   * 현재 연결 상태 조회
   *
   * @returns 연결 상태
   *
   * @example
   * if (client.getConnectionState() === ConnectionState.Connected) {
   *   console.log('연결됨');
   * }
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Socket.IO 소켓 ID 조회
   *
   * @returns Socket.IO 소켓 ID 또는 null
   *
   * @example
   * const socketId = client.getSocketId();
   */
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * 소켓 객체 직접 접근 (고급)
   *
   * @private
   * @returns Socket.IO 소켓 객체
   */
  public getSocket(): any {
    return this.socket;
  }
}

/**
 * 싱글톤 Socket.IO 클라이언트 인스턴스
 *
 * @private
 */
let globalSocketClient: SocketClient | null = null;

/**
 * 글로벌 Socket.IO 클라이언트 인스턴스 조회
 *
 * @param serverUrl - 서버 URL (첫 초기화 시만 적용)
 * @returns 싱글톤 클라이언트 인스턴스
 *
 * @example
 * const client = getGlobalSocketClient();
 */
export function getGlobalSocketClient(serverUrl?: string): SocketClient {
  if (!globalSocketClient) {
    globalSocketClient = new SocketClient(serverUrl || 'http://localhost:3000');
  }
  return globalSocketClient;
}

/**
 * 글로벌 클라이언트 초기화 (테스트용)
 *
 * @private
 */
export function resetGlobalSocketClient(): void {
  globalSocketClient?.disconnect();
  globalSocketClient = null;
}
