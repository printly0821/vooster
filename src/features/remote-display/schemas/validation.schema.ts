/**
 * 공통 검증 스키마
 */

import { z } from 'zod';

/**
 * screenId 형식 검증 스키마
 * 형식: screen:orgId:lineId
 * 예: screen:org-123:cutting-line-a
 */
export const ScreenIdSchema = z
  .string()
  .regex(
    /^screen:[a-z0-9-]+:[a-z0-9-]+$/,
    'screenId 형식이 올바르지 않습니다 (screen:orgId:lineId)'
  );

/**
 * JWT 토큰 검증 스키마
 */
export const JWTTokenSchema = z
  .string()
  .min(1, 'JWT 토큰은 필수입니다')
  .regex(
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    '유효한 JWT 형식이 아닙니다'
  );

/**
 * ISO 8601 날짜 검증 스키마
 */
export const ISO8601DateSchema = z.string().datetime('유효한 ISO 8601 날짜가 필요합니다');

/**
 * URL 검증 스키마 (http/https/ws/wss)
 */
export const URLSchema = z
  .string()
  .url('유효한 URL이 필요합니다')
  .refine(
    (url) => /^(https?|wss?):\/\//.test(url),
    'http, https, ws, wss 프로토콜만 허용됩니다'
  );

/**
 * 6자리 숫자 코드 검증 스키마
 */
export const SixDigitCodeSchema = z
  .string()
  .length(6, '확인 코드는 6자리여야 합니다')
  .regex(/^\d{6}$/, '숫자만 입력 가능합니다');

/**
 * UUID 검증 스키마
 */
export const UUIDSchema = z.string().uuid('유효한 UUID가 필요합니다');

/**
 * 조직 ID 검증 스키마
 */
export const OrgIdSchema = z
  .string()
  .min(1, '조직 ID는 필수입니다')
  .regex(/^[a-z0-9-]+$/, '조직 ID는 소문자, 숫자, 하이픈만 포함 가능합니다');

/**
 * 라인 ID 검증 스키마
 */
export const LineIdSchema = z
  .string()
  .min(1, '라인 ID는 필수입니다')
  .regex(/^[a-z0-9-]+$/, '라인 ID는 소문자, 숫자, 하이픈만 포함 가능합니다');
