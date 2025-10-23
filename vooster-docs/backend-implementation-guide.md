# 10점 만점 백엔드 시스템 구현 가이드

**대상**: Socket.IO 기반 원격 디스플레이 시스템 구축
**기간**: 8주
**목표**: 성능 P95 < 250ms, 메시지 손실률 0.1%, 안정성 8/10 이상

---

## 목차

1. [환경 설정](#1-환경-설정)
2. [JWT 토큰 관리 (1주차)](#2-jwt-토큰-관리-1주차)
3. [메시지 보증 메커니즘 (2주차)](#3-메시지-보증-메커니즘-2주차)
4. [안정성 강화 (3주차)](#4-안정성-강화-3주차)
5. [운영성 개선 (4주차)](#5-운영성-개선-4주차)
6. [보안 강화 (5주차)](#6-보안-강화-5주차)
7. [성능 최적화 (6주차)](#7-성능-최적화-6주차)
8. [테스트 전략](#8-테스트-전략)
9. [배포 및 모니터링](#9-배포-및-모니터링)

---

## 1. 환경 설정

### 1.1 패키지 설치

```bash
npm install socket.io redis ioredis axios pino pino-pretty
npm install zod jsonwebtoken uuid
npm install @socket.io/redis-adapter
npm install --save-dev @types/node @types/jsonwebtoken vitest
```

### 1.2 .env 파일

```env
# Socket.IO
SOCKET_IO_PORT=3001
SOCKET_IO_HOST=0.0.0.0

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
STATSD_HOST=localhost
STATSD_PORT=8125

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Environment
NODE_ENV=development
```

---

## 2. JWT 토큰 관리 (1주차)

### 2.1 토큰 매니저 구현

```typescript
// src/backend/auth/token-manager.ts
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  screenId: string;
  iat: number;
  exp: number;
}

export interface RefreshPayload {
  userId: string;
  iat: number;
  exp: number;
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'secret';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '24h';

  /**
   * Access Token 생성
   */
  static generateAccessToken(userId: string, screenId: string): string {
    try {
      const token = jwt.sign(
        { userId, screenId },
        this.ACCESS_TOKEN_SECRET,
        { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN }
      );
      logger.debug('Access token generated', { userId, screenId });
      return token;
    } catch (error) {
      logger.error('Failed to generate access token', { error });
      throw error;
    }
  }

  /**
   * Refresh Token 생성
   */
  static generateRefreshToken(userId: string): string {
    try {
      const token = jwt.sign(
        { userId },
        this.REFRESH_TOKEN_SECRET,
        { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
      );
      logger.debug('Refresh token generated', { userId });
      return token;
    } catch (error) {
      logger.error('Failed to generate refresh token', { error });
      throw error;
    }
  }

  /**
   * 토큰 쌍 생성
   */
  static generateTokenPair(userId: string, screenId: string) {
    return {
      accessToken: this.generateAccessToken(userId, screenId),
      refreshToken: this.generateRefreshToken(userId),
      expiresIn: 900 // 15분 (초 단위)
    };
  }

  /**
   * Access Token 검증
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Refresh Token 검증
   */
  static verifyRefreshToken(token: string): RefreshPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET) as RefreshPayload;
    } catch (error) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * 토큰 갱신
   */
  static refreshAccessToken(refreshToken: string, screenId: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateAccessToken(payload.userId, screenId);
  }

  /**
   * 토큰 만료 시간 (밀리초)
   */
  static getExpiryTime(token: string): number {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        return 0;
      }
      return (decoded.payload.exp || 0) * 1000;
    } catch {
      return 0;
    }
  }

  /**
   * 토큰이 곧 만료될지 여부 (5분 이내)
   */
  static isExpiringSoon(token: string): boolean {
    const expiryTime = this.getExpiryTime(token);
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    return expiryTime < fiveMinutesFromNow;
  }
}
```

### 2.2 Socket.IO 인증 미들웨어

```typescript
// src/backend/socket-io/middleware/auth.ts
import { Socket } from 'socket.io';
import { TokenManager } from '../../auth/token-manager';
import { logger } from '../utils/logger';

export function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) {
      return next(new Error('Missing authentication token'));
    }

    // "Bearer <token>" 형식에서 토큰 추출
    const actualToken = typeof token === 'string' && token.startsWith('Bearer ')
      ? token.slice(7)
      : token;

    // 토큰 검증
    const payload = TokenManager.verifyAccessToken(actualToken);

    // socket.data에 사용자 정보 저장
    socket.data = {
      userId: payload.userId,
      screenId: payload.screenId,
      token: actualToken,
      tokenExpiry: TokenManager.getExpiryTime(actualToken)
    };

    logger.info('Client authenticated', { userId: payload.userId, screenId: payload.screenId });
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    logger.warn('Authentication failed', { error: message });
    next(new Error(message));
  }
}
```

### 2.3 토큰 갱신 API 엔드포인트

```typescript
// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TokenManager } from '@/backend/auth/token-manager';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, screenId } = await request.json();

    if (!refreshToken || !screenId) {
      return NextResponse.json(
        { error: 'Missing refreshToken or screenId' },
        { status: 400 }
      );
    }

    // Refresh Token 검증
    const payload = TokenManager.verifyRefreshToken(refreshToken);

    // 새로운 Access Token 생성
    const newAccessToken = TokenManager.generateAccessToken(payload.userId, screenId);
    const newRefreshToken = TokenManager.generateRefreshToken(payload.userId);

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15분
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
```

### 2.4 클라이언트 토큰 관리자

```typescript
// src/lib/auth/client-token-manager.ts
import { TokenManager } from '@/backend/auth/token-manager';
import axios from 'axios';

export class ClientTokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private screenId: string | null = null;

  initialize(tokens: { accessToken: string; refreshToken: string }, screenId: string) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.screenId = screenId;
    this.scheduleAutoRefresh();
  }

  /**
   * 자동 갱신 스케줄 (만료 5분 전)
   */
  private scheduleAutoRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    const expiryTime = this.accessToken
      ? TokenManager.getExpiryTime(this.accessToken)
      : 0;

    const refreshBefore = expiryTime - 5 * 60 * 1000; // 5분 전
    const delay = Math.max(refreshBefore - Date.now(), 1000);

    this.refreshTimer = setTimeout(() => {
      this.refresh().catch((error) => {
        console.error('Auto refresh failed:', error);
        // 사용자에게 재로그인 요청
        window.location.href = '/login';
      });
    }, delay);
  }

  /**
   * 토큰 갱신
   */
  async refresh() {
    if (!this.refreshToken || !this.screenId) {
      throw new Error('Refresh token or screenId missing');
    }

    const response = await axios.post('/api/auth/refresh', {
      refreshToken: this.refreshToken,
      screenId: this.screenId
    });

    this.accessToken = response.data.accessToken;
    this.refreshToken = response.data.refreshToken;
    this.scheduleAutoRefresh();

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken
    };
  }

  /**
   * 현재 Access Token 반환
   */
  getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    return this.accessToken;
  }

  /**
   * Authorization 헤더 반환
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.getAccessToken()}`
    };
  }

  /**
   * 토큰 초기화 (로그아웃)
   */
  clear() {
    this.accessToken = null;
    this.refreshToken = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}

export const tokenManager = new ClientTokenManager();
```

---

## 3. 메시지 보증 메커니즘 (2주차)

### 3.1 Idempotency 관리

```typescript
// src/backend/queue/idempotency.ts
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export interface IdempotencyRecord {
  id: string;
  result: any;
  createdAt: number;
  expiresAt: number;
}

export class IdempotencyManager {
  private redis: ReturnType<typeof createClient>;
  private readonly TTL = 3600000; // 1시간

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async initialize() {
    await this.redis.connect();
    logger.info('Idempotency manager initialized');
  }

  /**
   * 요청 ID 등록 (처리 중)
   */
  async register(requestId: string): Promise<boolean> {
    const key = `idempotency:${requestId}`;
    const existed = await this.redis.get(key);

    if (existed) {
      logger.warn('Duplicate request detected', { requestId });
      return false;
    }

    // 처리 중으로 표시 (TTL 포함)
    await this.redis.setEx(key, Math.floor(this.TTL / 1000), 'processing');
    return true;
  }

  /**
   * 요청 결과 저장
   */
  async saveResult(requestId: string, result: any): Promise<void> {
    const key = `idempotency:${requestId}`;
    await this.redis.setEx(key, Math.floor(this.TTL / 1000), JSON.stringify(result));
    logger.debug('Idempotency result saved', { requestId });
  }

  /**
   * 저장된 결과 조회
   */
  async getResult(requestId: string): Promise<any> {
    const key = `idempotency:${requestId}`;
    const data = await this.redis.get(key);

    if (!data) return null;
    if (data === 'processing') return 'PROCESSING';

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * 요청 ID 제거
   */
  async remove(requestId: string): Promise<void> {
    const key = `idempotency:${requestId}`;
    await this.redis.del(key);
  }

  async shutdown() {
    await this.redis.disconnect();
  }
}

export const idempotencyManager = new IdempotencyManager(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
```

### 3.2 Dead Letter Queue (DLQ)

```typescript
// src/backend/queue/dead-letter-queue.ts
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export interface DeadLetterMessage {
  id: string;
  screenId: string;
  event: string;
  data: any;
  reason: string;
  timestamp: number;
  retries: number;
  lastRetryAt?: number;
}

export class DeadLetterQueue {
  private redis: ReturnType<typeof createClient>;

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async initialize() {
    await this.redis.connect();
    logger.info('Dead Letter Queue initialized');
  }

  /**
   * 실패한 메시지를 DLQ에 추가
   */
  async push(message: DeadLetterMessage): Promise<void> {
    const dlqKey = `dlq:${message.screenId}:${message.event}`;

    await this.redis.xadd(
      dlqKey,
      '*',
      'id', message.id,
      'data', JSON.stringify(message.data),
      'reason', message.reason,
      'timestamp', message.timestamp.toString(),
      'retries', message.retries.toString()
    );

    logger.error('Message pushed to DLQ', {
      messageId: message.id,
      screenId: message.screenId,
      reason: message.reason
    });
  }

  /**
   * DLQ에서 메시지 조회
   */
  async getMessages(screenId: string, event: string, count = 10): Promise<DeadLetterMessage[]> {
    const dlqKey = `dlq:${screenId}:${event}`;
    const messages = await this.redis.xrevrange(dlqKey, '+', '-', { COUNT: count });

    return messages.map(([id, fields]) => {
      const record: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1];
      }

      return {
        id: record.id,
        screenId,
        event,
        data: JSON.parse(record.data),
        reason: record.reason,
        timestamp: parseInt(record.timestamp),
        retries: parseInt(record.retries)
      };
    });
  }

  /**
   * DLQ에서 메시지 삭제
   */
  async remove(screenId: string, event: string, messageId: string): Promise<void> {
    const dlqKey = `dlq:${screenId}:${event}`;
    // StreamID는 Redis stream의 auto-generated ID이므로, 메시지 ID로 검색 후 삭제
    const messages = await this.redis.xrevrange(dlqKey, '+', '-', { COUNT: 100 });

    for (const [streamId, fields] of messages) {
      const record: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1];
      }

      if (record.id === messageId) {
        await this.redis.xdel(dlqKey, streamId);
        logger.info('Message removed from DLQ', { messageId });
        break;
      }
    }
  }

  /**
   * DLQ 통계
   */
  async getStats(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('dlq:*');
    const stats: Record<string, number> = {};

    for (const key of keys) {
      const length = await this.redis.xlen(key);
      stats[key] = length;
    }

    return stats;
  }

  async shutdown() {
    await this.redis.disconnect();
  }
}

export const dlq = new DeadLetterQueue(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
```

### 3.3 ACK 메커니즘을 포함한 이벤트 핸들러

```typescript
// src/backend/socket-io/handlers/trigger.ts
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';
import { idempotencyManager } from '../../queue/idempotency';
import { dlq } from '../../queue/dead-letter-queue';
import { TokenManager } from '../../auth/token-manager';

const TriggerSchema = z.object({
  id: z.string().uuid('Invalid request ID'),
  orderId: z.string().min(1, 'Order ID is required'),
  displayIndex: z.number().int().min(0).default(0),
  timestamp: z.number().int().positive('Timestamp must be positive')
});

type TriggerData = z.infer<typeof TriggerSchema>;

interface TriggerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export class TriggerHandler {
  constructor(private io: Server) {}

  async handle(socket: Socket, data: unknown, callback?: (response: TriggerResponse) => void) {
    const startTime = Date.now();
    const { userId, screenId } = socket.data;

    try {
      // 1. 입력 검증
      const parsed = TriggerSchema.parse(data);

      // 2. 타임스탐프 검증 (5분 이내)
      if (Math.abs(Date.now() - parsed.timestamp) > 300000) {
        throw new Error('Request expired (timestamp out of range)');
      }

      // 3. 중복 요청 확인 (Idempotency)
      const canProcess = await idempotencyManager.register(parsed.id);
      if (!canProcess) {
        const cachedResult = await idempotencyManager.getResult(parsed.id);
        if (cachedResult === 'PROCESSING') {
          throw new Error('Request is already being processed');
        }
        // 캐시된 결과 반환
        callback?.({
          id: parsed.id,
          success: true,
          data: cachedResult
        });
        return;
      }

      // 4. 비즈니스 로직 실행
      const result = await this.processTrigger(parsed, { userId, screenId });

      // 5. 결과 저장 (Idempotency)
      await idempotencyManager.saveResult(parsed.id, result);

      // 6. ACK 콜백으로 응답
      callback?.({
        id: parsed.id,
        success: true,
        data: result
      });

      // 7. 메트릭 수집
      metricsCollector.recordSuccess('trigger', Date.now() - startTime);
      logger.info('Trigger handled successfully', {
        userId,
        screenId,
        orderId: parsed.orderId,
        latency: Date.now() - startTime
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = this.getErrorCode(error);

      // 에러 응답
      callback?.({
        id: (data as any)?.id || 'unknown',
        success: false,
        error: errorMessage
      });

      // DLQ에 추가
      await dlq.push({
        id: (data as any)?.id || `trigger:${Date.now()}`,
        screenId,
        event: 'trigger',
        data,
        reason: errorMessage,
        timestamp: Date.now(),
        retries: 0
      });

      // 메트릭 수집
      metricsCollector.recordFailure('trigger', Date.now() - startTime, errorCode);
      logger.error('Trigger handler error', {
        userId,
        screenId,
        error: errorMessage,
        code: errorCode
      });
    }
  }

  private async processTrigger(data: TriggerData, context: any) {
    // 주문 조회 (실제 API 호출)
    const order = await this.fetchOrder(data.orderId);

    if (!order) {
      throw new Error(`Order not found: ${data.orderId}`);
    }

    // 세컨드 모니터 제어
    const result = await this.showDocumentOnDisplay({
      documentPath: order.documentPath,
      displayIndex: data.displayIndex,
      windowId: `win-${Date.now()}`
    });

    return result;
  }

  private async fetchOrder(orderId: string) {
    try {
      const response = await fetch(`${process.env.ORDER_API_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.ORDER_API_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error(`Order API error: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Failed to fetch order', { orderId, error });
      throw error;
    }
  }

  private async showDocumentOnDisplay(options: any) {
    // Electron IPC 또는 로컬 서버 API 호출
    return {
      windowId: options.windowId,
      displayIndex: options.displayIndex,
      success: true,
      timestamp: Date.now()
    };
  }

  private getErrorCode(error: any): string {
    if (error instanceof z.ZodError) {
      return 'VALIDATION_ERROR';
    }
    if (error.message.includes('Order not found')) {
      return 'ORDER_NOT_FOUND';
    }
    if (error.message.includes('expired')) {
      return 'REQUEST_EXPIRED';
    }
    return 'INTERNAL_ERROR';
  }
}
```

---

## 4. 안정성 강화 (3주차)

### 4.1 재시도 큐

```typescript
// src/backend/queue/retry-queue.ts
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { dlq } from './dead-letter-queue';

export interface RetryTask {
  id: string;
  data: any;
  retries: number;
  maxRetries: number;
  createdAt: number;
  nextRetryAt?: number;
}

export class RetryQueue {
  private redis: ReturnType<typeof createClient>;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly BASE_DELAY = 1000; // 1초
  private readonly MAX_DELAY = 32000; // 32초

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async initialize() {
    await this.redis.connect();
    logger.info('Retry queue initialized');
  }

  /**
   * 재시도 큐에 추가
   */
  async enqueue(messageId: string, data: any, maxRetries = 3): Promise<void> {
    const key = `retry:${messageId}`;
    const countKey = `${key}:count`;

    const retryCount = await this.redis.incr(countKey);
    await this.redis.expire(countKey, 86400); // 24시간 TTL

    if (retryCount > maxRetries) {
      // DLQ로 이동
      await dlq.push({
        id: messageId,
        screenId: data.screenId || 'unknown',
        event: data.event || 'trigger',
        data,
        reason: `Max retries exceeded (${maxRetries})`,
        timestamp: Date.now(),
        retries: retryCount
      });
      logger.warn('Message moved to DLQ', { messageId, retries: retryCount });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
    const delay = Math.min(
      this.BASE_DELAY * Math.pow(2, retryCount - 1),
      this.MAX_DELAY
    );

    logger.info('Scheduled retry', { messageId, retry: retryCount, delay });

    const timer = setTimeout(() => {
      this.retry(messageId, data);
    }, delay);

    this.retryTimers.set(messageId, timer);
  }

  /**
   * 재시도 실행
   */
  private async retry(messageId: string, data: any): Promise<void> {
    try {
      logger.info('Executing retry', { messageId });

      // 실제 재시도 로직
      await this.sendMessage(data);

      // 성공 시 정리
      await this.redis.del(`retry:${messageId}:count`);
      this.retryTimers.delete(messageId);

      logger.info('Retry succeeded', { messageId });
    } catch (error) {
      logger.warn('Retry failed, will schedule next attempt', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // 다시 큐에 추가
      await this.enqueue(messageId, data);
    }
  }

  /**
   * 메시지 전송 (구현은 핸들러에서)
   */
  private async sendMessage(data: any): Promise<void> {
    // 실제 메시지 전송 로직
    // 예: Socket.IO emit, HTTP request 등
    throw new Error('Not implemented');
  }

  /**
   * 모든 재시도 취소
   */
  async cancelAll(): Promise<void> {
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    logger.info('All retries cancelled');
  }

  async shutdown() {
    await this.cancelAll();
    await this.redis.disconnect();
  }
}

export const retryQueue = new RetryQueue(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
```

### 4.2 Circuit Breaker 패턴

```typescript
// src/backend/circuit-breaker.ts
import { logger } from './utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',          // 정상 작동
  OPEN = 'OPEN',              // 차단
  HALF_OPEN = 'HALF_OPEN'     // 회복 시도
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold = 5;      // 5회 실패 시 차단
  private readonly successThreshold = 2;      // 2회 성공 시 복구
  private readonly resetTimeout = 30000;      // 30초 후 HALF_OPEN

  constructor(
    private name: string,
    private onStateChange?: (state: CircuitState) => void
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // 리셋 타임아웃 확인
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.setState(CircuitState.HALF_OPEN);
      } else {
        throw new Error(`Circuit breaker is OPEN (${this.name})`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      this.setState(CircuitState.OPEN);
    }
  }

  private setState(newState: CircuitState): void {
    if (newState === this.state) return;

    const oldState = this.state;
    this.state = newState;

    logger.warn(`Circuit breaker state changed`, {
      name: this.name,
      from: oldState,
      to: newState
    });

    this.onStateChange?.(newState);
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

---

## 5. 운영성 개선 (4주차)

### 5.1 구조화된 로깅

```typescript
// src/backend/utils/logger.ts
import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProd ? {} : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false
      }
    }
  })
});

export { logger };

// 사용 예시
export function withLogger(context: string) {
  return {
    debug: (message: string, data?: any) =>
      logger.debug({ ...data, context }, message),
    info: (message: string, data?: any) =>
      logger.info({ ...data, context }, message),
    warn: (message: string, data?: any) =>
      logger.warn({ ...data, context }, message),
    error: (message: string, error?: any, data?: any) =>
      logger.error({ ...data, context, error }, message)
  };
}
```

### 5.2 메트릭 수집

```typescript
// src/backend/utils/metrics.ts
import { StatsD } from 'node-statsd';

export class MetricsCollector {
  private statsd: StatsD;
  private localMetrics = {
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    latencies: [] as number[],
    errors: new Map<string, number>()
  };

  constructor() {
    this.statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: parseInt(process.env.STATSD_PORT || '8125'),
      prefix: 'vooster.'
    });
  }

  recordSuccess(event: string, latency: number) {
    this.localMetrics.requestCount++;
    this.localMetrics.successCount++;
    this.localMetrics.latencies.push(latency);

    this.statsd.increment(`event.${event}.success`);
    this.statsd.timing(`event.${event}.latency`, latency);

    if (this.localMetrics.latencies.length >= 100) {
      this.flushMetrics();
    }
  }

  recordFailure(event: string, latency: number, errorCode?: string) {
    this.localMetrics.requestCount++;
    this.localMetrics.failureCount++;

    this.statsd.increment(`event.${event}.failure`);
    if (errorCode) {
      this.statsd.increment(`event.${event}.error.${errorCode}`);
      const count = (this.localMetrics.errors.get(errorCode) || 0) + 1;
      this.localMetrics.errors.set(errorCode, count);
    }
  }

  private flushMetrics() {
    if (this.localMetrics.latencies.length === 0) return;

    const avg = this.localMetrics.latencies.reduce((a, b) => a + b) / this.localMetrics.latencies.length;
    const max = Math.max(...this.localMetrics.latencies);
    const min = Math.min(...this.localMetrics.latencies);

    // P95 계산
    const sorted = this.localMetrics.latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || 0;

    this.statsd.gauge('latency.avg', avg);
    this.statsd.gauge('latency.max', max);
    this.statsd.gauge('latency.min', min);
    this.statsd.gauge('latency.p95', p95);

    this.localMetrics.latencies = [];
  }

  getMetrics() {
    return {
      totalRequests: this.localMetrics.requestCount,
      successCount: this.localMetrics.successCount,
      failureCount: this.localMetrics.failureCount,
      successRate: this.localMetrics.requestCount === 0
        ? 100
        : (this.localMetrics.successCount / this.localMetrics.requestCount) * 100,
      errorBreakdown: Object.fromEntries(this.localMetrics.errors)
    };
  }
}

export const metricsCollector = new MetricsCollector();
```

---

(계속은 다음 부분)

---

## 6. 보안 강화 (5주차)

### 6.1 Rate Limiting

```typescript
// src/backend/socket-io/middleware/rate-limit.ts
import { Socket } from 'socket.io';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export class RateLimiter {
  private redis: ReturnType<typeof createClient>;
  private readonly windowMs = 60000; // 1분
  private readonly maxRequests = 100; // 1분에 100 요청

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async initialize() {
    await this.redis.connect();
  }

  async checkLimit(clientId: string): Promise<boolean> {
    const key = `ratelimit:${clientId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, Math.floor(this.windowMs / 1000));
    }

    return current <= this.maxRequests;
  }

  async shutdown() {
    await this.redis.disconnect();
  }
}

const rateLimiter = new RateLimiter(process.env.REDIS_URL || 'redis://localhost:6379');

export async function rateLimitMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const clientId = socket.id;
    const allowed = await rateLimiter.checkLimit(clientId);

    if (!allowed) {
      logger.warn('Rate limit exceeded', { clientId });
      return next(new Error('Rate limit exceeded'));
    }

    next();
  } catch (error) {
    next(error as Error);
  }
}
```

### 6.2 CSRF 방지

```typescript
// src/backend/socket-io/middleware/csrf.ts
import { Socket } from 'socket.io';
import { randomBytes } from 'crypto';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

export async function csrfMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    // 클라이언트가 제공하는 CSRF 토큰 확인
    const token = socket.handshake.headers['x-csrf-token'];

    if (!token || typeof token !== 'string') {
      return next(new Error('Missing CSRF token'));
    }

    // Redis에서 토큰 검증
    const key = `csrf:${socket.id}`;
    const stored = await redis.get(key);

    if (stored !== token) {
      return next(new Error('Invalid CSRF token'));
    }

    next();
  } catch (error) {
    next(error as Error);
  }
}

// 새로운 CSRF 토큰 생성
export async function generateCSRFToken(socketId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const key = `csrf:${socketId}`;

  // 1시간 유효
  await redis.setEx(key, 3600, token);

  return token;
}
```

### 6.3 Replay Attack 방지

```typescript
// src/backend/security/nonce-manager.ts
import { createClient } from 'redis';
import { logger } from '../utils/logger';

export class NonceManager {
  private redis: ReturnType<typeof createClient>;
  private readonly TTL = 300000; // 5분

  constructor(redisUrl: string) {
    this.redis = createClient({ url: redisUrl });
  }

  async initialize() {
    await this.redis.connect();
  }

  /**
   * Nonce 등록 (이전에 사용되지 않았는지 확인)
   */
  async registerNonce(nonce: string, userId: string): Promise<boolean> {
    const key = `nonce:${userId}:${nonce}`;
    const existed = await this.redis.get(key);

    if (existed) {
      logger.warn('Duplicate nonce detected (replay attack prevention)', {
        userId,
        nonce: nonce.substring(0, 8) + '...'
      });
      return false;
    }

    // Nonce 등록 (TTL 포함)
    await this.redis.setEx(key, Math.floor(this.TTL / 1000), '1');
    return true;
  }

  async shutdown() {
    await this.redis.disconnect();
  }
}

export const nonceManager = new NonceManager(
  process.env.REDIS_URL || 'redis://localhost:6379'
);
```

---

## 7. 성능 최적화 (6주차)

### 7.1 메시지 배치 처리

```typescript
// src/backend/queue/batch-processor.ts
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize = 50;
  private batchTimeout = 1000; // 1초
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private handler: (items: T[]) => Promise<void>,
    options?: {
      batchSize?: number;
      batchTimeout?: number;
    }
  ) {
    if (options?.batchSize) this.batchSize = options.batchSize;
    if (options?.batchTimeout) this.batchTimeout = options.batchTimeout;
  }

  async add(item: T): Promise<void> {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchTimeout);
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const items = this.batch.splice(0, this.batchSize);

    try {
      await this.handler(items);
    } catch (error) {
      logger.error('Batch processing failed', { error, itemCount: items.length });
      // 재시도 로직
    }
  }

  async shutdown(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.flush();
  }
}
```

---

## 8. 테스트 전략

### 8.1 단위 테스트

```typescript
// src/backend/auth/__tests__/token-manager.test.ts
import { describe, it, expect } from 'vitest';
import { TokenManager } from '../token-manager';
import jwt from 'jsonwebtoken';

describe('TokenManager', () => {
  it('should generate access token with correct payload', () => {
    const token = TokenManager.generateAccessToken('user-123', 'screen-001');

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = jwt.decode(token, { complete: true });
    expect(decoded?.payload).toMatchObject({
      userId: 'user-123',
      screenId: 'screen-001'
    });
  });

  it('should reject expired token', () => {
    const expiredToken = jwt.sign(
      { userId: 'user-123', screenId: 'screen-001' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '-1s' } // 이미 만료됨
    );

    expect(() => TokenManager.verifyAccessToken(expiredToken)).toThrow('TOKEN_EXPIRED');
  });

  it('should detect token expiring soon', () => {
    const soonToExpire = jwt.sign(
      { userId: 'user-123' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '2m' } // 2분 후 만료
    );

    expect(TokenManager.isExpiringSoon(soonToExpire)).toBe(true);
  });
});
```

### 8.2 통합 테스트

```typescript
// src/backend/__tests__/socket-io.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { setupSocketIO } from '../socket-io/server';
import { TokenManager } from '../auth/token-manager';
import http from 'http';

describe('Socket.IO Integration Tests', () => {
  let httpServer: http.Server;
  let socketServer: SocketIOServer;
  let clientSocket: ClientSocket;

  beforeEach(async () => {
    httpServer = http.createServer();
    socketServer = await setupSocketIO(httpServer);

    httpServer.listen(3001);

    // 테스트용 토큰 생성
    const token = TokenManager.generateAccessToken('test-user', 'test-screen');

    clientSocket = ioClient('http://localhost:3001', {
      auth: { token },
      reconnection: false
    });

    await new Promise(resolve => clientSocket.on('connect', resolve));
  });

  afterEach(() => {
    clientSocket.disconnect();
    socketServer.close();
    httpServer.close();
  });

  it('should handle trigger event with ACK', (done) => {
    const triggerData = {
      id: 'test-123',
      orderId: 'order-456',
      timestamp: Date.now()
    };

    clientSocket.emit('trigger', triggerData, (response: any) => {
      expect(response).toBeDefined();
      expect(response.id).toBe(triggerData.id);
      done();
    });
  });

  it('should reject invalid token', (done) => {
    const invalidSocket = ioClient('http://localhost:3001', {
      auth: { token: 'invalid-token' },
      reconnection: false
    });

    invalidSocket.on('connect_error', (error: Error) => {
      expect(error.message).toBe('INVALID_TOKEN');
      done();
    });
  });
});
```

---

## 9. 배포 및 모니터링

### 9.1 Docker 구성

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY src ./src
COPY tsconfig.json ./

# TypeScript 컴파일
RUN npm run build

# 포트 노출
EXPOSE 3001

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 서버 시작
CMD ["node", "dist/server.js"]
```

### 9.2 모니터링 엔드포인트

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { metricsCollector } from '@/backend/utils/metrics';
import { socketServer } from '@/backend/socket-io/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: socketServer.engine.clientsCount,
    metrics: metricsCollector.getMetrics()
  });
}
```

---

**다음 단계**: 각 주차별로 이 구현 가이드에 따라 개발을 진행하면 8주 안에 10점 만점의 백엔드 시스템을 완성할 수 있습니다.

