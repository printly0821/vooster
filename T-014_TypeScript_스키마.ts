/**
 * T-014 API 엔드포인트 Zod 검증 스키마 및 타입 정의
 *
 * 모든 요청 본문과 쿼리 파라미터 검증을 위한 스키마를 정의합니다.
 * 이 파일은 런타임 검증과 타입 안전성을 모두 제공합니다.
 */

import { z } from 'zod';

/**
 * 유효성 검사 규칙 정의
 *
 * screenId: screen:<orgId>:<lineId> 형식
 * deviceId: UUID 또는 MAC 주소
 * code: 6자리 숫자
 */

// ============================================================================
// 공통 스키마
// ============================================================================

/**
 * UUID 검증 (디바이스ID, 세션ID 등)
 */
export const UUIDSchema = z
  .string()
  .uuid('유효한 UUID 형식이 아닙니다');

/**
 * screenId 검증: screen:orgId:lineId
 */
export const ScreenIdSchema = z
  .string()
  .regex(
    /^screen:[a-f0-9-]+:[a-f0-9-]+$/i,
    'screenId는 "screen:orgId:lineId" 형식이어야 합니다'
  );

/**
 * 6자리 숫자 코드 (페어링)
 */
export const SixDigitCodeSchema = z
  .string()
  .length(6, '6자리 코드여야 합니다')
  .regex(/^\d{6}$/, '숫자만 허용됩니다');

/**
 * 이름 필드 (1-100자, 알파벳, 숫자, 하이픈, 언더스코어, 공백)
 */
export const NameSchema = z
  .string()
  .min(1, '필수 필드입니다')
  .max(100, '최대 100자입니다')
  .regex(
    /^[a-zA-Z0-9\-_\s]+$/,
    '영문, 숫자, 하이픈, 언더스코어, 공백만 허용됩니다'
  );

/**
 * Purpose 필드 (1-255자, snake_case)
 */
export const PurposeSchema = z
  .string()
  .min(1, '필수 필드입니다')
  .max(255, '최대 255자입니다')
  .regex(
    /^[a-z_]+$/,
    'snake_case (소문자와 언더스코어만)로 작성하세요'
  );

/**
 * 작업 번호 (1-50자)
 */
export const JobNoSchema = z
  .string()
  .min(1, '필수 필드입니다')
  .max(50, '최대 50자입니다')
  .regex(
    /^[a-zA-Z0-9\-_]+$/,
    '영문, 숫자, 하이픈, 언더스코어만 허용됩니다'
  );

// ============================================================================
// 디스플레이 등록 API (POST /api/displays/register)
// ============================================================================

/**
 * 디스플레이 등록 요청 본문 검증
 */
export const RegisterDisplaySchema = z.object({
  // 필수
  deviceId: z
    .string()
    .min(1, '필수 필드입니다')
    .refine(
      (val) => {
        // UUID 또는 MAC 주소 형식
        const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
        return uuidRegex.test(val) || macRegex.test(val);
      },
      '유효한 UUID 또는 MAC 주소 형식이 아닙니다'
    ),

  name: NameSchema,
  purpose: PurposeSchema,

  // 선택사항
  orgId: z
    .string()
    .uuid('유효한 UUID 형식이 아닙니다')
    .optional(),

  lineId: z
    .string()
    .uuid('유효한 UUID 형식이 아닙니다')
    .optional(),

  userAgent: z.string().max(500).optional(),
  clientVersion: z.string().max(50).optional(),
});

export type RegisterDisplayRequest = z.infer<typeof RegisterDisplaySchema>;

/**
 * 디스플레이 등록 성공 응답
 */
export const RegisterDisplayResponseSchema = z.object({
  ok: z.literal(true),
  screenId: ScreenIdSchema,
  status: z.enum(['registered', 'updated']),
  message: z.string(),
  expiresAt: z.string().datetime().optional(),
});

export type RegisterDisplayResponse = z.infer<typeof RegisterDisplayResponseSchema>;

// ============================================================================
// 디스플레이 목록 조회 API (GET /api/displays)
// ============================================================================

/**
 * 디스플레이 목록 조회 쿼리 파라미터 검증
 */
export const GetDisplaysQuerySchema = z.object({
  lineId: z.string().uuid().optional(),
  onlineOnly: z
    .string()
    .refine(
      (val) => val === 'true' || val === 'false',
      'true 또는 false 문자열이어야 합니다'
    )
    .transform((val) => val === 'true')
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 1000, '1-1000 사이의 값이어야 합니다')
    .optional()
    .default('100'),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 0, '0 이상이어야 합니다')
    .optional()
    .default('0'),
});

