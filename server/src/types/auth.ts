/**
 * 인증 및 권한 관련 타입 정의
 *
 * JWT 클레임, 인증 컨텍스트, Rate limiting 설정 관련 타입들
 */

/**
 * 디스플레이용 JWT 토큰 페이로드
 *
 * 브라우저 확장이 Socket.IO 연결 시 사용하는 JWT
 * 페어링 승인 후 발급되며, Socket.IO /display 네임스페이스 연결 시 사용
 */
export interface DisplayJWTPayload {
  /** 사용자 ID */
  sub: string;

  /** 디바이스 고유 ID */
  deviceId: string;

  /** 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 권한 배열 (예: 'display:screen-prod-line1') */
  scopes: string[];

  /** 발급 시간 (Unix 타임스탐프) */
  iat: number;

  /** 만료 시간 (Unix 타임스탐프) */
  exp: number;

  /** 토큰 타입 (향후 다른 토큰과 구분용) */
  type?: 'display';
}

/**
 * 인증된 요청의 사용자 컨텍스트
 *
 * 미들웨어에서 JWT를 검증한 후 요청 객체에 첨부
 */
export interface AuthContext {
  /** 사용자 ID */
  userId: string;

  /** 사용자 역할 (향후 확장용) */
  role: string;

  /** JWT 클레임에서 추출한 scopes (예: ['display:screen-1', 'display:screen-2']) */
  scopes: string[];

  /** 요청자 IP 주소 */
  ip: string;

  /** 토큰 발급 시간 (Unix 타임스탐프) */
  issuedAt: number;

  /** 토큰 만료 시간 (Unix 타임스탐프) */
  expiresAt: number;
}

/**
 * Rate Limiting 설정
 *
 * API별로 다른 제한을 적용하기 위한 설정
 */
export interface RateLimitConfig {
  /** API 엔드포인트 (예: '/api/trigger') */
  endpoint: string;

  /** IP 기반 제한 (초당 요청 수) */
  perSecondIp?: number;

  /** 사용자 기반 제한 (분당 요청 수) */
  perMinuteUser?: number;

  /** 토큰 버킷 용량 (버스트 요청 허용) */
  burstSize?: number;
}

/**
 * Rate Limit 상태
 *
 * Redis에 저장되어 추적되는 현재 상태
 */
export interface RateLimitState {
  /** 요청 개수 */
  count: number;

  /** 창 시작 시간 (Unix 타임스탐프) */
  windowStart: number;

  /** 마지막 요청 시간 (Unix 타임스탐프) */
  lastRequestAt: number;
}

/**
 * 사용자의 화면 접근 권한 정보
 *
 * 사용자가 접근 가능한 디스플레이(화면)들의 정보
 */
export interface UserDisplayPermission {
  /** 사용자 ID */
  userId: string;

  /** 접근 가능한 화면 ID 목록 */
  screenIds: string[];

  /** 권한 레벨 (향후 세밀한 권한 제어용) */
  level: 'admin' | 'operator' | 'viewer';

  /** 권한 부여 시간 */
  grantedAt: Date;

  /** 권한 만료 시간 (선택적) */
  expiresAt?: Date;
}

/**
 * 인증 토큰 검증 결과
 *
 * JWT 검증 후 반환되는 결과
 */
export type TokenVerificationResult = TokenVerificationSuccess | TokenVerificationFailed;

/**
 * 토큰 검증 성공
 */
export interface TokenVerificationSuccess {
  /** 성공 여부 */
  ok: true;

  /** 검증된 JWT 페이로드 */
  payload: DisplayJWTPayload;
}

/**
 * 토큰 검증 실패
 */
export interface TokenVerificationFailed {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'invalid_signature' | 'expired' | 'malformed' | 'missing_claims';

  /** 에러 메시지 */
  message: string;
}

/**
 * JWT 클레임 검증 규칙
 *
 * JWT 검증 시 적용되는 규칙들
 */
export interface JWTValidationRules {
  /** 필수 클레임 목록 */
  requiredClaims: string[];

  /** 토큰 만료 시간 (초 단위, 기본 24시간) */
  expirationSeconds: number;

  /** 최소 권한 개수 */
  minScopes: number;

  /** 권한 형식 규칙 (정규식) */
  scopePattern: RegExp;
}

/**
 * 인증 설정
 *
 * 애플리케이션 전체의 인증 관련 설정
 */
export interface AuthConfig {
  /** JWT Secret (환경변수에서 로드) */
  jwtSecret: string;

  /** JWT 토큰 만료 시간 (초 단위) */
  jwtExpirationSeconds: number;

  /** 토큰 검증 strict 모드 여부 */
  strictMode: boolean;

  /** Rate limit IP 기반 초당 요청 수 */
  rateLimitPerSecond: number;

  /** Rate limit 사용자 기반 분당 요청 수 */
  rateLimitPerMinute: number;
}
