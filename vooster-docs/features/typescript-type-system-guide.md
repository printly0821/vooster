---
title: "TypeScript Type System Guide"
description: "타입 안정성과 런타임 검증을 통한 바코드 스캔 웹앱 타입 시스템 완벽 가이드"
category: "architecture-guide"
author: "TypeScript Pro"
date: "2025-10-22"
version: "1.0.0"
public: false
order: 20
---

# TypeScript 타입 시스템 완벽 가이드

웹 바코드 스캔 애플리케이션의 **전체 타입 시스템** 설계, 구현, 검증 방법을 다룹니다. Socket.IO 실시간 통신, React 상태 관리, 동기화 엔진의 타입 패턴을 상세히 분석합니다.

## 📖 목차

1. [개요](#개요)
2. [타입 안정성 설계](#타입-안정성-설계)
3. [Socket.IO 이벤트 타입](#socketio-이벤트-타입)
4. [React Hooks 타입 정의](#react-hooks-타입-정의)
5. [동기화 엔진 타입](#동기화-엔진-타입)
6. [API 클라이언트 타입](#api-클라이언트-타입)
7. [타입 기반 에러 방지](#타입-기반-에러-방지)
8. [TypeScript 고급 패턴](#typescript-고급-패턴)
9. [타입 테스트 전략](#타입-테스트-전략)
10. [Common Pitfalls & 해결책](#common-pitfalls--해결책)
11. [TypeScript 설정 권장사항](#typescript-설정-권장사항)

---

## 개요

### 타입 시스템의 목표

1. **컴파일 타임 에러 감지**: 런타임 전에 타입 오류 발견
2. **자동 완성 & IDE 지원**: 개발 생산성 향상
3. **문서화 효과**: 타입이 코드의 계약을 명시
4. **리팩토링 안정성**: 타입 정보로 안전한 변경 가능
5. **런타임 검증**: Zod를 통한 동적 타입 체크

### 프로젝트 TypeScript 현황

```
TypeScript Version: 5.0+
Strict Mode: ✅ 활성화
Target: ES2017
Module Resolution: bundler (Next.js 호환)
```

### 핵심 가이드라인

```typescript
// ✅ 권장: 타입 명시
interface User {
  id: string;
  role: 'mobile' | 'monitor';
}

// ❌ 피할 것: 암묵적 any
const user = { id: 'xxx', role: 'mobile' };

// ✅ 권장: 타입 유추
const users: User[] = [];

// ❌ 피할 것: 명시적 any
const users: any[] = [];
```

---

## 타입 안정성 설계

### 1. Zod 기반 런타임 검증

**왜 필요한가?**
- API 응답이 예상된 형식인지 런타임에 검증
- 클라이언트-서버 간 데이터 안정성 보장
- TypeScript 타입과 런타임 검증 동기화

#### 기본 패턴

```typescript
// ✅ 기본 스키마 정의 (Zod)
import { z } from 'zod';

// 1. 스키마 정의 (런타임 검증용)
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNo: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().positive(),
  status: z.enum(['pending', 'processing', 'completed']),
  thumbnails: z.array(z.string().url()),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

// 2. 타입 자동 추론 (TypeScript)
export type Order = z.infer<typeof OrderSchema>;

// 3. 런타임에서 사용
async function fetchOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}`);
  const data = await response.json();

  // 런타임 검증
  const result = OrderSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid order data: ${result.error.message}`);
  }

  return result.data; // 타입이 자동으로 Order
}
```

#### Zod 고급 패턴

```typescript
// 복합 스키마 (조건부 필드)
export const ScanEventSchema = z.object({
  sessionId: z.string().uuid(),
  orderNo: z.string(),
  timestamp: z.number().int().positive(),
  nonce: z.string().optional(),

  // 조건부 검증
  metadata: z.object({
    source: z.enum(['mobile', 'monitor']),
    accuracy: z.number().min(0).max(100).optional(),
  }).strict(),
});

// Transform으로 타입 변환
export const DateStringSchema = z
  .string()
  .datetime()
  .transform(val => new Date(val));

type ParsedDate = z.infer<typeof DateStringSchema>; // Date 타입

// Discriminated Union (상태 머신)
export const EventPayloadSchema = z.union([
  z.object({
    type: z.literal('scanOrder'),
    data: OrderSchema,
  }),
  z.object({
    type: z.literal('navigate'),
    data: z.object({ orderNo: z.string() }),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
  }),
]);

type EventPayload = z.infer<typeof EventPayloadSchema>;
```

### 2. Socket.IO 이벤트 타입 정의

**문제점**: 기본 Socket.IO는 이벤트 페이로드에 대한 타입 안정성이 없습니다.

**해결책**: 이벤트별 타입 정의와 검증 스키마 결합

```typescript
// server/src/types/index.ts

/**
 * Socket.IO 이벤트 페이로드 정의
 * 각 이벤트별 입력/출력 타입을 명시
 */
export interface EventPayload {
  // 클라이언트 → 서버
  registerClient: {
    role: 'mobile' | 'monitor';
  };

  joinSession: {
    sessionId: string;
  };

  scanOrder: {
    sessionId: string;
    orderNo: string;
    ts: number;
    nonce?: string;
  };

  navigate: {
    orderNo: string;
    ts: number;
    nonce?: string;
    from: 'mobile' | 'monitor';
  };

  heartbeat: void;

  // 서버 → 클라이언트
  'heartbeat:ack': number;

  'session:created': {
    sessionId: string;
    pairingToken: string;
    expiresIn: number;
    pairingUrl: string;
  };

  'session:paired': {
    sessionId: string;
    at: number;
  };

  'session:error': {
    code: 'INVALID_TOKEN' | 'SID_MISMATCH' | 'PAIRING_FAILED' | 'SESSION_EXPIRED';
    message: string;
  };
}

/**
 * 타입 안전 이벤트 핸들러 팩토리
 */
export type EventHandler<K extends keyof EventPayload> = (
  data: EventPayload[K]
) => void | Promise<void>;

/**
 * 타입 안전 이벤트 리스너
 */
export type TypedSocket = Socket & {
  on<K extends keyof EventPayload>(
    event: K,
    callback: EventHandler<K>
  ): this;

  emit<K extends keyof EventPayload>(
    event: K,
    data: EventPayload[K],
    callback?: (error?: any, result?: any) => void
  ): this;
};
```

### 3. Generic 타입 활용

```typescript
/**
 * API 응답 래퍼 (타입 안전)
 */
export type ApiResponse<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * 제네릭을 사용한 결과 타입
 */
export interface Result<T, E = Error> {
  isOk(): this is { ok: true; value: T };
  isErr(): this is { ok: false; error: E };
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  getOrElse(defaultValue: T): T;
}

/**
 * 구체적인 구현
 */
export class Ok<T, E> implements Result<T, E> {
  constructor(readonly value: T) {}

  isOk(): this is { ok: true; value: T } {
    return true;
  }

  isErr(): this is { ok: false; error: E } {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as any;
  }

  getOrElse(): T {
    return this.value;
  }
}

export class Err<T, E> implements Result<T, E> {
  constructor(readonly error: E) {}

  isOk(): this is { ok: true; value: T } {
    return false;
  }

  isErr(): this is { ok: false; error: E } {
    return true;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as any;
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  getOrElse(defaultValue: T): T {
    return defaultValue;
  }
}

/**
 * 사용 예시
 */
async function fetchOrderWithResult(id: string): Promise<Result<Order>> {
  try {
    const response = await fetch(`/api/orders/${id}`);
    const data = await response.json();
    const order = OrderSchema.parse(data);
    return new Ok(order);
  } catch (error) {
    return new Err(error as Error);
  }
}

// 활용
const result = await fetchOrderWithResult('123');

if (result.isOk()) {
  console.log(result.value.name); // ✅ Order 타입으로 자동 추론
} else {
  console.error(result.error.message);
}
```

### 4. 타입 가드 (Type Guard) 패턴

```typescript
/**
 * 기본 타입 가드
 */
function isOrder(data: unknown): data is Order {
  return OrderSchema.safeParse(data).success;
}

/**
 * 판별된 합 (Discriminated Union) 타입 가드
 */
export type EventPayload =
  | { type: 'scanOrder'; data: Order }
  | { type: 'navigate'; data: { orderNo: string } }
  | { type: 'error'; error: string };

function handleEvent(payload: EventPayload) {
  switch (payload.type) {
    case 'scanOrder':
      // ✅ payload.data는 Order 타입으로 자동 추론
      console.log(payload.data.name);
      break;

    case 'navigate':
      // ✅ payload.data는 { orderNo: string } 타입
      console.log(payload.data.orderNo);
      break;

    case 'error':
      // ✅ payload.error는 string 타입
      console.error(payload.error);
      break;
  }

  // ❌ TypeScript 에러: payload.data가 모든 union에 없음
  // console.log(payload.data);
}

/**
 * 사용자 정의 타입 가드
 */
function isMobileEvent(
  payload: EventPayload
): payload is Extract<EventPayload, { type: 'scanOrder' }> {
  return payload.type === 'scanOrder';
}

// 활용
if (isMobileEvent(payload)) {
  // payload.data는 Order 타입
}
```

---

## Socket.IO 이벤트 타입

### 1. 타입 안전 Socket.IO 설정

```typescript
// server/src/types/index.ts

import { Socket as IOSocket, Server as IOServer } from 'socket.io';

/**
 * 모든 Socket.IO 이벤트 페이로드 정의
 */
export interface ServerToClientEvents {
  registered: (data: { success: boolean; socketId: string }) => void;
  clientJoined: (data: {
    socketId: string;
    role: 'mobile' | 'monitor';
    status: SessionStatus;
  }) => void;
  scanOrderBroadcast: (data: {
    sessionId: string;
    orderNo: string;
    ts: number;
    source: 'mobile' | 'monitor';
  }) => void;
  'session:created': (data: {
    sessionId: string;
    pairingToken: string;
    expiresIn: number;
    pairingUrl: string;
  }) => void;
  'session:paired': (data: { sessionId: string; at: number }) => void;
  'session:error': (data: {
    code: 'INVALID_TOKEN' | 'SESSION_EXPIRED';
    message: string;
  }) => void;
  disconnect: () => void;
}

export interface ClientToServerEvents {
  registerClient: (data: { role: 'mobile' | 'monitor' }) => void;
  joinSession: (data: { sessionId: string }) => void;
  scanOrder: (
    data: {
      sessionId: string;
      orderNo: string;
      ts: number;
      nonce?: string;
    },
    callback?: (error: any, ack: { received: boolean; nonce: string }) => void
  ) => void;
  heartbeat: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user?: SocketUser;
  role?: 'mobile' | 'monitor';
}

/**
 * 타입 안전 Socket
 */
export type TypedSocket = IOSocket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * 타입 안전 Socket.IO 서버
 */
export type TypedIOServer = IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
```

### 2. 타입 안전 이벤트 핸들러

```typescript
// server/src/events/handlers.ts

import { TypedSocket, TypedIOServer } from '../types';
import { sessionService } from '../services/sessionService';

/**
 * 클라이언트 등록 핸들러 (타입 안전)
 */
export function handleRegisterClient(io: TypedIOServer, socket: TypedSocket) {
  return (data: { role: 'mobile' | 'monitor' }) => {
    try {
      socket.data.role = data.role;

      // ✅ emit에 타입 검증이 자동 적용됨
      socket.emit('registered', {
        success: true,
        socketId: socket.id,
      });

    } catch (error) {
      // ✅ 타입 안전 에러 이벤트
      socket.emit('session:error', {
        code: 'INVALID_TOKEN',
        message: (error as Error).message,
      });
    }
  };
}

/**
 * 세션 참여 핸들러 (타입 안전)
 */
export function handleJoinSession(io: TypedIOServer, socket: TypedSocket) {
  return (data: { sessionId: string }) => {
    try {
      const { sessionId } = data;
      const role = socket.data.role;

      if (!role) {
        socket.emit('session:error', {
          code: 'INVALID_TOKEN',
          message: '먼저 클라이언트를 등록해주세요.',
        });
        return;
      }

      // 세션 생성 또는 조회
      let session = sessionService.getSession(sessionId);
      if (!session) {
        session = sessionService.createSession(sessionId);
      }

      socket.join(sessionId);

      // 역할에 따라 등록
      if (role === 'mobile') {
        sessionService.registerMobileSocket(sessionId, socket.id);
      } else {
        sessionService.registerMonitorSocket(sessionId, socket.id);
      }

      // ✅ 브로드캐스트도 타입 안전
      io.to(sessionId).emit('clientJoined', {
        socketId: socket.id,
        role,
        status: sessionService.getSessionStatus(sessionId),
      });

    } catch (error) {
      socket.emit('session:error', {
        code: 'INVALID_TOKEN',
        message: (error as Error).message,
      });
    }
  };
}

/**
 * 주문 스캔 핸들러 (ACK 콜백 포함)
 */
export function handleScanOrder(io: TypedIOServer, socket: TypedSocket) {
  return (
    data: {
      sessionId: string;
      orderNo: string;
      ts: number;
      nonce?: string;
    },
    callback?: (error: any, ack: { received: boolean; nonce: string }) => void
  ) => {
    try {
      const { sessionId, orderNo, ts, nonce } = data;

      if (!sessionId || !orderNo) {
        callback?.(
          new Error('sessionId와 orderNo가 필요합니다'),
          { received: false, nonce: nonce || '' }
        );
        return;
      }

      // ✅ 브로드캐스트
      io.to(sessionId).emit('scanOrderBroadcast', {
        sessionId,
        orderNo,
        ts,
        source: socket.data.role || 'mobile',
      });

      // ✅ ACK 응답
      callback?.(null, { received: true, nonce: nonce || '' });

    } catch (error) {
      callback?.(error, { received: false, nonce: '' });
    }
  };
}
```

### 3. 클라이언트 Socket.IO 타입

```typescript
// src/hooks/useSocket.ts

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/server/src/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(sessionId: string, role: 'mobile' | 'monitor') {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // ✅ 소켓 생성
    const socket: TypedSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: {
        token: localStorage.getItem('auth_token'),
      },
    });

    // ✅ 이벤트 핸들러 (타입 안전)
    socket.on('connect', () => {
      setIsConnected(true);

      // 클라이언트 역할 등록
      socket.emit('registerClient', { role });

      // 세션에 참여
      socket.emit('joinSession', { sessionId });
    });

    // ✅ 스캔 이벤트 수신 (타입 안전)
    socket.on('scanOrderBroadcast', (data) => {
      // data의 타입이 자동으로 추론됨
      console.log(`Order ${data.orderNo} scanned from ${data.source}`);
    });

    socket.on('session:error', (error) => {
      // error의 타입이 자동으로 추론됨
      console.error(`Error: ${error.code} - ${error.message}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [sessionId, role]);

  /**
   * 주문 스캔 전송 (콜백 포함)
   */
  const scanOrder = useCallback(
    (orderNo: string) => {
      const socket = socketRef.current;
      if (!socket) return;

      const nonce = crypto.randomUUID();

      // ✅ 콜백으로 ACK 처리
      socket.emit(
        'scanOrder',
        {
          sessionId,
          orderNo,
          ts: Date.now(),
          nonce,
        },
        (error, ack) => {
          if (error) {
            console.error('Scan failed:', error);
          } else {
            console.log('Scan received:', ack.received);
          }
        }
      );
    },
    [sessionId]
  );

  return {
    isConnected,
    scanOrder,
    socket: socketRef.current,
  };
}
```

---

## React Hooks 타입 정의

### 1. 커스텀 Hook 타입 설계

```typescript
// src/hooks/types.ts

import { UseQueryResult } from '@tanstack/react-query';

/**
 * 주문 조회 Hook 반환 타입
 */
export interface UseOrderQueryReturn
  extends UseQueryResult<Order, Error> {
  // 추가 기능이 필요하면 확장
}

/**
 * 세션 관리 Hook 반환 타입
 */
export interface UseSessionReturn {
  sessionId: string | null;
  isConnected: boolean;
  error: Error | null;
  createSession: () => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: () => void;
}

/**
 * 바코드 스캔 Hook 반환 타입
 */
export interface UseBarcodeReturn {
  scanning: boolean;
  error: Error | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  result: string | null;
}
```

### 2. React Query Hook 타입

```typescript
// src/features/orders/hooks/useOrderQuery.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { OrderSchema } from '@/server/src/sync/types';
import type { Order } from '@/features/orders/types';

/**
 * 쿼리 키 정의 (타입 안전)
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: string) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
} as const;

/**
 * 주문 조회 Hook (타입 안전)
 */
export function useOrderQuery(orderId: string | null) {
  return useQuery<Order, Error>({
    queryKey: orderId ? orderKeys.detail(orderId) : [],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');

      const response = await apiClient.get<unknown>(`/api/orders/${orderId}`);

      // ✅ 런타임 검증
      const result = OrderSchema.safeParse(response.data);

      if (!result.success) {
        throw new Error(`Invalid order data: ${result.error.message}`);
      }

      return result.data;
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 여러 주문 조회 Hook
 */
export function useOrdersQuery(orderIds: string[]) {
  return useQueries({
    queries: orderIds.map(id => ({
      queryKey: orderKeys.detail(id),
      queryFn: async () => {
        const response = await apiClient.get<unknown>(`/api/orders/${id}`);
        return OrderSchema.parse(response.data);
      },
    })),
  });
}

/**
 * 주문 목록 조회 Hook (필터 포함)
 */
export interface OrderListFilters {
  status?: Order['status'];
  limit?: number;
  offset?: number;
}

export function useOrderListQuery(filters: OrderListFilters = {}) {
  const filterKey = JSON.stringify(filters);

  return useQuery<Order[], Error>({
    queryKey: orderKeys.list(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await apiClient.get<unknown>(
        `/api/orders?${params.toString()}`
      );

      // ✅ 배열 검증
      const result = z.array(OrderSchema).safeParse(response.data);

      if (!result.success) {
        throw new Error(`Invalid orders list: ${result.error.message}`);
      }

      return result.data;
    },
  });
}
```

### 3. Zustand 상태 관리 타입

```typescript
// src/features/session/store/sessionStore.ts

'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * 세션 상태 타입
 */
export interface SessionState {
  sessionId: string | null;
  userId: string | null;
  role: 'mobile' | 'monitor' | null;
  pairedAt: number | null;

  // 액션
  setSessionId: (id: string) => void;
  setUser: (userId: string, role: 'mobile' | 'monitor') => void;
  clearSession: () => void;
}

/**
 * Zustand 스토어 (타입 안전)
 */
export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        sessionId: null,
        userId: null,
        role: null,
        pairedAt: null,

        setSessionId: (id) =>
          set({ sessionId: id }, false, 'setSessionId'),

        setUser: (userId, role) =>
          set(
            { userId, role, pairedAt: Date.now() },
            false,
            'setUser'
          ),

        clearSession: () =>
          set(
            { sessionId: null, userId: null, role: null, pairedAt: null },
            false,
            'clearSession'
          ),
      }),
      {
        name: 'session-store',
      }
    ),
    { name: 'SessionStore' }
  )
);

/**
 * 사용 예시
 */
export function useSessionId(): string {
  const sessionId = useSessionStore((state) => state.sessionId);

  if (!sessionId) {
    throw new Error('Session not initialized');
  }

  return sessionId;
}

export function useUserRole(): 'mobile' | 'monitor' {
  const role = useSessionStore((state) => state.role);

  if (!role) {
    throw new Error('User role not set');
  }

  return role;
}
```

---

## 동기화 엔진 타입

### 1. Zod 기반 스키마 정의

```typescript
// server/src/sync/types.ts

import { z } from 'zod';

/**
 * 태스크 상태 열거형
 */
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * 로컬 태스크 Zod 스키마
 */
export const LocalTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 로컬 태스크 타입 (Zod에서 자동 추론)
 */
export type LocalTask = z.infer<typeof LocalTaskSchema>;

/**
 * 원격 태스크 스키마
 */
export const RemoteTaskSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  updatedAt: z.string(),
  createdAt: z.string(),
  etag: z.string().optional(),
  version: z.number().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type RemoteTask = z.infer<typeof RemoteTaskSchema>;

/**
 * 동기화 결과 타입 (판별된 합)
 */
export const SyncResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    operation: z.enum(['create', 'update', 'delete']),
    localId: z.string(),
    remoteId: z.string().optional(),
    timestamp: z.string().datetime(),
    durationMs: z.number(),
  }),
  z.object({
    status: z.literal('error'),
    operation: z.enum(['create', 'update', 'delete']),
    localId: z.string(),
    error: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    status: z.literal('conflict'),
    localId: z.string(),
    remoteId: z.string(),
    resolution: z.enum(['local', 'remote', 'skip']),
    timestamp: z.string().datetime(),
  }),
]);

export type SyncResult = z.infer<typeof SyncResultSchema>;
```

### 2. 동기화 엔진 서비스 타입

```typescript
// server/src/sync/sync/syncEngine.ts

import { LocalTask, RemoteTask, SyncResult, SyncStats } from '../types';

/**
 * 동기화 엔진 인터페이스
 */
export interface ISyncEngine {
  /**
   * 동기화 시작
   */
  sync(): Promise<SyncStats>;

  /**
   * 단일 태스크 동기화
   */
  syncTask(localTask: LocalTask): Promise<SyncResult>;

  /**
   * 충돌 해결
   */
  resolveConflict(
    local: LocalTask,
    remote: RemoteTask
  ): Promise<'local' | 'remote' | 'skip'>;

  /**
   * 건강 상태 확인
   */
  getHealth(): Promise<HealthStatus>;
}

/**
 * 동기화 엔진 구현
 */
export class SyncEngine implements ISyncEngine {
  private isRunning = false;
  private stats: SyncStats = {
    totalSynced: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    conflicts: 0,
    errors: 0,
    skipped: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
  };

  constructor(
    private voosterClient: IVoosterClient,
    private config: SyncConfig,
    private logger: ILogger
  ) {}

  async sync(): Promise<SyncStats> {
    if (this.isRunning) {
      this.logger.warn('Sync already in progress');
      return this.stats;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // 동기화 로직
      // ...

      return {
        ...this.stats,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.isRunning = false;
    }
  }

  async syncTask(localTask: LocalTask): Promise<SyncResult> {
    try {
      // 검증
      const validated = LocalTaskSchema.parse(localTask);

      // 동기화
      // ...

      return {
        status: 'success',
        operation: 'update',
        localId: validated.id,
        timestamp: new Date().toISOString(),
        durationMs: 100,
      };
    } catch (error) {
      return {
        status: 'error',
        operation: 'update',
        localId: localTask.id,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async resolveConflict(
    local: LocalTask,
    remote: RemoteTask
  ): Promise<'local' | 'remote' | 'skip'> {
    // 최신 수정 시간 비교
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    if (localTime > remoteTime) {
      return 'local';
    } else if (remoteTime > localTime) {
      return 'remote';
    } else {
      // 동일한 시간이면 원격을 우선 (서버가 신뢰할 수 있는 소스)
      return 'remote';
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return {
      healthy: !this.isRunning,
      lastSyncAt: this.stats.completedAt,
      lastErrorAt: null,
      pendingOperations: 0,
      stats: this.stats,
    };
  }
}
```

---

## API 클라이언트 타입

### 1. Axios 클라이언트 타입

```typescript
// src/lib/remote/api-client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * API 에러 커스텀 타입
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 클라이언트 (제네릭)
 */
export class TypedApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ code: string; message: string }>) => {
        throw new ApiError(
          error.response?.data?.code || 'UNKNOWN_ERROR',
          error.response?.status || 500,
          error.response?.data?.message || error.message,
          error.response?.data
        );
      }
    );
  }

  /**
   * GET 요청 (제네릭)
   */
  async get<T>(url: string, schema?: z.ZodSchema<T>): Promise<T> {
    const response = await this.client.get<T>(url);

    if (schema) {
      // ✅ 런타임 검증
      const result = schema.safeParse(response.data);

      if (!result.success) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'Response validation failed',
          result.error
        );
      }

      return result.data;
    }

    return response.data;
  }

  /**
   * POST 요청 (제네릭)
   */
  async post<T, D = unknown>(
    url: string,
    data?: D,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const response = await this.client.post<T>(url, data);

    if (schema) {
      const result = schema.safeParse(response.data);

      if (!result.success) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'Response validation failed',
          result.error
        );
      }

      return result.data;
    }

    return response.data;
  }
}

