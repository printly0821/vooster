/**
 * Order API Response Schemas
 *
 * Zod schemas for validating API responses from the orders service.
 * Provides type-safe parsing with automatic fallback for missing fields.
 *
 * @module features/orders/api/schemas
 */

import { z } from 'zod';

/**
 * Order status enum
 *
 * Represents the current state of an order in the system.
 */
export const OrderStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'cancelled',
  'failed',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/**
 * Order response schema from GET /orders/{orderNo}
 *
 * Validates the complete order object with safe fallbacks for optional fields.
 *
 * @remarks
 * - `options` defaults to empty array if not provided
 * - `thumbnails` defaults to empty array if not provided
 * - All string fields are trimmed automatically
 */
export const OrderResponseSchema = z.object({
  /** Unique order identifier */
  id: z.string().trim().min(1, 'Order ID is required'),

  /** Order number (typically the scanned barcode) */
  orderNo: z.string().trim().min(1, 'Order number is required'),

  /** Display name of the order/product */
  name: z.string().trim().min(1, 'Order name is required'),

  /** Quantity ordered */
  qty: z.number().int().positive('Quantity must be positive'),

  /** Product options (e.g., size, color) */
  options: z.array(z.string().trim()).default([]),

  /** Current order status */
  status: OrderStatusSchema,

  /** Product thumbnail image URLs */
  thumbnails: z.array(z.string().url('Invalid thumbnail URL')).default([]),

  /** Order creation timestamp (ISO 8601) */
  createdAt: z.string().datetime().optional(),

  /** Last update timestamp (ISO 8601) */
  updatedAt: z.string().datetime().optional(),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/**
 * Simplified order data for UI display
 *
 * Derived from OrderResponse with computed fields for better UX.
 */
export interface OrderData extends OrderResponse {
  /** Primary thumbnail (first image or placeholder) */
  primaryThumbnail: string | null;

  /** Whether this order has any product images */
  hasImages: boolean;

  /** Formatted options string for display */
  optionsDisplay: string;
}

/**
 * Transform OrderResponse to OrderData with computed fields
 *
 * @param order - Raw order response from API
 * @returns Enhanced order data for UI consumption
 */
export function toOrderData(order: OrderResponse): OrderData {
  return {
    ...order,
    primaryThumbnail: order.thumbnails[0] || null,
    hasImages: order.thumbnails.length > 0,
    optionsDisplay: order.options.length > 0 ? order.options.join(', ') : '옵션 없음',
  };
}

/**
 * Job Order Report Response Schema
 *
 * Schema for validating job order report data from external API
 * (http://43.201.219.117:8080/api/Order/GetJobOrderReport)
 */

/** Job Order Report schema - 주문 정보 */
export const JobOrderReportSchema = z.object({
  cmpnY_CD: z.string().nullable().optional(),
  brancH_CD: z.string().nullable().optional(),
  brancH_NM: z.string().nullable().optional(),
  orD_CD: z.string().nullable().optional(),
  cusT_ORD_CD: z.string().nullable().optional(),
  usR_ORD_CD: z.string().nullable().optional(),
  orD_DTL_SEQ: z.number().int().optional(),
  orD_YMD: z.string().nullable().optional(),
  cusT_CD: z.string().nullable().optional(),
  cusT_NM: z.string().nullable().optional(),
  cusT_INCHG: z.string().nullable().optional(),
  cusT_INCHG_TEL: z.string().nullable().optional(),
  iteM_CD: z.string().nullable().optional(),
  iteM_NM: z.string().nullable().optional(),
  iteM_MDL_CD: z.string().nullable().optional(),
  orD_TITL_DTL: z.string().nullable().optional(),
  sizE_NM: z.string().nullable().optional(),
  orD_QTY_UNIT_NM: z.string().nullable().optional(),
  fasT_YN: z.string().nullable().optional(),
  pacK_TYP: z.string().nullable().optional(),
  pacK_TYP_NM: z.string().nullable().optional(),
  pacK_NOTE: z.string().nullable().optional(),
  dlvR_TYP: z.string().nullable().optional(),
  dlvR_TYP_NM: z.string().nullable().optional(),
  dlvR_YMD: z.string().nullable().optional(),
  dlvR_RCIPT_NM_EX: z.string().nullable().optional(),
  dlvR_RCIPT_TEL_1_EX: z.string().nullable().optional(),
  dlvR_RCIPT_TEL_2_EX: z.string().nullable().optional(),
  dlvR_RCIPT_ADDR_EX: z.string().nullable().optional(),
  dlvR_NOTE_EX: z.string().nullable().optional(),
  worK_NOTE: z.string().nullable().optional(),
  exceL_OPT_1: z.string().nullable().optional(),
  exceL_OPT_2: z.string().nullable().optional(),
  exceL_OPT_3: z.string().nullable().optional(),
  exceL_OPT_4: z.string().nullable().optional(),
  exceL_OPT_5: z.string().nullable().optional(),
  exceL_OPT_6: z.string().nullable().optional(),
  exceL_OPT_7: z.string().nullable().optional(),
  exceL_OPT_8: z.string().nullable().optional(),
  exceL_OPT_9: z.string().nullable().optional(),
  exceL_OPT_10: z.string().nullable().optional(),
});

export type JobOrderReport = z.infer<typeof JobOrderReportSchema>;

/** Job Order Thumbnail schema - 썸네일 정보 */
export const JobOrderThumbnailSchema = z.object({
  orD_CD: z.string().nullable().optional(),
  orD_DTL_SEQ: z.number().int().optional(),
  orD_DTL_ITEM_NBR: z.string().nullable().optional(),
  iteM_CD: z.string().nullable().optional(),
  iteM_NM: z.string().nullable().optional(),
  prcS_CD: z.string().nullable().optional(),
  prcS_NM: z.string().nullable().optional(),
  pagE_NO: z.number().int().optional(),
  thumbnaiL_URL: z.string().nullable().optional(),
});

export type JobOrderThumbnail = z.infer<typeof JobOrderThumbnailSchema>;

/** Complete Job Order Result schema */
export const JobOrderResultSchema = z.object({
  jobOrderReports: JobOrderReportSchema,
  jobOrderThumbnails: z.array(JobOrderThumbnailSchema).default([]),
});

export type JobOrderResult = z.infer<typeof JobOrderResultSchema>;

/** API Response wrapper for Job Order Report */
export const JobOrderResultAPIResponseSchema = z.object({
  isSuccess: z.boolean(),
  result: JobOrderResultSchema.nullable().optional(),
  statusCode: z.number().optional(),
  errorMessages: z.array(z.string()).nullable().optional(),
});

export type JobOrderResultAPIResponse = z.infer<typeof JobOrderResultAPIResponseSchema>;

/**
 * Transform Job Order Result to UI-friendly format
 *
 * @param result - Raw job order result from API
 * @returns Enhanced job order data with computed fields
 */
export function toJobOrderData(result: JobOrderResult) {
  const report = result.jobOrderReports;
  const thumbnails = result.jobOrderThumbnails;

  // 썸네일을 품목별로 그룹화
  const groupedThumbnails = thumbnails.reduce((acc, thumb) => {
    const itemName = thumb.iteM_NM || 'unknown';
    if (!acc[itemName]) {
      acc[itemName] = [];
    }
    acc[itemName].push(thumb);
    return acc;
  }, {} as Record<string, JobOrderThumbnail[]>);

  // 각 그룹을 페이지 번호순으로 정렬
  Object.keys(groupedThumbnails).forEach(key => {
    groupedThumbnails[key].sort((a, b) => a.pagE_NO - b.pagE_NO);
  });

  return {
    report,
    thumbnails,
    groupedThumbnails,
    // 편의 필드
    orderNo: report.cusT_ORD_CD || '',
    customerName: report.cusT_NM || '',
    itemName: report.iteM_NM || '',
    deliveryDate: report.dlvR_YMD || '',
    hasImages: thumbnails.length > 0,
    totalPages: thumbnails.length,
  };
}
