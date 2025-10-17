/**
 * Orders API Functions
 *
 * Provides typed API functions for order-related operations with
 * automatic schema validation and error handling.
 *
 * @module features/orders/api/orders
 */

import { ZodError } from 'zod';
import { apiClient, HttpError, TimeoutError } from './client';
import { OrderResponseSchema, toOrderData, type OrderData, type OrderResponse } from './schemas';

/**
 * Order API error types
 */
export class OrderNotFoundError extends Error {
  constructor(public orderNo: string) {
    super(`Order not found: ${orderNo}`);
    this.name = 'OrderNotFoundError';
  }

  getUserMessage(): string {
    return `주문번호 "${this.orderNo}"를 찾을 수 없습니다. 바코드를 다시 스캔해주세요.`;
  }
}

export class OrderValidationError extends Error {
  constructor(public orderNo: string, public zodError: ZodError) {
    super(`Order validation failed: ${orderNo}`);
    this.name = 'OrderValidationError';
  }

  getUserMessage(): string {
    return '주문 데이터 형식이 올바르지 않습니다. 관리자에게 문의해주세요.';
  }

  getDetails(): string[] {
    return this.zodError.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
  }
}

/**
 * Fetch order details by order number
 *
 * Makes a GET request to /orders/{orderNo} and validates the response
 * using Zod schema. Returns enhanced order data with computed fields.
 *
 * @param orderNo - Order number (typically from barcode scan)
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Enhanced order data with UI-friendly computed fields
 *
 * @throws {OrderNotFoundError} If order doesn't exist (404)
 * @throws {OrderValidationError} If response doesn't match expected schema
 * @throws {HttpError} For other HTTP errors (401, 500, etc.)
 * @throws {TimeoutError} If request exceeds timeout
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 *
 * try {
 *   const order = await fetchOrder('12345', controller.signal);
 *   console.log('Order:', order.name, order.qty);
 *   console.log('Primary image:', order.primaryThumbnail);
 * } catch (error) {
 *   if (error instanceof OrderNotFoundError) {
 *     console.error('Order not found:', error.getUserMessage());
 *   } else if (error instanceof TimeoutError) {
 *     console.error('Timeout:', error.getUserMessage());
 *   }
 * }
 * ```
 */
export async function fetchOrder(
  orderNo: string,
  signal?: AbortSignal
): Promise<OrderData> {
  console.log(`📦 Fetching order: ${orderNo}`);

  try {
    // Make API request
    const rawData = await apiClient<unknown>(`/orders/${encodeURIComponent(orderNo)}`, {
      method: 'GET',
      signal,
    });

    // Validate response schema
    let validatedData: OrderResponse;
    try {
      validatedData = OrderResponseSchema.parse(rawData);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('❌ Order validation failed:', error.errors);
        throw new OrderValidationError(orderNo, error);
      }
      throw error;
    }

    // Transform to OrderData with computed fields
    const orderData = toOrderData(validatedData);

    console.log(`✅ Order fetched successfully:`, {
      orderNo,
      name: orderData.name,
      qty: orderData.qty,
      hasImages: orderData.hasImages,
    });

    return orderData;
  } catch (error) {
    // Handle 404 specifically
    if (error instanceof HttpError && error.is(404)) {
      throw new OrderNotFoundError(orderNo);
    }

    // Re-throw other errors as-is
    throw error;
  }
}

/**
 * Get user-friendly error message from any order API error
 *
 * @param error - Error object from fetchOrder or other API calls
 * @param fallback - Fallback message if error type is unknown
 * @returns User-friendly error message in Korean, or null for AbortError
 *
 * @example
 * ```ts
 * try {
 *   await fetchOrder('12345');
 * } catch (error) {
 *   const message = getOrderErrorMessage(error);
 *   if (message) {
 *     toast.error(message);
 *   }
 * }
 * ```
 */
export function getOrderErrorMessage(
  error: unknown,
  fallback = '주문 조회 중 오류가 발생했습니다.'
): string | null {
  // Ignore AbortError (request cancelled by React Query or user)
  if (error instanceof Error && error.name === 'AbortError') {
    return null;
  }

  if (error instanceof OrderNotFoundError) {
    return error.getUserMessage();
  }

  if (error instanceof OrderValidationError) {
    return error.getUserMessage();
  }

  if (error instanceof HttpError) {
    return error.getUserMessage();
  }

  if (error instanceof TimeoutError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