/**
 * 글로벌 API 클라이언트 인스턴스
 */
export const apiClient = new TypedApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
);
```

### 2. 타입 안전 요청/응답 정의

```typescript
// src/features/orders/backend/schema.ts

import { z } from 'zod';

/**
 * GET /orders/:id 요청
 */
export const GetOrderParamsSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export type GetOrderParams = z.infer<typeof GetOrderParamsSchema>;

/**
 * GET /orders/:id 응답
 */
export const GetOrderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNo: z.string(),
  name: z.string(),
  quantity: z.number().positive(),
  status: z.enum(['pending', 'processing', 'completed']),
  thumbnails: z.array(z.string().url()),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export type GetOrderResponse = z.infer<typeof GetOrderResponseSchema>;

/**
 * 에러 응답
 */
export const ApiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
```

### 3. API 호출 서비스

```typescript
// src/features/orders/backend/service.ts

import { apiClient } from '@/lib/remote/api-client';
import {
  GetOrderParams,
  GetOrderParamsSchema,
  GetOrderResponse,
  GetOrderResponseSchema,
} from './schema';

/**
 * 주문 조회 서비스
 */
export class OrderService {
  /**
   * 주문 단일 조회 (타입 안전)
   */
  async getOrder(id: string): Promise<GetOrderResponse> {
    // 요청 검증
    const params = GetOrderParamsSchema.parse({ id });

    // API 호출 (응답 검증 포함)
    return apiClient.get<GetOrderResponse>(
      `/api/orders/${params.id}`,
      GetOrderResponseSchema
    );
  }

