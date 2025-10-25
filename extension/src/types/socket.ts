/**
 * Socket.IO 메시지 타입 정의
 *
 * T-012 서버와 T-017 클라이언트 간의 메시지 형식을 정의합니다.
 * 모든 메시지는 타입 안전하게 처리되며 자동 타입 좁히기를 지원합니다.
 */

/**
 * Socket.IO 메시지 기본 구조
 *
 * @template TType - 메시지 타입 식별자
 * @template TPayload - 메시지 페이로드
 */
interface BaseSocketMessage<TType extends string, TPayload = unknown> {
  /** 메시지 타입 (discriminator) */
  type: TType;
  /** 메시지 고유 ID (응답 매칭용) */
  txId?: string;
  /** 페이로드 데이터 */
  payload?: TPayload;
}

// ============================================================================
// 인증 관련 메시지
// ============================================================================

/**
 * Socket.IO 인증 요청
 *
 * T-012 서버 스펙: JWT 토큰 기반 인증
 */
export interface AuthMessage extends BaseSocketMessage<'auth', { token: string; deviceId: string; screenId: string }> {
  type: 'auth';
  payload: {
    /** JWT 인증 토큰 */
    token: string;
    /** 브라우저 확장 기기 ID */
    deviceId: string;
    /** 화면 ID */
    screenId: string;
  };
}

/**
 * 인증 성공 응답
 *
 * 서버에서 인증이 승인되었음을 알립니다.
 */
export interface AuthSuccessMessage extends BaseSocketMessage<'auth_success'> {
  type: 'auth_success';
  payload?: {
    /** 인증 완료 시간 */
    timestamp?: number;
  };
}

/**
 * 인증 실패 응답
 *
 * 서버에서 인증을 거부했음을 알립니다.
 */
export interface AuthFailedMessage extends BaseSocketMessage<'auth_failed', { reason: string }> {
  type: 'auth_failed';
  payload: {
    /** 실패 이유 */
    reason: string;
  };
}

// ============================================================================
// 원격 탭 제어 메시지
// ============================================================================

/**
 * 탭 네비게이션 명령
 *
 * 디스플레이에서 전송된 원격 탭 제어 명령입니다.
 * 브라우저의 탭을 특정 URL로 이동시키거나 새 탭을 만듭니다.
 */
export interface NavigateMessage
  extends BaseSocketMessage<
    'navigate',
    {
      url: string;
      jobNo: string;
      exp: number;
      deviceId?: string;
    }
  > {
  type: 'navigate';
  /** 트랜잭션 ID (ACK 응답에 사용) */
  txId: string;
  payload: {
    /** 이동할 URL */
    url: string;
    /** 작업 고유 번호 (중복 방지용) */
    jobNo: string;
    /** 메시지 만료 시간 (Unix timestamp, ms) */
    exp: number;
    /** 원본 디스플레이 ID (선택사항) */
    deviceId?: string;
  };
}

/**
 * ACK 응답 메시지
 *
 * 클라이언트가 navigate 명령을 수신했음을 확인합니다.
 * T-013 트리거 API의 응답 형식과 일치합니다.
 */
export interface AckMessage
  extends BaseSocketMessage<
    'ack',
    {
      txId: string;
      result: 'success' | 'failed';
      tabId?: number;
      ts: number;
    }
  > {
  type: 'ack';
  payload: {
    /** 응답하는 요청의 txId */
    txId: string;
    /** 처리 결과 상태 */
    result: 'success' | 'failed';
    /** 업데이트된 탭 ID (성공 시) */
    tabId?: number;
    /** ACK 생성 시간 (Unix timestamp, ms) */
    ts: number;
  };
}

// ============================================================================
// 상태 메시지
// ============================================================================

/**
 * 연결 상태 통지
 *
 * 서버에서 주기적으로 전송하여 연결 상태를 확인합니다.
 */
export interface PingMessage extends BaseSocketMessage<'ping'> {
  type: 'ping';
  payload?: {
    /** 핑 시간 */
    timestamp?: number;
  };
}

/**
 * 핑 응답
 *
 * 클라이언트가 서버의 핑에 응답합니다.
 */
export interface PongMessage extends BaseSocketMessage<'pong'> {
  type: 'pong';
  payload?: {
    /** 퐁 시간 */
    timestamp?: number;
  };
}

// ============================================================================
// Discriminated Union 정의
// ============================================================================

/**
 * 서버 → 클라이언트 메시지
 *
 * 서버에서 클라이언트로 전송되는 모든 메시지 타입의 합집합입니다.
 */
export type ServerSocketMessage = AuthSuccessMessage | AuthFailedMessage | NavigateMessage | PingMessage;

/**
 * 클라이언트 → 서버 메시지
 *
 * 클라이언트에서 서버로 전송되는 모든 메시지 타입의 합집합입니다.
 */
export type ClientSocketMessage = AuthMessage | AckMessage | PongMessage;

/**
 * 모든 Socket.IO 메시지
 */
export type SocketMessage = ServerSocketMessage | ClientSocketMessage;

/**
 * Socket.IO 핸들러 함수 타입
 *
 * @template T - 처리할 메시지 타입
 */
export type SocketMessageHandler<T extends SocketMessage> = (message: T) => Promise<void> | void;

/**
 * Socket.IO 메시지 타입 가드
 *
 * @param message - 검사할 메시지
 * @param type - 예상 메시지 타입
 * @returns 타입이 일치하면 true
 *
 * @example
 * if (isSocketMessage(message, 'navigate')) {
 *   // message는 NavigateMessage 타입
 *   const url = message.payload.url;
 * }
 */
export function isSocketMessage<T extends SocketMessage['type']>(
  message: unknown,
  type: T
): message is Extract<SocketMessage, { type: T }> {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  return (message as Record<string, unknown>).type === type;
}

/**
 * Socket.IO 연결 옵션
 *
 * Socket.IO 클라이언트 초기화 시 사용되는 옵션입니다.
 */
export interface SocketConnectionOptions {
  /** 서버 URL */
  url: string;
  /** 네임스페이스 */
  namespace?: string;
  /** 자동 재연결 여부 */
  reconnection?: boolean;
  /** 초기 재연결 대기 시간 (ms) */
  reconnectionDelay?: number;
  /** 최대 재연결 대기 시간 (ms) */
  reconnectionDelayMax?: number;
  /** 최대 재연결 시도 횟수 */
  reconnectionAttempts?: number;
  /** 연결 타임아웃 (ms) */
  connectTimeout?: number;
}

/**
 * Socket.IO 인증 데이터
 *
 * 연결 시 전송할 인증 정보입니다.
 */
export interface SocketAuthData {
  /** JWT 인증 토큰 */
  token: string;
  /** 브라우저 확장 기기 ID */
  deviceId: string;
  /** 화면 ID */
  screenId: string;
}

/**
 * Socket.IO 연결 상태
 */
export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
