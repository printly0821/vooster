/**
 * Chrome Storage API 데이터 스키마 정의
 *
 * 브라우저 확장의 모든 저장 데이터 구조를 타입 안전하게 관리합니다.
 * 페어링 정보, 설정, 상태 등을 포함합니다.
 */

/**
 * 확장 프로그램 설치 및 버전 정보
 *
 * @private 설치 시간과 현재 버전을 추적하여
 *          업그레이드 마이그레이션 감지
 */
export interface InstallInfo {
  /** 설치 버전 (semantic versioning) */
  version: string;
  /** Unix 타임스탬프: 설치 시간 */
  installTime: number;
  /** 마지막 업데이트 시간 */
  lastUpdateTime?: number;
}

/**
 * 디스플레이 페어링 정보
 *
 * WebSocket 연결 및 인증에 필요한
 * 서버 정보와 인증 토큰을 저장합니다.
 */
export interface PairingInfo {
  /** 페어링 완료 여부 */
  isPaired: boolean;
  /** 페어링된 디스플레이 ID (UUID) */
  displayId?: string;
  /** 디스플레이 이름 */
  displayName?: string;
  /** WebSocket 서버 주소 (wss://...) */
  wsServerUrl?: string;
  /** JWT 인증 토큰 */
  authToken?: string;
  /** 토큰 만료 시간 (Unix timestamp) */
  tokenExpiresAt?: number;
  /** 페어링 시간 (Unix timestamp) */
  pairedAt?: number;
}

/**
 * 사용자 설정 (옵션 페이지에서 관리 가능)
 *
 * 확장 프로그램의 동작을 커스터마이징하는
 * 사용자 설정값들입니다.
 */
export interface UserSettings {
  /** 바코드 스캔 자동 인식 활성화 */
  autoScanEnabled: boolean;
  /** 음성 피드백 활성화 */
  soundEnabled: boolean;
  /** 진동 피드백 활성화 (모바일) */
  vibrationEnabled: boolean;
  /** 로그 레벨 (debug, info, warn, error) */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 자동 재연결 시도 횟수 */
  autoReconnectRetries: number;
  /** 연결 타임아웃 (밀리초) */
  connectionTimeoutMs: number;
}

/**
 * 런타임 상태 정보
 *
 * Service Worker의 현재 상태를 추적합니다.
 * 메모리에만 저장되지만 참조용으로 저장합니다.
 */
export interface RuntimeState {
  /** 웹소켓 연결 상태 (connected, disconnected, connecting) */
  wsConnectionStatus: 'connected' | 'disconnected' | 'connecting';
  /** 마지막 성공 연결 시간 (Unix timestamp) */
  lastConnectedAt?: number;
  /** 마지막 에러 메시지 */
  lastErrorMessage?: string;
  /** 마지막 에러 발생 시간 (Unix timestamp) */
  lastErrorAt?: number;
  /** 연결 재시도 횟수 */
  reconnectAttempts: number;
}

/**
 * 확장 프로그램 로그 항목
 *
 * 디버깅 및 문제 추적을 위한 로그를 저장합니다.
 */
export interface LogEntry {
  /** 로그 레벨 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 로그 메시지 */
  message: string;
  /** 추가 데이터 (JSON 직렬화 가능한 객체) */
  data?: Record<string, unknown>;
  /** 로그 생성 시간 (ISO 8601) */
  timestamp: string;
  /** 로그 소스 (component 이름) */
  source?: string;
}

/**
 * 전체 Storage 스키마
 *
 * Chrome Storage Local에 저장되는 모든 데이터의
 * 완전한 구조를 정의합니다.
 *
 * @example
 * // Storage에서 데이터 읽기
 * const config = await chrome.storage.local.get('pairing');
 * const pairing: PairingInfo = config.pairing;
 */
export interface StorageSchema {
  /** 설치 및 버전 정보 */
  installInfo?: InstallInfo;

  /** 디스플레이 페어링 정보 */
  pairing?: PairingInfo;

  /** 사용자 설정 (기본값 포함) */
  settings?: UserSettings;

  /** 런타임 상태 (임시) */
  runtimeState?: RuntimeState;

  /** 최근 로그 (최대 100개) */
  logs?: LogEntry[];

  /** 캐시된 바코드 스캔 히스토리 */
  barcodeHistory?: string[];

  /** 사용자 정의 데이터 (향후 확장용) */
  customData?: Record<string, unknown>;
}

/**
 * Storage 키 타입 안전 조회를 위한 헬퍼
 *
 * @example
 * type InstallInfoKey = StorageKey<'installInfo'>;
 */
export type StorageKey<T extends keyof StorageSchema> = T;

/**
 * Storage 키 상수
 *
 * 오타 방지를 위해 상수로 정의합니다.
 */
export const STORAGE_KEYS = {
  INSTALL_INFO: 'installInfo' as const,
  PAIRING: 'pairing' as const,
  SETTINGS: 'settings' as const,
  RUNTIME_STATE: 'runtimeState' as const,
  LOGS: 'logs' as const,
  BARCODE_HISTORY: 'barcodeHistory' as const,
  CUSTOM_DATA: 'customData' as const,
} as const;

/**
 * 기본 설정값
 *
 * 확장 설치 시 초기화되는 기본 사용자 설정입니다.
 */
export const DEFAULT_SETTINGS: UserSettings = {
  autoScanEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  logLevel: 'info',
  autoReconnectRetries: 5,
  connectionTimeoutMs: 5000,
};

/**
 * 기본 런타임 상태
 *
 * Service Worker 시작 시 초기화되는 상태입니다.
 */
export const DEFAULT_RUNTIME_STATE: RuntimeState = {
  wsConnectionStatus: 'disconnected',
  reconnectAttempts: 0,
};

/**
 * 현재 확장 버전
 *
 * manifest.json과 동기화 유지 필요
 */
export const EXTENSION_VERSION = '0.1.0';