  /**
   * 여러 주문 조회
   */
  async getOrders(ids: string[]): Promise<GetOrderResponse[]> {
    // 요청 검증
    const validIds = z.array(z.string().uuid()).parse(ids);

    // 병렬 요청
    const results = await Promise.allSettled(
      validIds.map((id) => this.getOrder(id))
    );

    // 성공한 결과만 반환
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<GetOrderResponse>).value);
  }
}

export const orderService = new OrderService();
```

---

## 타입 기반 에러 방지

### 1. Discriminated Unions으로 상태 관리

```typescript
/**
 * 로딩 상태를 Discriminated Union으로 표현
 */
export type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

/**
 * 상태별 처리 (컴파일 타임 안전성)
 */
function renderOrder(state: LoadingState<Order>) {
  switch (state.status) {
    case 'idle':
      return <div>준비 중</div>;

    case 'loading':
      return <LoadingSpinner />;

    case 'success':
      // ✅ state.data는 Order 타입으로 자동 추론
      return <OrderCard order={state.data} />;

    case 'error':
      // ✅ state.error는 Error 타입
      return <ErrorMessage error={state.error} />;

    default:
      // ❌ 타입 스크립트가 모든 케이스를 확인했는지 보장
      const _exhaustive: never = state;
      return _exhaustive;
  }
}

