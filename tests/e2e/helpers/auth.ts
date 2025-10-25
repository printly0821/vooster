/**
 * E2E 테스트용 JWT 토큰 생성 헬퍼
 *
 * 서버와 동일한 JWT_SECRET을 사용하여 테스트 토큰을 생성합니다.
 */

import jwt from 'jsonwebtoken';

/**
 * JWT 시크릿
 *
 * 서버의 SOCKET_JWT_SECRET과 동일해야 함
 */
const JWT_SECRET = process.env.SOCKET_JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * 디스플레이용 JWT 토큰 생성
 *
 * @param screenId - 화면 ID (예: 'screen:e2e:test')
 * @param options - 추가 옵션
 * @returns JWT 토큰 문자열
 *
 * @example
 * const token = generateDisplayToken('screen:e2e:test');
 * // Authorization: Bearer [token]
 */
export function generateDisplayToken(
  screenId: string,
  options?: {
    deviceId?: string;
    expiresIn?: string;
  }
): string {
  const { deviceId = 'e2e-device-001', expiresIn = '1h' } = options || {};

  return jwt.sign(
    {
      sub: `display:${screenId}`,
      deviceId,
      screenId,
      scopes: [`display:${screenId}`],
      type: 'display',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * 승인자(모바일 앱)용 JWT 토큰 생성
 *
 * 페어링 승인 API에서 사용됩니다.
 *
 * @param options - 추가 옵션
 * @returns JWT 토큰 문자열
 *
 * @example
 * const token = generateApproverToken();
 * // POST /api/pair/approve with Authorization: Bearer [token]
 */
export function generateApproverToken(options?: {
  userId?: string;
  expiresIn?: string;
}): string {
  const { userId = 'e2e-approver-001', expiresIn = '1h' } = options || {};

  return jwt.sign(
    {
      sub: userId,
      scopes: ['user:approve'],
      type: 'user',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * 일반 사용자 토큰 생성
 *
 * @param scopes - 권한 범위
 * @param options - 추가 옵션
 * @returns JWT 토큰 문자열
 */
export function generateUserToken(
  scopes: string[],
  options?: {
    userId?: string;
    expiresIn?: string;
  }
): string {
  const { userId = 'e2e-user-001', expiresIn = '1h' } = options || {};

  return jwt.sign(
    {
      sub: userId,
      scopes,
      type: 'user',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn }
  );
}
