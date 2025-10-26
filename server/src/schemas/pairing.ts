/**
 * 페어링 시스템 Zod 검증 스키마
 *
 * 페어링 세션 생성, 승인 등의 요청 데이터 검증
 */

import { z } from 'zod';

/**
 * 페어링 승인 요청 검증 스키마
 *
 * sessionId는 POST /api/pair/qr에서 반환받은 UUID
 * code는 QR에 포함된 6자리 숫자
 *
 * @example
 * ```typescript
 * const input = pairApproveSchema.safeParse({
 *   sessionId: '550e8400-e29b-41d4-a716-446655440000',
 *   code: '123456'
 * });
 * ```
 */
export const pairApproveSchema = z.object({
  sessionId: z
    .string()
    .uuid('세션 ID는 유효한 UUID여야 합니다'),

  code: z
    .string()
    .regex(
      /^\d{6}$/,
      '확인 코드는 정확히 6자리 숫자여야 합니다',
    ),
});

/**
 * 타입 추론: PairApproveInput
 */
export type PairApproveInput = z.infer<typeof pairApproveSchema>;

/**
 * 페어링 세션 ID 검증 스키마
 *
 * URL 파라미터에서 세션 ID 검증 (예: GET /api/pair/poll/:sessionId)
 */
export const pairSessionIdSchema = z
  .string()
  .uuid('세션 ID는 유효한 UUID여야 합니다');

/**
 * 타입 추론: PairSessionId
 */
export type PairSessionId = z.infer<typeof pairSessionIdSchema>;

/**
 * 페이링 코드 검증 스키마
 *
 * 6자리 숫자 형식 검증 (수동 입력용)
 */
export const pairCodeSchema = z
  .string()
  .regex(
    /^\d{6}$/,
    '확인 코드는 정확히 6자리 숫자여야 합니다',
  );

/**
 * 타입 추론: PairCode
 */
export type PairCode = z.infer<typeof pairCodeSchema>;

/**
 * QR 데이터 검증 스키마
 *
 * QR 코드에 인코딩된 JSON 데이터 검증
 */
export const pairQRDataSchema = z.object({
  sessionId: z
    .string()
    .uuid('세션 ID는 유효한 UUID여야 합니다'),

  code: z
    .string()
    .regex(/^\d{6}$/, '확인 코드는 6자리 숫자여야 합니다'),

  wsUrl: z
    .string()
    .url('WebSocket URL이 유효하지 않습니다'),
});

/**
 * 타입 추론: PairQRData
 */
export type PairQRData = z.infer<typeof pairQRDataSchema>;

/**
 * QR 데이터 파싱 유틸리티
 *
 * QR 코드에서 추출한 JSON 문자열을 파싱하고 검증
 *
 * @example
 * ```typescript
 * const qrContent = 'eyJzZXNzaW9uSWQiOiIuLi4iLCJjb2RlIjoiMTIzNDU2Iiwid3NVcmwiOiJ3c3M6Ly8uLi4ifQ==';
 * const decoded = JSON.parse(Buffer.from(qrContent, 'base64').toString());
 * const result = pairQRDataSchema.safeParse(decoded);
 * ```
 */
export const parsePairQRDataSchema = z
  .string()
  .transform((val) => {
    try {
      return JSON.parse(val);
    } catch {
      throw new Error('QR 데이터 JSON 파싱 실패');
    }
  })
  .pipe(pairQRDataSchema);

/**
 * 타입 추론: ParsedPairQRData
 */
export type ParsedPairQRData = z.infer<typeof parsePairQRDataSchema>;

/**
 * 페어링 폴 간격 검증 스키마
 *
 * 폴링 간격을 설정할 때 검증 (밀리초 단위)
 * 최소 1초, 최대 60초
 */
export const pairPollIntervalSchema = z
  .number()
  .int('폴링 간격은 정수여야 합니다')
  .min(1000, '폴링 간격은 최소 1초 이상이어야 합니다')
  .max(60000, '폴링 간격은 최대 60초 이하여야 합니다');

/**
 * 타입 추론: PairPollInterval
 */
export type PairPollInterval = z.infer<typeof pairPollIntervalSchema>;
