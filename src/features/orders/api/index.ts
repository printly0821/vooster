/**
 * Orders API Module
 *
 * API client, functions, and schemas for order operations.
 *
 * @module features/orders/api
 */

export { apiClient, createApiClient, HttpError, TimeoutError } from './client';
export { fetchOrder, getOrderErrorMessage, OrderNotFoundError, OrderValidationError } from './orders';
export { OrderResponseSchema, OrderStatusSchema, toOrderData } from './schemas';

export type { ApiClientConfig } from './client';
export type { OrderResponse, OrderData, OrderStatus } from './schemas';
