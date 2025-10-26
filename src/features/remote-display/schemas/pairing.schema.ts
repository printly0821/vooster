/**
 * 페어링 관련 Zod 스키마
 */

import { z } from 'zod';

/**
 * QR 코드 페이로드 스키마
 */
export const QRCodePayloadSchema = z.object({
  sessionId: z.string().uuid('유효한 UUID가 필요합니다'),
  code: z
    .string()
    .length(6, '확인 코드는 6자리여야 합니다')
    .regex(/^\d{6}$/, '숫자만 입력 가능합니다'),
  wsUrl: z.string().url('유효한 URL이 필요합니다'),
  displayName: z.string().min(1, '디스플레이 이름은 필수입니다'),
  purpose: z.string().optional(),
  orgId: z.string().optional(),
  lineId: z.string().optional(),
  expiresAt: z.number().int().positive().optional(),
});

/**
 * 페어링 승인 요청 스키마
 */
export const PairingApprovalRequestSchema = z.object({
  sessionId: z.string().uuid('유효한 세션 ID가 필요합니다'),
  code: z
    .string()
    .length(6, '확인 코드는 6자리여야 합니다')
    .regex(/^\d{6}$/, '숫자만 입력 가능합니다'),
  deviceId: z.string().optional(),
  orgId: z.string().optional(),
  lineId: z.string().optional(),
});

/**
 * 페어링 승인 응답 스키마 (성공)
 */
export const PairingApprovalResponseSchema = z.object({
  ok: z.literal(true),
  token: z.string().min(1, 'JWT 토큰은 필수입니다'),
  screenId: z.string().min(1, '디스플레이 ID는 필수입니다'),
  displayName: z.string().optional(),
  expiresAt: z.number().int().positive().optional(),
});

/**
 * 페어링 승인 응답 스키마 (실패)
 */
export const PairingApprovalErrorResponseSchema = z.object({
  ok: z.literal(false),
  reason: z.enum([
    'invalid_session',
    'expired',
    'invalid_code',
    'validation_error',
    'server_error',
  ]),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

/**
 * 페어링 세션 상태 스키마
 */
export const PairingStatusSchema = z.enum([
  'pending',
  'approved',
  'expired',
  'rejected',
]);

/**
 * 페어링 세션 스키마
 */
export const PairingSessionSchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().length(6),
  status: PairingStatusSchema,
  screenId: z.string().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
});

/**
 * QR 코드 생성 응답 스키마
 */
export const QRCodeGenerationResponseSchema = z.object({
  sessionId: z.string().uuid(),
  qrData: z.string().min(1),
  expiresIn: z.number().int().positive(),
  code: z.string().length(6),
});

/**
 * 페어링 폴링 성공 응답 스키마
 */
export const PairingPollSuccessResponseSchema = z.object({
  ok: z.literal(true),
  token: z.string().min(1),
  screenId: z.string().min(1),
});

/**
 * 페어링 폴링 대기/실패 응답 스키마
 */
export const PairingPollPendingResponseSchema = z.object({
  ok: z.literal(false),
  reason: z.enum(['timeout', 'not_found', 'expired']),
});

/**
 * 페어링 폴링 응답 스키마 (유니온)
 */
export const PairingPollResponseSchema = z.union([
  PairingPollSuccessResponseSchema,
  PairingPollPendingResponseSchema,
]);

/**
 * 타입 추론
 */
export type QRCodePayloadType = z.infer<typeof QRCodePayloadSchema>;
export type PairingApprovalRequestType = z.infer<
  typeof PairingApprovalRequestSchema
>;
export type PairingApprovalResponseType = z.infer<
  typeof PairingApprovalResponseSchema
>;
export type PairingApprovalErrorResponseType = z.infer<
  typeof PairingApprovalErrorResponseSchema
>;
export type PairingStatusType = z.infer<typeof PairingStatusSchema>;
export type PairingSessionType = z.infer<typeof PairingSessionSchema>;
export type QRCodeGenerationType = z.infer<
  typeof QRCodeGenerationResponseSchema
>;
export type PairingPollResponseType = z.infer<typeof PairingPollResponseSchema>;
