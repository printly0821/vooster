/**
 * 트리거 시스템 Zod 검증 스키마
 *
 * 트리거 요청, 응답 등의 데이터 검증
 */

import { z } from 'zod';

/**
 * 트리거 요청 검증 스키마
 *
 * screenId 형식: screen:orgId:lineId (예: screen:prod:line-1)
 * jobNo 형식: 사용자 정의, 1-50자
 *
 * @example
 * ```typescript
 * const input = triggerSchema.safeParse({
 *   screenId: 'screen:prod:line-1',
 *   jobNo: 'ORD-20250101-001'
 * });
 * ```
 */
export const triggerSchema = z.object({
  screenId: z
    .string()
    .regex(
      /^screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
      '화면 ID 형식이 잘못되었습니다 (예: screen:prod:line-1)',
    )
    .max(100, '화면 ID는 100자 이내여야 합니다'),

  jobNo: z
    .string()
    .min(1, '주문 번호는 필수입니다')
    .max(50, '주문 번호는 50자 이내여야 합니다'),

  // 선택적 필드: 커스텀 메타데이터
  metadata: z
    .record(z.any())
    .optional()
    .refine(
      (val) => !val || Object.keys(val).length <= 10,
      '메타데이터는 최대 10개의 필드를 가질 수 있습니다',
    ),
});

/**
 * 타입 추론: TriggerInput
 */
export type TriggerInput = z.infer<typeof triggerSchema>;

/**
 * 트리거 스크린 ID 검증 (URL 파라미터)
 *
 * 쿼리 파라미터나 URL에서 screenId 검증
 */
export const screenIdSchema = z
  .string()
  .regex(
    /^screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
    '화면 ID 형식이 잘못되었습니다',
  );

/**
 * 타입 추론: ScreenId
 */
export type ScreenId = z.infer<typeof screenIdSchema>;

/**
 * 주문 번호 검증 스키마
 *
 * 주문 번호 형식 검증 (1-50자)
 */
export const jobNoSchema = z
  .string()
  .min(1, '주문 번호는 필수입니다')
  .max(50, '주문 번호는 50자 이내여야 합니다');

/**
 * 타입 추론: JobNo
 */
export type JobNo = z.infer<typeof jobNoSchema>;

/**
 * 트랜잭션 ID 검증 스키마
 *
 * UUID 형식의 트랜잭션 ID
 */
export const txIdSchema = z
  .string()
  .uuid('트랜잭션 ID는 유효한 UUID여야 합니다');

/**
 * 타입 추론: TxId
 */
export type TxId = z.infer<typeof txIdSchema>;

/**
 * 메타데이터 검증 스키마
 *
 * 트리거 페이로드의 선택적 메타데이터 검증
 * 최대 10개 필드, 각 필드는 어떤 타입이든 가능
 */
export const triggerMetadataSchema = z
  .record(z.any())
  .refine(
    (val) => Object.keys(val).length <= 10,
    '메타데이터는 최대 10개의 필드를 가질 수 있습니다',
  );

/**
 * 타입 추론: TriggerMetadata
 */
export type TriggerMetadata = z.infer<typeof triggerMetadataSchema>;

/**
 * 트리거 페이로드 검증 스키마 (WebSocket 전송용)
 *
 * Socket.IO를 통해 클라이언트로 전송될 메시지 형식
 */
export const triggerPayloadSchema = z.object({
  type: z.literal('navigate'),
  txId: txIdSchema,
  screenId: screenIdSchema,
  jobNo: jobNoSchema,
  url: z.string().url('네비게이션 URL이 유효하지 않습니다'),
  ts: z.number().int().positive('메시지 생성 시간은 양수여야 합니다'),
  exp: z.number().int().positive('메시지 만료 시간은 양수여야 합니다'),
  metadata: triggerMetadataSchema.optional(),
});

/**
 * 타입 추론: TriggerPayload
 */
export type TriggerPayload = z.infer<typeof triggerPayloadSchema>;

/**
 * 트리거 응답 상태 검증 스키마
 *
 * 트리거 API 응답의 상태 필드 검증
 */
export const triggerResponseStatusSchema = z.enum([
  'delivered',
  'missed',
  'rate_limited',
  'error',
]);

/**
 * 타입 추론: TriggerResponseStatus
 */
export type TriggerResponseStatus = z.infer<typeof triggerResponseStatusSchema>;

/**
 * 트리거 실패 이유 검증 스키마
 *
 * POST /api/trigger 실패 시 반환되는 reason 필드
 */
export const triggerFailureReasonSchema = z.enum([
  'validation_error',
  'forbidden',
  'not_found',
  'no_clients',
  'rate_limit',
  'error',
]);

/**
 * 타입 추론: TriggerFailureReason
 */
export type TriggerFailureReason = z.infer<typeof triggerFailureReasonSchema>;

/**
 * 클라이언트 수 검증 스키마
 *
 * 메시지를 받은 클라이언트 수 (0 이상의 정수)
 */
export const clientCountSchema = z
  .number()
  .int('클라이언트 수는 정수여야 합니다')
  .min(0, '클라이언트 수는 0 이상이어야 합니다');

/**
 * 타입 추론: ClientCount
 */
export type ClientCount = z.infer<typeof clientCountSchema>;
