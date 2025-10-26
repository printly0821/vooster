/**
 * 디스플레이 관련 Zod 스키마
 */

import { z } from 'zod';

/**
 * 디스플레이 상태 스키마
 */
export const DisplayStatusSchema = z.enum(['online', 'offline', 'connecting']);

/**
 * 디스플레이 객체 스키마
 */
export const DisplaySchema = z.object({
  screenId: z
    .string()
    .min(1, '디스플레이 ID는 필수입니다')
    .regex(
      /^screen:[a-z0-9-]+:[a-z0-9-]+$/,
      'screenId 형식이 올바르지 않습니다 (screen:orgId:lineId)'
    ),
  name: z.string().min(1, '디스플레이 이름은 필수입니다'),
  purpose: z.string().min(1, '용도는 필수입니다'),
  online: z.boolean(),
  status: DisplayStatusSchema,
  lastSeen: z.string().datetime('유효한 ISO 8601 날짜가 필요합니다'),
  orgId: z.string().optional(),
  lineId: z.string().optional(),
});

/**
 * 디스플레이 목록 응답 스키마
 */
export const DisplayListResponseSchema = z.object({
  displays: z.array(DisplaySchema),
  total: z.number().int().nonnegative(),
  onlineCount: z.number().int().nonnegative(),
});

/**
 * 디스플레이 목록 쿼리 파라미터 스키마
 */
export const DisplayListQueryParamsSchema = z.object({
  lineId: z.string().optional(),
  onlineOnly: z.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * 디스플레이 필터 옵션 스키마
 */
export const DisplayFilterOptionsSchema = z.object({
  lineId: z.string().optional(),
  onlineOnly: z.boolean().optional(),
  searchQuery: z.string().optional(),
});

/**
 * 타입 추론
 */
export type DisplayStatusType = z.infer<typeof DisplayStatusSchema>;
export type DisplayType = z.infer<typeof DisplaySchema>;
export type DisplayListResponseType = z.infer<typeof DisplayListResponseSchema>;
export type DisplayListQueryParamsType = z.infer<
  typeof DisplayListQueryParamsSchema
>;
export type DisplayFilterOptionsType = z.infer<
  typeof DisplayFilterOptionsSchema
>;
