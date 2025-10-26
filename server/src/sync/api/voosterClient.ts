/**
 * Vooster REST API 클라이언트
 * @module sync/api
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { RemoteTask, RemoteTaskSchema, LocalTask, APIErrorResponse } from '../types';
import { SyncConfig } from '../types';
import pino from 'pino';

interface VoosterClientOptions {
  baseURL: string;
  token: string;
  retryAttempts?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  logger?: pino.Logger;
}

export class VoosterClient {
  private client: AxiosInstance;
  private retryAttempts: number;
  private retryDelayMs: number;
  private maxRetryDelayMs: number;
  private logger: pino.Logger;

  constructor(options: VoosterClientOptions) {
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.maxRetryDelayMs = options.maxRetryDelayMs || 32000;
    this.logger =
      options.logger ||
      pino({
        name: 'vooster-client',
        level: 'info',
      });

    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Vooster-Sync-Engine/1.0',
      },
    });

    // 응답 인터셉터: 에러 로깅
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error(
          {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
          },
          'API 요청 실패'
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * 태스크 생성
   */
  async createTask(
    payload: Partial<LocalTask>,
    options?: { idempotencyKey?: string }
  ): Promise<RemoteTask> {
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const response = await this.retryRequest(() =>
      this.client.post('/tasks', payload, { headers })
    );

    return RemoteTaskSchema.parse(response.data);
  }

  /**
   * 태스크 조회
   */
  async getTask(taskId: string): Promise<RemoteTask> {
    const response = await this.retryRequest(() =>
      this.client.get(`/tasks/${taskId}`)
    );

    return RemoteTaskSchema.parse(response.data);
  }

  /**
   * externalId로 태스크 조회
   */
  async findByExternalId(externalId: string): Promise<RemoteTask | null> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get('/tasks', {
          params: { externalId },
        })
      );

      const tasks = response.data.items || response.data;
      if (Array.isArray(tasks) && tasks.length > 0) {
        return RemoteTaskSchema.parse(tasks[0]);
      }
      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 태스크 업데이트
   */
  async updateTask(
    taskId: string,
    payload: Partial<LocalTask>,
    options?: { ifMatch?: string }
  ): Promise<RemoteTask> {
    const headers: Record<string, string> = {};
    if (options?.ifMatch) {
      headers['If-Match'] = options.ifMatch;
    }

    const response = await this.retryRequest(() =>
      this.client.patch(`/tasks/${taskId}`, payload, { headers })
    );

    return RemoteTaskSchema.parse(response.data);
  }

  /**
   * 태스크 삭제
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.retryRequest(() => this.client.delete(`/tasks/${taskId}`));
  }

  /**
   * 태스크 보관
   */
  async archiveTask(taskId: string): Promise<RemoteTask> {
    const response = await this.retryRequest(() =>
      this.client.post(`/tasks/${taskId}/archive`)
    );

    return RemoteTaskSchema.parse(response.data);
  }

  /**
   * 변경된 태스크 목록 조회
   */
  async listUpdatedSince(since: string | null): Promise<RemoteTask[]> {
    const params: Record<string, string> = {};
    if (since) {
      params.updatedSince = since;
    }

    const response = await this.retryRequest(() =>
      this.client.get('/tasks', { params })
    );

    const tasks = response.data.items || response.data;
    if (!Array.isArray(tasks)) {
      this.logger.warn({ response: response.data }, '예상치 못한 응답 형식');
      return [];
    }

    return tasks.map((task) => RemoteTaskSchema.parse(task));
  }

  /**
   * 재시도 로직이 포함된 요청 실행
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const shouldRetry = this.shouldRetry(error, attempt);
      if (!shouldRetry) {
        throw this.normalizeError(error);
      }

      const delay = this.calculateBackoff(attempt, error.response?.headers['retry-after']);
      this.logger.info(
        { attempt: attempt + 1, delay, error: error.message },
        '요청 재시도 중'
      );

      await this.sleep(delay);
      return this.retryRequest(requestFn, attempt + 1);
    }
  }

  /**
   * 재시도 여부 판단
   */
  private shouldRetry(error: AxiosError, attempt: number): boolean {
    if (attempt >= this.retryAttempts) {
      return false;
    }

    const status = error.response?.status;
    if (!status) {
      // 네트워크 오류
      return true;
    }

    // 429 (Rate Limit), 5xx (서버 오류)는 재시도
    return status === 429 || (status >= 500 && status < 600);
  }

  /**
   * 지수 백오프 계산
   */
  private calculateBackoff(attempt: number, retryAfter?: string): number {
    if (retryAfter) {
      const retryAfterMs = parseInt(retryAfter, 10) * 1000;
      if (!isNaN(retryAfterMs)) {
        return Math.min(retryAfterMs, this.maxRetryDelayMs);
      }
    }

    const exponentialDelay = this.retryDelayMs * Math.pow(2, attempt);
    return Math.min(exponentialDelay, this.maxRetryDelayMs);
  }

  /**
   * sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 에러 정규화
   */
  private normalizeError(error: AxiosError): Error {
    const apiError: APIErrorResponse = {
      status: error.response?.status || 0,
      message: error.message,
      code: (error.response?.data as any)?.code,
      details: error.response?.data,
    };

    const errorMessage = `[${apiError.status}] ${apiError.message}`;
    const normalizedError = new Error(errorMessage);
    (normalizedError as any).apiError = apiError;

    return normalizedError;
  }

  /**
   * 헬스체크
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 설정에서 클라이언트 생성
 */
export function createVoosterClient(config: SyncConfig, logger?: pino.Logger): VoosterClient {
  return new VoosterClient({
    baseURL: config.baseURL,
    token: config.apiToken,
    retryAttempts: config.retryAttempts,
    retryDelayMs: config.retryDelayMs,
    maxRetryDelayMs: config.maxRetryDelayMs,
    logger,
  });
}