export type GetDisplaysQuery = z.infer<typeof GetDisplaysQuerySchema>;

/**
 * 디스플레이 목록 아이템
 */
export const DisplayItemSchema = z.object({
  screenId: ScreenIdSchema,
  deviceId: z.string(),
  name: z.string(),
  purpose: z.string(),
  online: z.boolean(),
  lastSeen: z.string().datetime(),
  status: z.enum(['online', 'offline']),
  uptime: z.number().optional(),
  version: z.string().optional(),
});

export type DisplayItem = z.infer<typeof DisplayItemSchema>;

/**
 * 디스플레이 목록 조회 성공 응답
 */
export const GetDisplaysResponseSchema = z.object({
  ok: z.literal(true),
  displays: z.array(DisplayItemSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type GetDisplaysResponse = z.infer<typeof GetDisplaysResponseSchema>;

// ============================================================================
// 페어링 QR 생성 API (POST /api/pair/qr)
// ============================================================================

/**
 * 페어링 QR 생성 요청 (본문 없음)
 */
export const CreatePairingQRSchema = z.object({}).strict();

/**
 * 페어링 QR 생성 성공 응답
 */
export const CreatePairingQRResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: UUIDSchema,
  qrData: z.string(),
  expiresIn: z.number(),
  createdAt: z.string().datetime(),
  pollUrl: z.string(),
});

export type CreatePairingQRResponse = z.infer<typeof CreatePairingQRResponseSchema>;

/**
 * QR 데이터 내용 (JSON 문자열화됨)
 */
export const QRDataSchema = z.object({
  sessionId: UUIDSchema,
  code: SixDigitCodeSchema,
  wsUrl: z.string().url(),
  pollUrl: z.string(),
});

export type QRData = z.infer<typeof QRDataSchema>;

// ============================================================================
// 페어링 폴링 API (GET /api/pair/poll/:sessionId)
// ============================================================================

/**
 * 페어링 폴링 경로 파라미터 검증
 */
export const PollPairingParamsSchema = z.object({
  sessionId: UUIDSchema,
});

export type PollPairingParams = z.infer<typeof PollPairingParamsSchema>;

/**
 * 페어링 폴링 성공 응답 (토큰 받음)
 */
export const PollPairingSuccessSchema = z.object({
  ok: z.literal(true),
  token: z.string(),
  screenId: ScreenIdSchema,
  expiresIn: z.number(),
});

export type PollPairingSuccess = z.infer<typeof PollPairingSuccessSchema>;

/**
 * 페어링 폴링 실패 응답 (타임아웃, 만료 등)
 */
export const PollPairingFailureSchema = z.object({
  ok: z.literal(false),
  reason: z.enum(['timeout', 'not_found', 'expired']),
  message: z.string(),
});

export type PollPairingFailure = z.infer<typeof PollPairingFailureSchema>;

export type PollPairingResponse = PollPairingSuccess | PollPairingFailure;

// ============================================================================
// 페어링 승인 API (POST /api/pair/approve)
// ============================================================================

/**
 * 페어링 승인 요청 본문 검증
 */
export const ApprovePairingSchema = z.object({
  sessionId: UUIDSchema,
  code: SixDigitCodeSchema,
  deviceId: z.string().optional(),
});

export type ApprovePairingRequest = z.infer<typeof ApprovePairingSchema>;

/**
 * 페어링 승인 성공 응답
 */
export const ApprovePairingResponseSchema = z.object({
  ok: z.literal(true),
  token: z.string(),
  screenId: ScreenIdSchema,
  message: z.string(),
});

export type ApprovePairingResponse = z.infer<typeof ApprovePairingResponseSchema>;

// ============================================================================
// 트리거 API (POST /api/trigger)
// ============================================================================

/**
 * 트리거 전송 요청 본문 검증
 */
export const SendTriggerSchema = z.object({
  screenId: ScreenIdSchema,
  jobNo: JobNoSchema,
  data: z.record(z.any()).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
  timeout: z.number().positive().optional(),
});

export type SendTriggerRequest = z.infer<typeof SendTriggerSchema>;

/**
 * 트리거 전송 성공 응답
 */
export const SendTriggerResponseSchema = z.object({
  ok: z.literal(true),
  txId: UUIDSchema,
  clientCount: z.number().nonnegative(),
  message: z.string(),
  timestamp: z.string().datetime(),
  screenId: ScreenIdSchema,
});

export type SendTriggerResponse = z.infer<typeof SendTriggerResponseSchema>;

// ============================================================================
// 에러 응답 스키마
// ============================================================================

/**
 * 검증 에러 항목
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

/**
 * 에러 응답 (표준화된 형식)
 */
export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  reason: z.string(),
  message: z.string(),
  errors: z.array(ValidationErrorSchema).optional(),
  retryAfter: z.number().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// 데이터베이스 모델 타입
// ============================================================================

/**
 * 디스플레이 데이터베이스 모델
 *
 * 현재 등록된 모든 디스플레이의 상태를 저장합니다.
 */
export interface Display {
  id: number;
  deviceId: string;        // 디바이스 고유 ID
  screenId: string;        // screen:orgId:lineId
  name: string;
  purpose?: string;
  orgId: string;
  lineId: string;
  status: 'online' | 'offline';
  lastSeenAt: Date;        // 마지막 heartbeat
  userAgent?: string;
  clientVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 페어링 세션 데이터베이스 모델
 *
 * 페어링 프로세스의 임시 데이터 (5분 TTL)
 */
export interface PairingSession {
  id: number;
  sessionId: string;       // UUID
  code: string;            // 6자리 코드
  status: 'pending' | 'approved' | 'expired';
  deviceId?: string;       // 승인 후 설정
  orgId?: string;
  lineId?: string;
  token?: string;          // JWT 토큰
  approvedBy?: string;     // 승인한 사용자 ID
  approvedAt?: Date;
  expiresAt: Date;         // 만료 시간 (생성 후 5분)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 트리거 로그 데이터베이스 모델
 *
 * 모든 트리거 호출을 기록하여 감시, 감사, 성능 분석에 사용합니다.
 */
export interface TriggerLog {
  id: number;
  txId: string;            // UUID (중복 방지)
  userId: string;
  screenId: string;
  jobNo: string;
  status: 'delivered' | 'missed' | 'timeout';
  clientCount: number;     // 메시지를 받은 클라이언트 수
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 인증 컨텍스트 (미들웨어에서 req.user에 설정됨)
 *
 * JWT 토큰에서 디코딩된 사용자 정보
 */
export interface AuthContext {
  userId: string;
  type: 'display' | 'user';
  scopes: string[];
  deviceId?: string;
  orgId?: string;
  lineId?: string;
  iat: number;
  exp: number;
}

// ============================================================================
// 필터 및 조회 옵션
// ============================================================================

/**
 * 디스플레이 조회 필터
 */
export interface DisplayFilter {
  orgId?: string;
  lineId?: string;
  status?: 'online' | 'offline';
  onlineOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 트리거 로그 조회 필터
 */
export interface TriggerLogFilter {
  userId?: string;
  screenId?: string;
  status?: 'delivered' | 'missed' | 'timeout';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// 헬퍼 함수 (선택사항, 파일 하단에 추가 가능)
// ============================================================================

/**
 * 스코프 검증 함수
 *
 * @param scopes - 사용자 토큰에 포함된 스코프 목록
 * @param requiredScope - 필요한 스코프
 * @returns true if scope is granted (와일드카드 지원)
 *
 * 예시:
 * - hasScope(['display:screen:*:*'], 'display:screen:org-id:line-id') => true
 * - hasScope(['trigger:*'], 'trigger:org-id') => true
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.some(scope => {
    if (scope === requiredScope) return true;

    // 와일드카드 매칭
    const pattern = scope.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requiredScope);
  });
}

/**
 * 온라인 상태 판정 함수
 *
 * @param lastSeenAt - 마지막 heartbeat 시간
 * @param thresholdSeconds - 오프라인 판정 기준 (기본값: 60초)
 * @returns true if 온라인
 */
export function isOnline(
  lastSeenAt: Date,
  thresholdSeconds: number = 60
): boolean {
  const now = new Date();
  const diff = (now.getTime() - lastSeenAt.getTime()) / 1000;
  return diff < thresholdSeconds;
}

/**
 * screenId 파싱 함수
 *
 * @param screenId - "screen:orgId:lineId" 형식의 문자열
 * @returns { orgId, lineId } 또는 null (형식이 맞지 않으면)
 *
 * 예시:
 * parseScreenId('screen:org-123:line-456') => { orgId: 'org-123', lineId: 'line-456' }
 */
export function parseScreenId(
  screenId: string
): { orgId: string; lineId: string } | null {
  const match = screenId.match(/^screen:([^:]+):([^:]+)$/);
  if (!match) return null;
  return { orgId: match[1], lineId: match[2] };
}

/**
 * screenId 생성 함수
 *
 * @param orgId - 조직 ID
 * @param lineId - 라인 ID
 * @returns screenId 문자열
 */
export function createScreenId(orgId: string, lineId: string): string {
  return `screen:${orgId}:${lineId}`;
}
