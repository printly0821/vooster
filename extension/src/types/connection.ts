/**
 * WebSocket 연결 상태 타입 정의
 *
 * Socket.IO 연결의 생명주기와 상태를 타입 안전하게 관리합니다.
 */

/**
 * 연결 상태 열거형
 *
 * 연결의 현재 상태를 나타냅니다.
 */
export enum ConnectionState {
  /** 연결 해제됨 */
  Disconnected = 'disconnected',
  /** 연결 중 */
  Connecting = 'connecting',
  /** 연결됨 */
  Connected = 'connected',
  /** 오류 발생 */
  Error = 'error',
  /** 재연결 중 */
  Reconnecting = 'reconnecting',
}

/**
 * 재연결 전략 설정
 *
 * 지수 백오프를 사용하여 재연결을 시도합니다.
 */
export interface ReconnectionConfig {
  /** 초기 재연결 대기 시간 (ms) */
  initialDelay: number;
  /** 최대 재연결 대기 시간 (ms) */
  maxDelay: number;
  /** 재연결 시도 횟수 (0 = 무한) */
  maxAttempts: number;
  /** 지수 백오프 배수 */
  backoffFactor: number;
}

/**
 * 기본 재연결 설정
 *
 * T-012 서버 스펙에 따른 기본값:
 * - 초기 1초에서 시작하여 최대 30초까지 증가
 * - 최대 10회 재시도
 */
export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  backoffFactor: 1.5,
};

/**
 * 연결 에러 타입
 *
 * 발생 가능한 모든 연결 에러를 분류합니다.
 */
export enum ConnectionErrorType {
  /** 네트워크 연결 실패 */
  NetworkError = 'network_error',
  /** 인증 실패 */
  AuthError = 'auth_error',
  /** 서버 오류 */
  ServerError = 'server_error',
  /** 타임아웃 */
  Timeout = 'timeout',
  /** 일반 오류 */
  Unknown = 'unknown',
}

/**
 * 연결 에러 정보
 */
export interface ConnectionError {
  /** 에러 타입 */
  type: ConnectionErrorType;
  /** 에러 메시지 */
  message: string;
  /** 원본 에러 */
  originalError?: Error;
  /** 재시도 가능 여부 */
  retryable: boolean;
  /** 에러 발생 시간 */
  timestamp: number;
}

/**
 * 연결 이벤트
 *
 * 연결 생명주기 중 발생하는 이벤트들입니다.
 */
export enum ConnectionEvent {
  /** 연결 시작 */
  Connecting = 'connecting',
  /** 연결 완료 */
  Connected = 'connected',
  /** 연결 해제 */
  Disconnected = 'disconnected',
  /** 인증 성공 */
  Authenticated = 'authenticated',
  /** 인증 실패 */
  AuthenticationFailed = 'authentication_failed',
  /** 재연결 시도 */
  Reconnecting = 'reconnecting',
  /** 재연결 실패 */
  ReconnectionFailed = 'reconnection_failed',
  /** 에러 발생 */
  Error = 'error',
}

/**
 * 연결 이벤트 핸들러 맵
 *
 * 각 이벤트별 핸들러를 등록합니다.
 */
export interface ConnectionEventHandlers {
  /** 연결 시작 */
  [ConnectionEvent.Connecting]?: () => void;
  /** 연결 완료 */
  [ConnectionEvent.Connected]?: () => void;
  /** 연결 해제 */
  [ConnectionEvent.Disconnected]?: () => void;
  /** 인증 성공 */
  [ConnectionEvent.Authenticated]?: () => void;
  /** 인증 실패 */
  [ConnectionEvent.AuthenticationFailed]?: (reason: string) => void;
  /** 재연결 시도 */
  [ConnectionEvent.Reconnecting]?: (attempt: number) => void;
  /** 재연결 실패 */
  [ConnectionEvent.ReconnectionFailed]?: (reason: string) => void;
  /** 에러 발생 */
  [ConnectionEvent.Error]?: (error: ConnectionError) => void;
}

/**
 * 연결 통계
 *
 * 연결 모니터링을 위한 통계 정보입니다.
 */
export interface ConnectionStats {
  /** 마지막 성공 연결 시간 */
  lastConnectedAt?: number;
  /** 마지막 에러 시간 */
  lastErrorAt?: number;
  /** 마지막 에러 메시지 */
  lastErrorMessage?: string;
  /** 총 재연결 시도 횟수 */
  totalReconnectionAttempts: number;
  /** 현재 재연결 시도 카운트 */
  currentReconnectionAttempt: number;
}

/**
 * 기본 연결 통계
 */
export const DEFAULT_CONNECTION_STATS: ConnectionStats = {
  totalReconnectionAttempts: 0,
  currentReconnectionAttempt: 0,
};
