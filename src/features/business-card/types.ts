/**
 * 명함 관리 시스템 - TypeScript 타입 정의
 * 작성일: 2025-10-21
 * 설명: 명함(Business Card), 연락처(Contact), 카테고리(Category) 등의 타입 정의
 */

import { z } from 'zod';

/* ===========================
   1. BUSINESS_CARD (명함)
   =========================== */

/** 명함 타입 - 데이터베이스 행 (snake_case) */
export const BusinessCardTableRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  department: z.string().nullable(),
  bio: z.string().nullable(),
  company_logo_url: z.string().nullable(),
  card_image_url: z.string().nullable(),
  color_theme: z.string().default('#2ECC71'),
  view_count: z.number().int().default(0),
  is_starred: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BusinessCardTableRow = z.infer<typeof BusinessCardTableRowSchema>;

/** 명함 타입 - API 응답 (camelCase) */
export const BusinessCardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, '이름은 필수입니다'),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  department: z.string().nullable(),
  bio: z.string().nullable(),
  companyLogoUrl: z.string().url().nullable(),
  cardImageUrl: z.string().url().nullable(),
  colorTheme: z.string().regex(/^#[0-9A-F]{6}$/i, '유효한 HEX 색상 코드여야 합니다').default('#2ECC71'),
  viewCount: z.number().int().nonnegative().default(0),
  isStarred: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BusinessCard = z.infer<typeof BusinessCardSchema>;

/** 명함 생성/수정 요청 스키마 */
export const CreateBusinessCardSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(255),
  company: z.string().max(255).nullable().optional(),
  jobTitle: z.string().max(100).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  companyLogoUrl: z.string().url().nullable().optional(),
  cardImageUrl: z.string().url().nullable().optional(),
  colorTheme: z.string().regex(/^#[0-9A-F]{6}$/i).default('#2ECC71'),
});

export type CreateBusinessCardRequest = z.infer<typeof CreateBusinessCardSchema>;

export const UpdateBusinessCardSchema = CreateBusinessCardSchema.partial();
export type UpdateBusinessCardRequest = z.infer<typeof UpdateBusinessCardSchema>;

/* ===========================
   2. CONTACT (연락처)
   =========================== */

export const ContactTypeEnum = z.enum(['phone', 'email', 'address', 'sns', 'website']);
export type ContactType = z.infer<typeof ContactTypeEnum>;

/** 연락처 타입 - 데이터베이스 행 */
export const ContactTableRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  contact_type: ContactTypeEnum,
  value: z.string(),
  label: z.string().nullable(),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
});

export type ContactTableRow = z.infer<typeof ContactTableRowSchema>;

/** 연락처 타입 - API 응답 */
export const ContactSchema = z.object({
  id: z.string().uuid(),
  businessCardId: z.string().uuid(),
  contactType: ContactTypeEnum,
  value: z.string().min(1, '값은 필수입니다'),
  label: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
});

export type Contact = z.infer<typeof ContactSchema>;

/** 연락처 생성/수정 스키마 */
export const CreateContactSchema = z.object({
  contactType: ContactTypeEnum,
  value: z.string().min(1, '값은 필수입니다').max(255),
  label: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type CreateContactRequest = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial();
export type UpdateContactRequest = z.infer<typeof UpdateContactSchema>;

/* ===========================
   3. BUSINESS_CARD_IMAGE (명함 이미지)
   =========================== */

export const ImageTypeEnum = z.enum(['original', 'thumbnail', 'front', 'back']);
export type ImageType = z.infer<typeof ImageTypeEnum>;

/** 명함 이미지 타입 - 데이터베이스 행 */
export const BusinessCardImageTableRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  image_url: z.string(),
  image_type: ImageTypeEnum.default('original'),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
});

export type BusinessCardImageTableRow = z.infer<typeof BusinessCardImageTableRowSchema>;

/** 명함 이미지 타입 - API 응답 */
export const BusinessCardImageSchema = z.object({
  id: z.string().uuid(),
  businessCardId: z.string().uuid(),
  imageUrl: z.string().url(),
  imageType: ImageTypeEnum.default('original'),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
});

export type BusinessCardImage = z.infer<typeof BusinessCardImageSchema>;

/** 명함 이미지 생성 스키마 */
export const CreateBusinessCardImageSchema = z.object({
  imageUrl: z.string().url('유효한 이미지 URL이어야 합니다'),
  imageType: ImageTypeEnum.default('original'),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type CreateBusinessCardImageRequest = z.infer<typeof CreateBusinessCardImageSchema>;

/* ===========================
   4. CATEGORY (카테고리)
   =========================== */

/** 카테고리 타입 - 데이터베이스 행 */
export const CategoryTableRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CategoryTableRow = z.infer<typeof CategoryTableRowSchema>;

/** 카테고리 타입 - API 응답 */
export const CategorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1, '카테고리명은 필수입니다'),
  description: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '유효한 HEX 색상 코드여야 합니다').default('#4F6D7A'),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Category = z.infer<typeof CategorySchema>;

/** 카테고리 생성/수정 스키마 */
export const CreateCategorySchema = z.object({
  name: z.string().min(1, '카테고리명은 필수입니다').max(100),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#4F6D7A'),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type CreateCategoryRequest = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryRequest = z.infer<typeof UpdateCategorySchema>;

/* ===========================
   5. BUSINESS_CARD_CATEGORY (명함-카테고리 매핑)
   =========================== */

/** 명함-카테고리 매핑 타입 - 데이터베이스 행 */
export const BusinessCardCategoryTableRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  category_id: z.string().uuid(),
  created_at: z.string(),
});