/**
 * 상태 업데이트도 타입 안전
 */
function updateOrder(
  state: LoadingState<Order>,
  action: { type: 'fetch'; id: string } | { type: 'success'; data: Order } | { type: 'error'; error: Error }
): LoadingState<Order> {
  switch (action.type) {
    case 'fetch':
      return { status: 'loading' };

    case 'success':
      return { status: 'success', data: action.data };

    case 'error':
      return { status: 'error', error: action.error };

    default:
      const _exhaustive: never = action;
      return _exhaustive;
  }
}
```

### 2. Optional Chaining & Nullish Coalescing

```typescript
/**
 * Optional Chaining (?.)
 * - 타입 안전하게 중첩된 속성 접근
 */
function getOrderName(order: Order | undefined): string {
  // ❌ 위험: order가 undefined일 수 있음
  // return order.name;

  // ✅ 안전: undefined 체크 자동화
  return order?.name ?? 'Unknown Order';
}

/**
 * Nullish Coalescing (??)
 * - null/undefined일 때만 기본값 사용
 */
function getOrderStatus(order: Order | null): OrderStatus {
  // ❌ 위험: falsy 값(0, false, '')도 기본값으로 대체
  // return order?.status || 'pending';

  // ✅ 안전: null/undefined만 체크
  return order?.status ?? 'pending';
}

