/**
 * 서버 API 요청/응답 타입 정의
 *
 * T-014에서 구현된 백엔드 API와 통신하기 위한
 * 요청 바디, 응답 데이터, 에러 타입을 정의합니다.
 */

/**
 * 디스플레이 등록 요청 바디
 *
 * @example
 * const request: RegisterDisplayRequest = {
 *   deviceId: 'uuid-v4-string',
 *   name: 'My Display',
 *   metadata: { browser: 'Chrome', os: 'macOS' }
 * };
 */
export interface RegisterDisplayRequest {
  /** 디바이스 고유 ID (UUID v4) - 브라우저 확장에서 생성 */
  deviceId: string;
  /** 디스플레이 이름 (사용자 입력) */
  name: string;
  /** 선택적 메타데이터 (브라우저 정보, OS 등) */
  metadata?: Record<string, unknown>;
}

/**
 * 디스플레이 등록 성공 응답
 *
 * 서버에서 생성된 displayId를 받아 Storage에 저장합니다.
 */
export interface RegisterDisplayResponse {
  /** 서버에서 생성한 디스플레이 ID (UUID) */
  displayId: string;
  /** 등록 성공 메시지 */
  message: string;
}

/**
 * 페어링 QR 생성 요청 바디
 *
 * @example
 * const request: CreatePairingQRRequest = {
 *   displayId: 'display-uuid',
 *   ttl: 180000 // 3분
 * };
 */
export interface CreatePairingQRRequest {
  /** 등록된 디스플레이 ID */
  displayId: string;
  /** QR 코드 유효 시간 (밀리초, 기본 3분) */
  ttl?: number;
}

/**
 * 페어링 QR 생성 성공 응답
 *
 * 페어링 토큰을 받아 QR 코드로 렌더링합니다.
 */
export interface CreatePairingQRResponse {
  /** 페어링 토큰 (짧은 랜덤 문자열, 예: "ABC123") */
  pairingToken: string;
  /** 토큰 만료 시간 (Unix timestamp 밀리초) */
  expiresAt: number;
  /** 서버 메시지 */
  message: string;
}

/**
 * 페어링 폴링 응답
 *
 * 3초 간격으로 폴링하여 페어링 완료 여부를 확인합니다.
 */
export interface PollPairingResponse {
  /** 페어링 완료 여부 */
  isPaired: boolean;
  /** WebSocket 서버 URL (페어링 완료 시에만 제공) */
  wsServerUrl?: string;
  /** JWT 인증 토큰 (페어링 완료 시에만 제공) */
  authToken?: string;
  /** 토큰 만료 시간 (Unix timestamp 밀리초) */
  tokenExpiresAt?: number;
  /** 서버 메시지 */
  message: string;
}

/**
 * API 에러 응답
 *
 * 모든 API 엔드포인트에서 에러 발생 시 반환됩니다.
 */
export interface ApiErrorResponse {
  /** 에러 코드 (HTTP 상태 코드 또는 커스텀 코드) */
  code: number;
  /** 에러 메시지 (사용자에게 표시 가능한 메시지) */
  message: string;
  /** 선택적 상세 정보 (디버깅용) */
  details?: Record<string, unknown>;
}

/**
 * API 베이스 URL
 *
 * 개발 환경에서는 localhost:3000을 사용합니다.
 */
export const API_BASE_URL = 'http://localhost:3000';

/**
 * API 엔드포인트 경로
 */
export const API_ENDPOINTS = {
  /** 디스플레이 등록: POST /api/display/register */
  REGISTER_DISPLAY: '/api/display/register',
  /** 페어링 QR 생성: POST /api/pairing/qr */
  CREATE_PAIRING_QR: '/api/pairing/qr',
  /** 페어링 폴링: GET /api/pairing/poll/:displayId */
  POLL_PAIRING: '/api/pairing/poll',
} as const;
