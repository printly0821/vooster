/**
 * 명함 관리 시스템 - 백엔드 데이터베이스 스키마
 * 작성일: 2025-10-21
 * 설명: Supabase 테이블 행 레벨 스키마 (snake_case)
 */

import { z } from 'zod';

/* ===========================
   1. BUSINESS_CARD (명함)
   =========================== */

/** 명함 테이블 행 스키마 (snake_case - DB에서 조회) */
export const businessCardRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  department: z.string().nullable(),
  bio: z.string().nullable(),
  company_logo_url: z.string().url().nullable(),
  card_image_url: z.string().url().nullable(),
  color_theme: z.string(),
  view_count: z.number().int().nonnegative(),
  is_starred: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BusinessCardRow = z.infer<typeof businessCardRowSchema>;

/** DB에서 조회 후 camelCase로 변환 */
export function mapBusinessCardRowToResponse(row: BusinessCardRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    company: row.company,
    jobTitle: row.job_title,
    department: row.department,
    bio: row.bio,
    companyLogoUrl: row.company_logo_url,
    cardImageUrl: row.card_image_url,
    colorTheme: row.color_theme,
    viewCount: row.view_count,
    isStarred: row.is_starred,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ===========================
   2. CONTACT (연락처)
   =========================== */

export const contactRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  contact_type: z.enum(['phone', 'email', 'address', 'sns', 'website']),
  value: z.string().min(1),
  label: z.string().nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
});

export type ContactRow = z.infer<typeof contactRowSchema>;

export function mapContactRowToResponse(row: ContactRow) {
  return {
    id: row.id,
    businessCardId: row.business_card_id,
    contactType: row.contact_type,
    value: row.value,
    label: row.label,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/* ===========================
   3. BUSINESS_CARD_IMAGE
   =========================== */

export const businessCardImageRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  image_url: z.string().url(),
  image_type: z.enum(['original', 'thumbnail', 'front', 'back']),
  sort_order: z.number().int(),
  created_at: z.string(),
});

export type BusinessCardImageRow = z.infer<typeof businessCardImageRowSchema>;

export function mapBusinessCardImageRowToResponse(row: BusinessCardImageRow) {
  return {
    id: row.id,
    businessCardId: row.business_card_id,
    imageUrl: row.image_url,
    imageType: row.image_type,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/* ===========================
   4. CATEGORY (카테고리)
   =========================== */

export const categoryRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  color: z.string(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CategoryRow = z.infer<typeof categoryRowSchema>;

export function mapCategoryRowToResponse(row: CategoryRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ===========================
   5. BUSINESS_CARD_CATEGORY
   =========================== */

export const businessCardCategoryRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  category_id: z.string().uuid(),
  created_at: z.string(),
});

export type BusinessCardCategoryRow = z.infer<typeof businessCardCategoryRowSchema>;

export function mapBusinessCardCategoryRowToResponse(row: BusinessCardCategoryRow) {
  return {
    id: row.id,
    businessCardId: row.business_card_id,
    categoryId: row.category_id,
    createdAt: row.created_at,
  };
}

/* ===========================
   6. STARRED_CARD (즐겨찾기)
   =========================== */

export const starredCardRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  created_at: z.string(),
});

export type StarredCardRow = z.infer<typeof starredCardRowSchema>;

export function mapStarredCardRowToResponse(row: StarredCardRow) {
  return {
    id: row.id,
    userId: row.user_id,
    businessCardId: row.business_card_id,
    createdAt: row.created_at,
  };
}

/* ===========================
   7. CARD_ACTIVITY (활동 기록)
   =========================== */

export const cardActivityRowSchema = z.object({
  id: z.string().uuid(),
  business_card_id: z.string().uuid(),
  activity_type: z.enum(['viewed', 'shared', 'created', 'updated', 'deleted', 'starred', 'exported']),
  description: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string(),
});

export type CardActivityRow = z.infer<typeof cardActivityRowSchema>;

export function mapCardActivityRowToResponse(row: CardActivityRow) {
  return {
    id: row.id,
    businessCardId: row.business_card_id,
    activityType: row.activity_type,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/* ===========================
   8. 뷰 응답 스키마 (business_card_detail)
   =========================== */

export const businessCardDetailViewSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  department: z.string().nullable(),
  bio: z.string().nullable(),
  company_logo_url: z.string().url().nullable(),
  card_image_url: z.string().url().nullable(),
  color_theme: z.string(),
  view_count: z.number().int(),
  is_starred: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  contacts: z.array(z.record(z.any())).nullable(),
  images: z.array(z.record(z.any())).nullable(),
  categories: z.array(z.record(z.any())).nullable(),
});

export type BusinessCardDetailView = z.infer<typeof businessCardDetailViewSchema>;

export function mapBusinessCardDetailViewToResponse(row: BusinessCardDetailView) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    company: row.company,
    jobTitle: row.job_title,
    department: row.department,
    bio: row.bio,
    companyLogoUrl: row.company_logo_url,
    cardImageUrl: row.card_image_url,
    colorTheme: row.color_theme,
    viewCount: row.view_count,
    isStarred: row.is_starred,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contacts: row.contacts || [],
    images: row.images || [],
    categories: row.categories || [],
  };
}

/* ===========================
   9. 뷰 응답 스키마 (business_card_stats)
   =========================== */

export const businessCardStatsViewSchema = z.object({
  user_id: z.string().uuid(),
  total_cards: z.number().int(),
  starred_count: z.number().int(),
  category_count: z.number().int(),
  total_views: z.number().int(),
  last_card_created: z.string().nullable(),
});

export type BusinessCardStatsView = z.infer<typeof businessCardStatsViewSchema>;

export function mapBusinessCardStatsViewToResponse(row: BusinessCardStatsView) {
  return {
    userId: row.user_id,
    totalCards: row.total_cards,
    starredCount: row.starred_count,
    categoryCount: row.category_count,
    totalViews: row.total_views,
    lastCardCreated: row.last_card_created,
  };
}