/**
 * 실제 사용 예
 */
export function OrderDisplay({ order }: { order: Order | undefined }) {
  return (
    <div>
      {/* ✅ 타입 안전 */}
      <h2>{order?.name ?? '주문 정보 없음'}</h2>
      <p>상태: {order?.status ?? 'unknown'}</p>
      <p>수량: {order?.quantity ?? 0}</p>

      {/* ✅ 메서드 호출도 안전 */}
      {order?.metadata?.tags?.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
```

### 3. Exhaustive Type Checking

```typescript
/**
 * 모든 경우를 처리하지 않으면 TypeScript 에러 발생
 */
function handleEventType(event: EventPayload) {
  // ❌ 에러: 'error' 케이스를 처리하지 않음
  // switch (event.type) {
  //   case 'scanOrder':
  //     break;
  //   case 'navigate':
  //     break;
  //   // error 케이스 누락 → 타입 에러
  // }

  // ✅ 올바른 처리
  const _exhaustiveCheck = (e: EventPayload) => {
    switch (e.type) {
      case 'scanOrder':
        return e.data; // Order 타입

      case 'navigate':
        return e.data; // { orderNo: string } 타입

      case 'error':
        return e.error; // string 타입

      default:
        const _never: never = e;
        throw new Error(`Unhandled event: ${_never}`);
    }
  };
}

/**
 * Union 타입이 추가되면 자동으로 컴파일 에러
 */
type NewEvent = EventPayload | { type: 'warning'; message: string };

function handleNewEvent(event: NewEvent) {
  // ❌ 에러: 'warning' 케이스 처리 필요
  switch (event.type) {
    case 'scanOrder':
      break;
    case 'navigate':
      break;
    case 'error':
      break;
    // warning 누락 → 타입 에러 발생!
  }
}
```

---

## TypeScript 고급 패턴

### 1. 조건부 타입 (Conditional Types)

```typescript
/**
 * 타입에 따라 다른 결과 반환
 */
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false

/**
 * API 응답 타입 추론
 */
type ResponseType<T extends 'order' | 'user'> = T extends 'order'
  ? Order
  : T extends 'user'
    ? User
    : never;

const orderType: ResponseType<'order'> = {
  // Order 타입
};

const userType: ResponseType<'user'> = {
  // User 타입
};

/**
 * Flatten 타입 (배열을 풀어냄)
 */
type Flatten<T> = T extends (infer U)[] ? U : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>; // number
```

### 2. Mapped Types

```typescript
/**
 * 객체의 모든 값을 readonly로 변환
 */
type ReadonlyUser = {
  readonly [K in keyof User]: User[K];
};

/**
 * 모든 메서드를 비동기로 변환
 */
type AsyncMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

interface UserService {
  getUser(id: string): User;
  updateUser(id: string, data: Partial<User>): void;
}

type AsyncUserService = AsyncMethods<UserService>;
// {
//   getUser(id: string): Promise<User>;
//   updateUser(id: string, data: Partial<User>): Promise<void>;
// }

/**
 * API 상태 타입 제너레이터
 */
type LoadingStateMap<T> = {
  [K in keyof T]: LoadingState<T[K]>;
};

interface OrderApi {
  orders: Order[];
  order: Order;
  details: OrderDetails;
}

type OrderApiState = LoadingStateMap<OrderApi>;
// {
//   orders: LoadingState<Order[]>;
//   order: LoadingState<Order>;
//   details: LoadingState<OrderDetails>;
// }
```

### 3. Template Literal Types

```typescript
/**
 * 이벤트 이름 타입 안전성
 */
type EventName = `scan${'Order' | 'User'}` | `navigate${'To' | 'Back'}`;

// ✅ 유효한 이벤트
const event1: EventName = 'scanOrder';
const event2: EventName = 'navigateTo';

// ❌ 타입 에러: 유효하지 않은 이벤트
// const event3: EventName = 'scanProduct';

/**
 * API 엔드포인트 생성
 */
type ApiEndpoint<T extends string> = `/api/${T}/${string}`;

const ordersEndpoint: ApiEndpoint<'orders'> = '/api/orders/123';
// ❌ 타입 에러
// const wrongEndpoint: ApiEndpoint<'orders'> = '/v1/orders/123';

/**
 * 상태 이벤트 이름 생성
 */
type StateEvent<T> = T extends `${infer Name}`
  ? `${Name}:change` | `${Name}:reset`
  : never;

type OrderEvents = StateEvent<'order'>; // 'order:change' | 'order:reset'
```

### 4. Infer & Extract

```typescript
/**
 * 함수의 반환 타입 추출
 */
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;

function getOrder(id: string): Order {
  // ...
}

type OrderReturn = ReturnType<typeof getOrder>; // Order

/**
 * Promise 안의 타입 추출
 */
type Awaited<T> = T extends Promise<infer U> ? U : T;

async function fetchOrder(): Promise<Order> {
  // ...
}

type FetchedOrder = Awaited<ReturnType<typeof fetchOrder>>; // Order

/**
 * Union에서 특정 타입 추출
 */
type Extract<T, U> = T extends U ? T : never;

type EventWithError = Extract<EventPayload, { type: 'error' }>;
// { type: 'error'; error: string }

/**
 * 실제 사용: API 응답 배열의 요소 타입 추출
 */
async function fetchOrders(): Promise<Order[]> {
  // ...
}

type SingleOrder = Awaited<
  ReturnType<typeof fetchOrders>
>[number]; // Order
```

### 5. 의존성 주입 패턴

```typescript
/**
 * 인터페이스 기반 의존성 주입
 */
interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  error(message: string, error: Error): void;
}

interface IVoosterClient {
  fetchTask(id: string): Promise<RemoteTask>;
  updateTask(id: string, task: RemoteTask): Promise<void>;
}

/**
 * 서비스가 인터페이스에만 의존
 */
class SyncEngine {
  constructor(
    private logger: ILogger,
    private voosterClient: IVoosterClient,
    private config: SyncConfig
  ) {}

  async sync(): Promise<void> {
    this.logger.info('Sync started');

    try {
      const task = await this.voosterClient.fetchTask('123');
      this.logger.debug('Task fetched', task);
    } catch (error) {
      this.logger.error('Sync failed', error as Error);
    }
  }
}

/**
 * 테스트할 때 Mock 구현 제공
 */
class MockLogger implements ILogger {
  debug() {}
  info() {}
  error() {}
}

class MockVoosterClient implements IVoosterClient {
  async fetchTask(): Promise<RemoteTask> {
    return { id: '123', title: 'Mock Task', /* ... */ };
  }

  async updateTask(): Promise<void> {}
}

// 테스트
const engine = new SyncEngine(
  new MockLogger(),
  new MockVoosterClient(),
  { /* config */ }
);
```

---

## 타입 테스트 전략

### 1. 타입 검증 테스트

```typescript
// src/__tests__/types.test.ts

import { expectType, expectAssignable, expectNotAssignable } from 'tsd';
import type { EventPayload, LoadingState, Order } from '@/types';

/**
 * 기본 타입 검증
 */
describe('Type Checks', () => {
  it('should validate EventPayload structure', () => {
    const event: EventPayload = {
      type: 'scanOrder',
      data: { id: '123', orderNo: 'ORD001', /* ... */ },
    };

    // ✅ 타입이 올바름을 확인
    expectType<EventPayload>(event);
  });

  it('should reject invalid EventPayload', () => {
    // ❌ 타입 에러 (테스트 컴파일 시 실패)
    // const event: EventPayload = {
    //   type: 'invalid',
    //   data: {},
    // };
  });

  it('should infer LoadingState correctly', () => {
    const state: LoadingState<Order> = {
      status: 'success',
      data: { id: '123', /* ... */ },
    };

    // ✅ 타입 검증
    if (state.status === 'success') {
      expectType<Order>(state.data);
    }
  });

  it('should handle Partial correctly', () => {
    const partial: Partial<Order> = { name: 'Updated' };

    // ✅ 모든 필드가 optional
    expectAssignable<Partial<Order>>({});
    expectAssignable<Partial<Order>>({ id: '123' });
  });

  it('should prevent readonly violations', () => {
    const readonlyOrder: Readonly<Order> = {
      id: '123',
      orderNo: 'ORD001',
      /* ... */
    };

    // ❌ 타입 에러: readonly 필드 수정 불가
    // readonlyOrder.name = 'New Name';
  });
});
```

### 2. 런타임 검증 테스트

```typescript
// src/features/orders/__tests__/types.test.ts

import { describe, it, expect } from 'vitest';
import { OrderSchema } from '@/features/orders/types';

describe('OrderSchema Runtime Validation', () => {
  it('should validate correct order data', () => {
    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      orderNo: 'ORD001',
      name: '주문명',
      quantity: 10,
      status: 'pending',
      thumbnails: ['https://example.com/img.jpg'],
      createdAt: '2025-10-22T00:00:00Z',
    };

    const result = OrderSchema.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(validData.id);
    }
  });

  it('should reject invalid order data', () => {
    const invalidData = {
      id: 'invalid-uuid',
      orderNo: '',
      name: '주문명',
      quantity: -10, // 음수는 불가
      status: 'invalid', // enum 값이 아님
      thumbnails: ['not-a-url'],
      createdAt: 'invalid-date',
    };

    const result = OrderSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('should handle partial validation', () => {
    const partialData = {
      orderNo: 'ORD001',
      name: '주문명',
      quantity: 10,
    };

    // Partial 스키마 검증
    const PartialOrderSchema = OrderSchema.partial();
    const result = PartialOrderSchema.safeParse(partialData);

    expect(result.success).toBe(true);
  });

  it('should transform datetime strings', () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      orderNo: 'ORD001',
      name: '주문명',
      quantity: 10,
      status: 'pending',
      thumbnails: [],
      createdAt: '2025-10-22T15:30:00Z',
    };

    const result = OrderSchema.safeParse(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(String);
    }
  });
});
```

---

## Common Pitfalls & 해결책

### 1. 타입 좁히기 실패

**문제:**
```typescript
// ❌ 위험
function getOrder(id: string | null): Order {
  return apiClient.get(`/api/orders/${id}`); // id가 null일 수 있음
}
```

**해결:**
```typescript
// ✅ 안전
function getOrder(id: string | null): Order | null {
  if (!id) return null;
  return apiClient.get(`/api/orders/${id}`);
}