export type BusinessCardCategoryTableRow = z.infer<typeof BusinessCardCategoryTableRowSchema>;

/** 명함-카테고리 매핑 타입 - API 응답 */
export const BusinessCardCategorySchema = z.object({
  id: z.string().uuid(),
  businessCardId: z.string().uuid(),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type BusinessCardCategory = z.infer<typeof BusinessCardCategorySchema>;

/** 명함-카테고리 매핑 생성 스키마 */
export const CreateBusinessCardCategorySchema = z.object({
  categoryId: z.string().uuid('유효한 카테고리 ID여야 합니다'),
});

export type CreateBusinessCardCategoryRequest = z.infer<typeof CreateBusinessCardCategorySchema>;

/* ===========================
   6. STARRED_CARD (즐겨찾기)
   =========================== */

/** 즐겨찾기 타입 - 데이터베이스 행 */
export const StarredCardTableRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  created_at: z.string(),
});

export type StarredCardTableRow = z.infer<typeof StarredCardTableRowSchema>;

/** 즐겨찾기 타입 - API 응답 */
export const StarredCardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessCardId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type StarredCard = z.infer<typeof StarredCardSchema>;

/* ===========================
   7. CARD_ACTIVITY (활동 기록)
   =========================== */

export const ActivityTypeEnum = z.enum(['viewed', 'shared', 'created', 'updated', 'deleted', 'starred', 'exported']);
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

/** 활동 기록 타입 - 데이터베이스 행 */
export const CardActivityTableRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  activity_type: ActivityTypeEnum,
  description: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string(),
});

export type CardActivityTableRow = z.infer<typeof CardActivityTableRowSchema>;

/** 활동 기록 타입 - API 응답 */
export const CardActivitySchema = z.object({
  id: z.string().uuid(),
  businessCardId: z.string().uuid(),
  activityType: ActivityTypeEnum,
  description: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string().datetime(),
});

export type CardActivity = z.infer<typeof CardActivitySchema>;

/** 활동 기록 생성 스키마 */
export const CreateCardActivitySchema = z.object({
  activityType: ActivityTypeEnum,
  description: z.string().max(500).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

export type CreateCardActivityRequest = z.infer<typeof CreateCardActivitySchema>;

/* ===========================
   8. 통합 타입 (뷰, 응답 등)
   =========================== */

/** 명함 상세 정보 (연락처, 이미지, 카테고리 포함) */
export const BusinessCardDetailSchema = BusinessCardSchema.extend({
  contacts: z.array(ContactSchema).default([]),
  images: z.array(BusinessCardImageSchema).default([]),
  categories: z.array(CategorySchema).default([]),
});

export type BusinessCardDetail = z.infer<typeof BusinessCardDetailSchema>;

/** 명함 목록 응답 */
export const BusinessCardListResponseSchema = z.object({
  cards: z.array(BusinessCardSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type BusinessCardListResponse = z.infer<typeof BusinessCardListResponseSchema>;

/** 명함 통계 */
export const BusinessCardStatsSchema = z.object({
  userId: z.string().uuid(),
  totalCards: z.number().int().nonnegative(),
  starredCount: z.number().int().nonnegative(),
  categoryCount: z.number().int().nonnegative(),
  totalViews: z.number().int().nonnegative(),
  lastCardCreated: z.string().datetime().nullable(),
});

export type BusinessCardStats = z.infer<typeof BusinessCardStatsSchema>;

/* ===========================
   9. 에러 타입
   =========================== */

export enum BusinessCardErrorCode {
  // 조회 에러
  NOT_FOUND = 'CARD_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 생성/수정 에러
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY',
  INVALID_CONTACT_TYPE = 'INVALID_CONTACT_TYPE',

  // DB 에러
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',

  // 서버 에러
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export type BusinessCardError = {
  code: BusinessCardErrorCode;
  message: string;
  statusCode: number;
};

/* ===========================
   10. 필터 & 정렬
   =========================== */

/** 명함 목록 조회 필터 */
export const BusinessCardFilterSchema = z.object({
  search: z.string().optional().describe('이름, 회사명, 부서로 검색'),
  categoryId: z.string().uuid().optional().describe('특정 카테고리 필터'),
  onlyStarred: z.boolean().optional().describe('즐겨찾기만 조회'),
  sortBy: z.enum(['createdAt', 'name', 'viewCount']).default('createdAt').describe('정렬 기준'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('정렬 순서'),
  page: z.number().int().positive().default(1).describe('페이지 번호'),
  pageSize: z.number().int().min(1).max(100).default(20).describe('페이지 크기'),
});

export type BusinessCardFilter = z.infer<typeof BusinessCardFilterSchema>;

/* ===========================
   11. 벌크 작업
   =========================== */

/** 명함 벌크 업데이트 */
export const BulkUpdateBusinessCardsSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1),
  updates: z.object({
    categoryId: z.string().uuid().optional(),
    isStarred: z.boolean().optional(),
    colorTheme: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }),
});

export type BulkUpdateBusinessCardsRequest = z.infer<typeof BulkUpdateBusinessCardsSchema>;

/** 명함 벌크 삭제 */
export const BulkDeleteBusinessCardsSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(100, '최대 100개까지만 삭제 가능합니다'),
});

export type BulkDeleteBusinessCardsRequest = z.infer<typeof BulkDeleteBusinessCardsSchema>;
