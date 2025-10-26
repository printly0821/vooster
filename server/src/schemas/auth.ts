/**
 * 인증 관련 Zod 검증 스키마
 *
 * JWT 클레임, 권한, 인증 토큰 검증
 */

import { z } from 'zod';

/**
 * JWT 클레임 검증 스키마
 *
 * JWT 토큰에서 추출한 데이터 검증
 */
export const jwtClaimsSchema = z.object({
  sub: z
    .string()
    .min(1, '사용자 ID는 필수입니다'),

  deviceId: z
    .string()
    .min(1, '디바이스 ID는 필수입니다'),

  screenId: z
    .string()
    .regex(
      /^screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
      '화면 ID 형식이 잘못되었습니다',
    ),

  scopes: z
    .array(z.string().min(1, '권한은 비어있을 수 없습니다'))
    .min(1, '권한은 최소 1개 이상이어야 합니다'),

  iat: z
    .number()
    .int('발급 시간은 정수여야 합니다')
    .positive('발급 시간은 양수여야 합니다'),

  exp: z
    .number()
    .int('만료 시간은 정수여야 합니다')
    .positive('만료 시간은 양수여야 합니다'),

  type: z
    .literal('display')
    .optional(),
});

/**
 * 타입 추론: JWTClaims
 */
export type JWTClaims = z.infer<typeof jwtClaimsSchema>;

/**
 * 권한(scope) 검증 스키마
 *
 * 권한 형식: 'display:screenId' (예: 'display:screen-prod-line1')
 */
export const scopeSchema = z
  .string()
  .regex(
    /^display:screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
    '권한 형식이 잘못되었습니다 (예: display:screen:prod:line-1)',
  );

/**
 * 타입 추론: Scope
 */
export type Scope = z.infer<typeof scopeSchema>;

/**
 * 권한 배열 검증 스키마
 *
 * 여러 개의 권한 검증
 */
export const scopesSchema = z
  .array(scopeSchema)
  .min(1, '권한은 최소 1개 이상이어야 합니다')
  .max(100, '권한은 최대 100개까지만 가능합니다');

/**
 * 타입 추론: Scopes
 */
export type Scopes = z.infer<typeof scopesSchema>;

/**
 * Bearer 토큰 추출 스키마
 *
 * Authorization: Bearer <token> 헤더에서 토큰 추출
 */
export const bearerTokenSchema = z
  .string()
  .regex(
    /^Bearer\s+(\S+)$/,
    'Authorization 헤더 형식이 잘못되었습니다. "Bearer <token>" 형식이어야 합니다',
  )
  .transform((val) => {
    const match = val.match(/^Bearer\s+(\S+)$/);
    return match ? match[1] : '';
  });

/**
 * 타입 추론: BearerToken
 */
export type BearerToken = z.infer<typeof bearerTokenSchema>;

/**
 * 사용자 ID 검증 스키마
 *
 * 사용자 ID는 최소 1자 이상의 문자열
 */
export const userIdSchema = z
  .string()
  .min(1, '사용자 ID는 필수입니다')
  .max(100, '사용자 ID는 100자 이내여야 합니다');

/**
 * 타입 추론: UserId
 */
export type UserId = z.infer<typeof userIdSchema>;

/**
 * 사용자 역할 검증 스키마
 *
 * 향후 확장을 위해 enum 형태로 정의
 */
export const userRoleSchema = z.enum(['admin', 'operator', 'viewer']);

/**
 * 타입 추론: UserRole
 */
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * IP 주소 검증 스키마
 *
 * IPv4 또는 IPv6 주소 검증
 */
export const ipAddressSchema = z
  .string()
  .ip();

/**
 * 타입 추론: IpAddress
 */
export type IpAddress = z.infer<typeof ipAddressSchema>;

/**
 * 인증 컨텍스트 검증 스키마
 *
 * 미들웨어에서 생성한 인증 컨텍스트 검증
 */
export const authContextSchema = z.object({
  userId: userIdSchema,
  role: userRoleSchema,
  scopes: scopesSchema,
  ip: z.string().min(1, 'IP 주소는 필수입니다'),
  issuedAt: z
    .number()
    .int('발급 시간은 정수여야 합니다')
    .positive('발급 시간은 양수여야 합니다'),
  expiresAt: z
    .number()
    .int('만료 시간은 정수여야 합니다')
    .positive('만료 시간은 양수여야 합니다'),
});

/**
 * 타입 추론: AuthContext
 */
export type AuthContext = z.infer<typeof authContextSchema>;

/**
 * Rate limit 설정 검증 스키마
 */
export const rateLimitConfigSchema = z.object({
  endpoint: z
    .string()
    .min(1, '엔드포인트는 필수입니다')
    .startsWith('/', '엔드포인트는 /로 시작해야 합니다'),

  perSecondIp: z
    .number()
    .int('IP 기반 제한은 정수여야 합니다')
    .positive('IP 기반 제한은 양수여야 합니다')
    .optional(),

  perMinuteUser: z
    .number()
    .int('사용자 기반 제한은 정수여야 합니다')
    .positive('사용자 기반 제한은 양수여야 합니다')
    .optional(),

  burstSize: z
    .number()
    .int('버스트 크기는 정수여야 합니다')
    .positive('버스트 크기는 양수여야 합니다')
    .optional(),
});

/**
 * 타입 추론: RateLimitConfig
 */
export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;

/**
 * Rate limit 상태 검증 스키마
 */
export const rateLimitStateSchema = z.object({
  count: z
    .number()
    .int('요청 개수는 정수여야 합니다')
    .min(0, '요청 개수는 0 이상이어야 합니다'),

  windowStart: z
    .number()
    .int('창 시작 시간은 정수여야 합니다')
    .positive('창 시작 시간은 양수여야 합니다'),

  lastRequestAt: z
    .number()
    .int('마지막 요청 시간은 정수여야 합니다')
    .positive('마지막 요청 시간은 양수여야 합니다'),
});

/**
 * 타입 추론: RateLimitState
 */
export type RateLimitState = z.infer<typeof rateLimitStateSchema>;

/**
 * 토큰 만료 시간 검증 스키마
 *
 * 초 단위의 Unix 타임스탐프
 */
export const tokenExpirationSchema = z
  .number()
  .int('토큰 만료 시간은 정수여야 합니다')
  .positive('토큰 만료 시간은 양수여야 합니다');

/**
 * 타입 추론: TokenExpiration
 */
export type TokenExpiration = z.infer<typeof tokenExpirationSchema>;