// 또는 타입 가드 활용
function getOrderOrThrow(id: string | null): Order {
  if (!id) {
    throw new Error('Order ID is required');
  }
  return apiClient.get(`/api/orders/${id}`);
}

// 사용
const order = getOrder(userId);
if (order) {
  console.log(order.name);
}
```

### 2. Any 타입 남용

**문제:**
```typescript
// ❌ 위험: any는 타입 검사를 우회
const data: any = fetchSomeData();
console.log(data.name); // 타입 검사 없음
console.log(data.nonExistent); // 에러 없이 undefined 반환
```

**해결:**
```typescript
// ✅ unknown 사용
const data: unknown = fetchSomeData();

// 타입 가드 필요
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log(data.name);
}

// 또는 Zod 검증
const result = OrderSchema.safeParse(data);
if (result.success) {
  console.log(result.data.name);
}
```

### 3. 타입 추론 실패

**문제:**
```typescript
// ❌ 타입이 너무 넓게 추론
const orders = [];
orders.push({ id: '1', name: 'Order 1' });
// orders의 타입: Array<{ id: string; name: string }>
// 하지만 IDE에서는 타입을 알 수 없음
```

**해결:**
```typescript
// ✅ 명시적 타입 선언
const orders: Order[] = [];
orders.push({ id: '1', name: 'Order 1', /* ... */ });

