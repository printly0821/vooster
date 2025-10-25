/**
 * 디스플레이 관련 Zod 검증 스키마
 *
 * 디스플레이 등록, 조회 등의 요청 데이터 검증
 */

import { z } from 'zod';

/**
 * 디스플레이 등록 요청 검증 스키마
 *
 * deviceId는 브라우저 확장이 생성한 UUID 또는 기기 식별자
 * orgId, lineId는 하이픈을 포함한 소문자 문자열 (예: prod-line-1)
 */
export const displayRegisterSchema = z.object({
  deviceId: z
    .string()
    .min(1, '디바이스 ID는 필수입니다')
    .max(100, '디바이스 ID는 100자 이내여야 합니다')
    .regex(
      /^[a-zA-Z0-9\-_]+$/,
      '디바이스 ID는 영문, 숫자, 하이픈, 언더스코어만 사용 가능합니다',
    ),

  name: z
    .string()
    .min(1, '디스플레이 이름은 필수입니다')
    .max(100, '디스플레이 이름은 100자 이내여야 합니다'),

  purpose: z
    .string()
    .min(1, '용도는 필수입니다')
    .max(255, '용도는 255자 이내여야 합니다'),

  orgId: z
    .string()
    .min(1, '조직 ID는 필수입니다')
    .regex(
      /^[a-z0-9\-]+$/,
      '조직 ID는 소문자, 숫자, 하이픈만 사용 가능합니다',
    )
    .max(50, '조직 ID는 50자 이내여야 합니다'),

  lineId: z
    .string()
    .min(1, '라인 ID는 필수입니다')
    .regex(
      /^[a-z0-9\-]+$/,
      '라인 ID는 소문자, 숫자, 하이픈만 사용 가능합니다',
    )
    .max(50, '라인 ID는 50자 이내여야 합니다'),
});

/**
 * 타입 추론: DisplayRegisterInput
 */
export type DisplayRegisterInput = z.infer<typeof displayRegisterSchema>;

/**
 * 디스플레이 조회 필터 검증 스키마
 *
 * GET /api/displays의 쿼리 파라미터 검증
 */
export const displayQuerySchema = z.object({
  // 라인 ID로 필터링 (선택적)
  lineId: z
    .string()
    .regex(
      /^[a-z0-9\-]*$/,
      '라인 ID 형식이 잘못되었습니다',
    )
    .optional(),

  // 온라인 상태만 조회할지 여부 (기본값: true)
  onlineOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true' || val === undefined),

  // 조회 결과 수 제한 (기본값: 100, 최대 1000)
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .refine((val) => val >= 1 && val <= 1000, {
      message: '조회 수는 1 이상 1000 이하여야 합니다',
    }),
});

/**
 * 타입 추론: DisplayQueryInput
 */
export type DisplayQueryInput = z.infer<typeof displayQuerySchema>;

/**
 * 화면 ID 검증 스키마
 *
 * URL 파라미터나 쿼리에서 화면 ID 검증
 * 형식: screen:orgId:lineId (예: screen:prod:line-1)
 */
export const screenIdSchema = z
  .string()
  .regex(
    /^screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
    '화면 ID 형식이 잘못되었습니다 (예: screen:prod:line-1)',
  )
  .max(100, '화면 ID는 100자 이내여야 합니다');

/**
 * 타입 추론: ScreenId
 */
export type ScreenId = z.infer<typeof screenIdSchema>;

/**
 * 화면 ID 파싱 스키마
 *
 * screen:orgId:lineId 형식을 분해하여 orgId와 lineId 추출
 *
 * @example
 * ```typescript
 * const result = parseScreenIdSchema.safeParse('screen:prod:line-1');
 * if (result.success) {
 *   const { screenId, orgId, lineId } = result.data;
 *   // screenId: 'screen:prod:line-1'
 *   // orgId: 'prod'
 *   // lineId: 'line-1'
 * }
 * ```
 */
export const parseScreenIdSchema = z
  .string()
  .regex(
    /^screen:([a-z0-9\-]+):([a-z0-9\-]+)$/,
    '화면 ID 형식이 잘못되었습니다',
  )
  .transform((screenId) => {
    const parts = screenId.split(':');
    return {
      screenId,
      orgId: parts[1],
      lineId: parts[2],
    };
  });

/**
 * 타입 추론: ParsedScreenId
 */
export type ParsedScreenId = z.infer<typeof parseScreenIdSchema>;