// 또는 const assertion
const orders = [
  { id: '1', name: 'Order 1' },
] as const;

type Order = typeof orders[number];
```

### 4. 비동기 타입 누락

**문제:**
```typescript
// ❌ Promise를 await하지 않음
function getOrder(id: string): Order {
  return apiClient.get(`/api/orders/${id}`); // Promise<Order> 반환되지만 Order를 리턴하는 척함
}

const order = getOrder('123');
console.log(order.name); // ❌ Promise이므로 undefined
```

**해결:**
```typescript
// ✅ async/await
async function getOrder(id: string): Promise<Order> {
  return apiClient.get(`/api/orders/${id}`);
}

const order = await getOrder('123');
console.log(order.name); // ✅ 올바름

// ✅ Promise 체이닝
function getOrder(id: string): Promise<Order> {
  return apiClient.get(`/api/orders/${id}`);
}

getOrder('123').then(order => {
  console.log(order.name);
});
```

### 5. 번사이드 문제 (Burnside Problem)

**문제:**
```typescript
// ❌ 타입이 교환되지 않는 관계
type A = string | number;
type B = string | boolean;

const value: A = 'hello';
const result: B = value; // ❌ 타입 에러: number는 B에 할당 불가
```

**해결:**
```typescript
// ✅ 공통 타입만 사용
type Common = string; // A와 B의 교집합

const value: A = 'hello';
const result: Common = value;

// ✅ Union 타입 사용
type Combined = A & B; // string (교집합)
```

---

## TypeScript 설정 권장사항

### 1. tsconfig.json 최적 설정

```json
{
  "compilerOptions": {
    // 엄격한 타입 검사
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,

    // 추가 검사
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,

    // 모듈 설정
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",

    // 출력 설정
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,

    // 기타
    "resolveJsonModule": true,
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    // Path mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/server/*": ["./server/src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### 2. ESLint TypeScript 규칙

```javascript
// .eslintrc.json
{
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error"
  },
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

### 3. 라이브러리 타입 정의

```typescript
// src/types/index.ts

/**
 * 프로젝트 전체 타입 정의 (공개 API)
 */

// Socket.IO 타입
export type {
  EventPayload,
  SocketUser,
  PairingSession,
} from '@/server/src/types';

// 도메인 타입
export type {
  Order,
  OrderStatus,
  User,
  Session,
} from '@/features/types';

// API 타입
export type {
  ApiResponse,
  ApiError,
} from '@/lib/remote/api-client';

// 상태 머신 타입
export type { LoadingState } from '@/features/common/types';
```

---

## 요약 & 체크리스트

### 타입 시스템 체크리스트

- [ ] **tsconfig.json**: strict 모드 활성화
- [ ] **Zod 스키마**: 모든 API 응답 검증
- [ ] **제네릭**: 반복되는 코드 줄이기
- [ ] **Union 타입**: 상태 머신으로 불가능한 상태 방지
- [ ] **타입 가드**: 타입 좁히기로 런타임 에러 방지
- [ ] **의존성 주입**: 인터페이스 기반 설계
- [ ] **타입 테스트**: 컴파일 타임 검증
- [ ] **문서화**: 타입으로 계약 명시

### 성능 최적화

```typescript
// ✅ 권장: type-only import
import type { Order } from '@/types';

// ❌ 피할 것: 런타임 import
// import { Order } from '@/types';

// ✅ 권장: 조건부 타입
type T = Condition extends true ? TypeA : TypeB;

// ❌ 피할 것: 복잡한 조건문
// type T = Condition ? TypeA : TypeB;
```

---

## 참고 자료

- [TypeScript 공식 문서](https://www.typescriptlang.org/docs/)
- [Zod 문서](https://zod.dev/)
- [Socket.IO TypeScript 가이드](https://socket.io/docs/v4/typescript/)
- [React Query 타입 안전성](https://tanstack.com/query/latest/docs/react/typescript)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

---

**마지막 업데이트**: 2025-10-22
**버전**: 1.0.0
**작성자**: TypeScript Pro
**상태**: Public 준비 완료
