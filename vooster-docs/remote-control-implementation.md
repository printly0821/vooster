# 원격 제어 시스템 구현 가이드
## Vooster 세컨드 모니터 기능 (F-06) 실제 적용

**작성일**: 2025-10-23
**대상**: 세컨드 모니터 제작의뢰서 표시 기능 개발
**초점**: 코드 레벨 구현 및 단계별 적용 방법

---

## 1. 프로젝트 준비

### 1.1 필요 패키지 설치

```bash
# 공유 타입 및 검증
npm install zod

# WebSocket 라이브러리
npm install ws
npm install -D @types/ws

# 로깅 (선택사항이지만 권장)
npm install pino pino-pretty

# Electron (세컨드 모니터 제어용)
npm install electron
npm install -D @types/electron

# 테스트
npm install -D vitest @testing-library/react
```

### 1.2 tsconfig.json 확인

```json
{
  "compilerOptions": {
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "module": "esnext",
    "target": "ES2020",
    "lib": ["ES2020"],
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"],
      "@backend/*": ["./src/backend/*"]
    }
  }
}
```

---

## 2. 단계 1: 공유 타입 정의

### 2.1 파일: src/shared/types/command.ts

```typescript
/**
 * src/shared/types/command.ts
 *
 * 모든 가능한 명령을 정의합니다.
 * 클라이언트와 서버가 공유하므로, 이 파일을 수정하면
 * 양쪽 모두 컴파일 에러가 발생하여 일관성을 보장합니다.
 */

/**
 * 지원하는 명령 목록
 */
export type CommandAction =
  | 'SHOW_DOCUMENT'      // 문서 표시
  | 'HIDE_DOCUMENT'      // 문서 숨기기
  | 'FOCUS_WINDOW'       // 윈도우 포커스
  | 'CLOSE_WINDOW'       // 윈도우 닫기
  | 'RESIZE_WINDOW'      // 윈도우 크기 변경
  | 'MOVE_WINDOW'        // 윈도우 이동
  | 'GET_DISPLAYS';      // 현재 디스플레이 목록 조회

/**
 * 각 명령별 파라미터 (Discriminated Union)
 * 컴파일 타임에 타입 체크: action에 맞는 params만 사용 가능
 */
export type CommandParams<T extends CommandAction = CommandAction> = T extends 'SHOW_DOCUMENT'
  ? {
      /** 표시할 문서의 파일 경로 */
      documentPath: string;
      /** 선택사항: 대상 윈도우 ID */
      windowId?: string;
      /** 선택사항: 모니터 인덱스 (0 = 메인, 1 = 세컨드) */
      displayIndex?: number;
      /** 선택사항: 전체 화면 표시 */
      fullscreen?: boolean;
    }
  : T extends 'HIDE_DOCUMENT'
  ? {
      /** 숨길 윈도우의 ID */
      windowId: string;
    }
  : T extends 'FOCUS_WINDOW'
  ? {
      /** 포커스할 윈도우의 ID */
      windowId: string;
    }
  : T extends 'CLOSE_WINDOW'
  ? {
      /** 닫을 윈도우의 ID */
      windowId: string;
    }
  : T extends 'RESIZE_WINDOW'
  ? {
      /** 대상 윈도우 ID */
      windowId: string;
      /** 새로운 너비 (픽셀) */
      width: number;
      /** 새로운 높이 (픽셀) */
      height: number;
    }
  : T extends 'MOVE_WINDOW'
  ? {
      /** 대상 윈도우 ID */
      windowId: string;
      /** X 좌표 */
      x: number;
      /** Y 좌표 */
      y: number;
    }
  : T extends 'GET_DISPLAYS'
  ? {
      /** 비어있음 - 매개변수 없음 */
    }
  : never;

/**
 * 각 명령별 응답 타입
 */
export type CommandResult<T extends CommandAction = CommandAction> = T extends 'SHOW_DOCUMENT'
  ? {
      /** 생성된 윈도우 ID */
      windowId: string;
      /** 표시된 모니터 인덱스 */
      displayIndex: number;
      success: true;
    }
  : T extends 'HIDE_DOCUMENT'
  ? {
      success: true;
    }
  : T extends 'FOCUS_WINDOW'
  ? {
      success: true;
    }
  : T extends 'CLOSE_WINDOW'
  ? {
      success: true;
    }
  : T extends 'RESIZE_WINDOW'
  ? {
      success: true;
      /** 실제 적용된 크기 */
      actualWidth: number;
      actualHeight: number;
    }
  : T extends 'MOVE_WINDOW'
  ? {
      success: true;
      /** 실제 적용된 좌표 */
      actualX: number;
      actualY: number;
    }
  : T extends 'GET_DISPLAYS'
  ? {
      displays: Array<{
        id: string;
        name: string;
        bounds: { x: number; y: number; width: number; height: number };
        workArea: { x: number; y: number; width: number; height: number };
        scaleFactor: number;
        primary: boolean;
      }>;
    }
  : never;

/**
 * 명령 객체 (메타데이터 포함)
 */
export interface Command<T extends CommandAction = CommandAction> {
  action: T;
  params: CommandParams<T>;
  metadata?: {
    userId?: string;
    orderId?: string;
    timestamp?: number;
    correlationId?: string;
  };
}

/**
 * 타입 가드: 특정 액션 확인
 */
export function isCommandAction<T extends CommandAction>(
  value: unknown,
  action: T
): value is T {
  return value === action;
}
```

### 2.2 파일: src/shared/types/rpc.ts

```typescript
/**
 * src/shared/types/rpc.ts
 *
 * JSON-RPC 2.0 프로토콜 정의
 */

import type { CommandAction, CommandParams, CommandResult } from './command';

/**
 * JSON-RPC 2.0 요청 형식
 */
export interface RpcRequest<T extends CommandAction = CommandAction> {
  jsonrpc: '2.0';
  id: string | number;
  method: T;
  params: CommandParams<T>;
}

/**
 * 성공 응답
 */
export interface RpcSuccessResponse<T extends CommandAction = CommandAction> {
  jsonrpc: '2.0';
  id: string | number;
  result: CommandResult<T>;
}

/**
 * 에러 응답
 */
export interface RpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * 모든 RPC 응답
 */
export type RpcResponse<T extends CommandAction = CommandAction> =
  | RpcSuccessResponse<T>
  | RpcErrorResponse;

/**
 * RPC 에러 코드 (JSON-RPC 2.0 표준)
 */
export const RpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000,
} as const;

/**
 * 타입 가드: 성공 응답 확인
 */
export function isSuccessResponse<T extends CommandAction>(
  response: RpcResponse<T>
): response is RpcSuccessResponse<T> {
  return 'result' in response;
}

/**
 * 타입 가드: 에러 응답 확인
 */
export function isErrorResponse(response: RpcResponse): response is RpcErrorResponse {
  return 'error' in response;
}
```

### 2.3 파일: src/shared/types/error.ts

```typescript
/**
 * src/shared/types/error.ts
 *
 * 도메인 특화 에러 타입 정의
 */

/**
 * 모든 가능한 에러 유형
 */
export type CommandError =
  | ValidationError
  | NotFoundError
  | PermissionError
  | TimeoutError
  | SystemError
  | UnknownError;

/**
 * 유효성 검증 실패
 */
export interface ValidationError {
  type: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
  timestamp: number;
}

/**
 * 리소스를 찾을 수 없음
 */
export interface NotFoundError {
  type: 'NOT_FOUND_ERROR';
  resource: 'WINDOW' | 'DOCUMENT' | 'DISPLAY';
  resourceId: string;
  timestamp: number;
}

/**
 * 권한 없음
 */
export interface PermissionError {
  type: 'PERMISSION_ERROR';
  required: string[];
  message: string;
  timestamp: number;
}

/**
 * 타임아웃
 */
export interface TimeoutError {
  type: 'TIMEOUT_ERROR';
  timeout: number;
  command: string;
  timestamp: number;
}

/**
 * 시스템 에러
 */
export interface SystemError {
  type: 'SYSTEM_ERROR';
  code: string;
  message: string;
  systemCode?: number;
  timestamp: number;
}

/**
 * 알 수 없는 에러
 */
export interface UnknownError {
  type: 'UNKNOWN_ERROR';
  message: string;
  details?: unknown;
  timestamp: number;
}

/**
 * 타입 가드
 */
export function isValidationError(error: CommandError): error is ValidationError {
  return error.type === 'VALIDATION_ERROR';
}

export function isNotFoundError(error: CommandError): error is NotFoundError {
  return error.type === 'NOT_FOUND_ERROR';
}

export function isPermissionError(error: CommandError): error is PermissionError {
  return error.type === 'PERMISSION_ERROR';
}

export function isTimeoutError(error: CommandError): error is TimeoutError {
  return error.type === 'TIMEOUT_ERROR';
}

export function isSystemError(error: CommandError): error is SystemError {
  return error.type === 'SYSTEM_ERROR';
}
```

---

## 3. 단계 2: Zod 스키마 (검증)

### 3.1 파일: src/shared/schema/command.schema.ts

```typescript
/**
 * src/shared/schema/command.schema.ts
 *
 * 런타임 검증을 위한 Zod 스키마
 * 클라이언트에서 전송하는 데이터와 서버에서 수신하는 데이터를 검증합니다.
 */

import { z } from 'zod';
import type { CommandAction } from '../types/command';

/**
 * 파일 경로 검증
 */
const filePathSchema = z
  .string()
  .min(1, '파일 경로는 필수입니다')
  .max(500, '파일 경로가 너무 깁니다')
  .refine(
    (path) => !path.includes('..'),
    '상대 경로는 허용되지 않습니다'
  );

/**
 * 윈도우 ID 검증
 */
const windowIdSchema = z
  .string()
  .min(1, '윈도우 ID는 필수입니다')
  .regex(/^[a-zA-Z0-9_-]+$/, '유효하지 않은 윈도우 ID');

/**
 * 디스플레이 인덱스 검증
 */
const displayIndexSchema = z
  .number()
  .int('디스플레이 인덱스는 정수여야 합니다')
  .min(0, '디스플레이 인덱스는 0 이상이어야 합니다')
  .max(10, '지원하는 최대 디스플레이는 10개입니다');

/**
 * 각 명령별 파라미터 스키마
 */
export const CommandSchemas = {
  SHOW_DOCUMENT: z.object({
    documentPath: filePathSchema,
    windowId: z.string().optional(),
    displayIndex: displayIndexSchema.optional().default(0),
    fullscreen: z.boolean().optional().default(false),
  }),
  HIDE_DOCUMENT: z.object({
    windowId: windowIdSchema,
  }),
  FOCUS_WINDOW: z.object({
    windowId: windowIdSchema,
  }),
  CLOSE_WINDOW: z.object({
    windowId: windowIdSchema,
  }),
  RESIZE_WINDOW: z.object({
    windowId: windowIdSchema,
    width: z
      .number()
      .int('너비는 정수여야 합니다')
      .positive('너비는 양수여야 합니다')
      .max(3840, '너비는 3840px 이하여야 합니다'),
    height: z
      .number()
      .int('높이는 정수여야 합니다')
      .positive('높이는 양수여야 합니다')
      .max(2160, '높이는 2160px 이하여야 합니다'),
  }),
  MOVE_WINDOW: z.object({
    windowId: windowIdSchema,
    x: z.number().int('X 좌표는 정수여야 합니다'),
    y: z.number().int('Y 좌표는 정수여야 합니다'),
  }),
  GET_DISPLAYS: z.object({}),
} as const;

/**
 * 명령별 파라미터 검증
 */
export function validateCommandParams<T extends CommandAction>(
  action: T,
  params: unknown
): z.SafeParseResult<any> {
  const schema = CommandSchemas[action];
  return (schema as any).safeParse(params);
}

/**
 * RPC 요청 전체 검증
 */
export const RpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string().or(z.number()),
  method: z.enum([
    'SHOW_DOCUMENT',
    'HIDE_DOCUMENT',
    'FOCUS_WINDOW',
    'CLOSE_WINDOW',
    'RESIZE_WINDOW',
    'MOVE_WINDOW',
    'GET_DISPLAYS',
  ] as const),
  params: z.record(z.any()),
});

/**
 * 검증 결과 타입
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * RPC 요청 파싱 및 검증
 */
export function parseRpcRequest(data: unknown): ValidationResult<any> {
  // 1단계: JSON-RPC 구조 검증
  const requestResult = RpcRequestSchema.safeParse(data);
  if (!requestResult.success) {
    return { success: false, error: requestResult.error };
  }

  const { method, params } = requestResult.data;

  // 2단계: 명령별 파라미터 검증
  const paramValidation = validateCommandParams(method, params);
  if (!paramValidation.success) {
    return { success: false, error: paramValidation.error };
  }

  return { success: true, data: requestResult.data };
}
```

---

## 4. 단계 3: 클라이언트 구현

### 4.1 파일: src/frontend/lib/websocket/rpc-client.ts

```typescript
/**
 * src/frontend/lib/websocket/rpc-client.ts
 *
 * 타입 안전한 RPC 클라이언트 구현
 * 웹 브라우저에서 로컬 서버와 통신합니다.
 */

import type { CommandAction, CommandParams, CommandResult, RpcRequest, RpcResponse } from '@shared/types';
import { isSuccessResponse, isErrorResponse, RpcErrorCode } from '@shared/types/rpc';

/**
 * RPC 클라이언트 옵션
 */
export interface RpcClientOptions {
  /** WebSocket 서버 URL */
  url: string;
  /** 요청 타임아웃 (ms) */
  timeout?: number;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 재시도 간격 (ms) */
  retryDelay?: number;
  /** 연결 성공 콜백 */
  onConnect?: () => void;
  /** 연결 종료 콜백 */
  onDisconnect?: () => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
}

/**
 * 대기 중인 요청 정보
 */
interface PendingRequest<T extends CommandAction> {
  resolve: (result: CommandResult<T>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * RPC 클라이언트 (싱글톤)
 */
export class RpcClient {
  private ws: WebSocket | null = null;
  private url: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private pendingRequests = new Map<string | number, PendingRequest<any>>();
  private requestId = 0;
  private connected = false;
  private callbacks: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
  };

  constructor(options: RpcClientOptions) {
    this.url = options.url;
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.callbacks = {
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect,
      onError: options.onError,
    };
  }

  /**
   * 서버에 연결
   */
  async connect(retryCount = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.connected = true;
          console.log('[RPC] Connected to server');
          this.callbacks.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket connection error');
          this.callbacks.onError?.(error);
          console.error('[RPC] Error:', error);
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('[RPC] Disconnected from server');
          this.callbacks.onDisconnect?.();
        };
      } catch (error) {
        if (retryCount < this.maxRetries) {
          console.log(`[RPC] Retrying connection (${retryCount + 1}/${this.maxRetries})`);
          setTimeout(() => {
            this.connect(retryCount + 1).then(resolve).catch(reject);
          }, this.retryDelay);
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * 명령 전송 (타입 안전)
   */
  async sendCommand<T extends CommandAction>(
    action: T,
    params: CommandParams<T>
  ): Promise<CommandResult<T>> {
    if (!this.connected) {
      throw new Error('[RPC] Client is not connected. Call connect() first.');
    }

    const id = ++this.requestId;
    const request: RpcRequest<T> = {
      jsonrpc: '2.0',
      id,
      method: action,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`[RPC] Request timeout after ${this.timeout}ms (command: ${action})`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout: timer });

      try {
        console.log(`[RPC] Sending request [${id}]:`, { action, params });
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * 응답 처리
   */
  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data) as RpcResponse;
      const { id } = response;
      const pending = this.pendingRequests.get(id);

      if (!pending) {
        console.warn(`[RPC] Received response for unknown request ID: ${id}`);
        return;
      }

      this.pendingRequests.delete(id);
      clearTimeout(pending.timeout);

      if (isSuccessResponse(response)) {
        console.log(`[RPC] Success response [${id}]:`, response.result);
        pending.resolve(response.result);
      } else if (isErrorResponse(response)) {
        const errorMsg = response.error.message;
        const error = new Error(`[RPC] Error [${response.error.code}]: ${errorMsg}`);
        (error as any).code = response.error.code;
        (error as any).data = response.error.data;
        console.error(`[RPC] Error response [${id}]:`, error);
        pending.reject(error);
      }
    } catch (error) {
      console.error('[RPC] Failed to parse response:', error);
    }
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * 싱글톤 인스턴스
 */
let clientInstance: RpcClient | null = null;

/**
 * 클라이언트 생성 (싱글톤)
 */
export function createRpcClient(options: RpcClientOptions): RpcClient {
  if (clientInstance) {
    clientInstance.disconnect();
  }
  clientInstance = new RpcClient(options);
  return clientInstance;
}

/**
 * 기존 클라이언트 가져오기
 */
export function getRpcClient(): RpcClient {
  if (!clientInstance) {
    throw new Error('[RPC] Client not initialized. Call createRpcClient first.');
  }
  return clientInstance;
}
```

### 4.2 파일: src/frontend/features/remote-display/hooks/useRemoteDisplay.ts

```typescript
/**
 * src/frontend/features/remote-display/hooks/useRemoteDisplay.ts
 *
 * React Hook: 세컨드 모니터 제어
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { createRpcClient, getRpcClient } from '@/lib/websocket/rpc-client';
import type { CommandError } from '@shared/types/error';

export interface UseRemoteDisplayReturn {
  /** 서버 연결 상태 */
  isConnected: boolean;
  /** 명령 실행 중 */
  isLoading: boolean;
  /** 마지막 에러 */
  error: Error | null;
  /** 문서 표시 명령 */
  showDocument: (path: string, displayIndex?: number) => Promise<string>;
  /** 문서 숨기기 명령 */
  hideDocument: (windowId: string) => Promise<void>;
  /** 윈도우 포커스 명령 */
  focusWindow: (windowId: string) => Promise<void>;
  /** 디스플레이 목록 조회 */
  getDisplays: () => Promise<any[]>;
  /** 에러 초기화 */
  clearError: () => void;
}

/**
 * 커스텀 Hook
 */
export function useRemoteDisplay(): UseRemoteDisplayReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 초기화: RPC 클라이언트 연결
  useEffect(() => {
    const initClient = async () => {
      try {
        const client = createRpcClient({
          url: process.env.NEXT_PUBLIC_RPC_URL || 'ws://localhost:3001',
          timeout: 10000,
          onConnect: () => {
            console.log('[Hook] Connected to RPC server');
            setIsConnected(true);
          },
          onDisconnect: () => {
            console.log('[Hook] Disconnected from RPC server');
            setIsConnected(false);
          },
          onError: (err) => {
            console.error('[Hook] RPC error:', err);
            setError(err);
          },
        });

        await client.connect();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('연결 실패');
        console.error('[Hook] Failed to initialize client:', error);
        setError(error);
      }
    };

    initClient();

    // 정리
    return () => {
      try {
        const client = getRpcClient();
        client.disconnect();
      } catch (err) {
        // 이미 초기화되지 않은 경우
      }
    };
  }, []);

  /**
   * 문서 표시
   */
  const showDocument = useCallback(
    async (path: string, displayIndex = 0): Promise<string> => {
      if (!isConnected) {
        throw new Error('서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = getRpcClient();
        const result = await client.sendCommand('SHOW_DOCUMENT', {
          documentPath: path,
          displayIndex,
        });

        console.log('[Hook] Document shown:', result);
        return result.windowId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('문서 표시 실패');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected]
  );

  /**
   * 문서 숨기기
   */
  const hideDocument = useCallback(
    async (windowId: string) => {
      if (!isConnected) {
        throw new Error('서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = getRpcClient();
        await client.sendCommand('HIDE_DOCUMENT', { windowId });
        console.log('[Hook] Document hidden');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('문서 숨기기 실패');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected]
  );

  /**
   * 윈도우 포커스
   */
  const focusWindow = useCallback(
    async (windowId: string) => {
      if (!isConnected) {
        throw new Error('서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = getRpcClient();
        await client.sendCommand('FOCUS_WINDOW', { windowId });
        console.log('[Hook] Window focused');
      } catch (err) {
        const error = err instanceof Error ? err : new Error('윈도우 포커스 실패');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected]
  );

  /**
   * 디스플레이 목록 조회
   */
  const getDisplays = useCallback(
    async () => {
      if (!isConnected) {
        throw new Error('서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = getRpcClient();
        const result = await client.sendCommand('GET_DISPLAYS', {});
        console.log('[Hook] Displays:', result.displays);
        return result.displays;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('디스플레이 조회 실패');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected]
  );

  /**
   * 에러 초기화
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    showDocument,
    hideDocument,
    focusWindow,
    getDisplays,
    clearError,
  };
}
```

### 4.3 파일: src/frontend/features/remote-display/components/DisplayControlButton.tsx

```typescript
/**
 * src/frontend/features/remote-display/components/DisplayControlButton.tsx
 *
 * UI 컴포넌트: 세컨드 모니터 표시 버튼
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRemoteDisplay } from '../hooks/useRemoteDisplay';
import { useToast } from '@/hooks/use-toast';

interface DisplayControlButtonProps {
  /** 표시할 문서 경로 */
  documentPath: string;
  /** 대상 모니터 인덱스 (기본값: 1 = 세컨드 모니터) */
  displayIndex?: number;
  /** 버튼 클릭 후 콜백 */
  onSuccess?: (windowId: string) => void;
  /** 에러 발생 시 콜백 */
  onError?: (error: Error) => void;
}

export function DisplayControlButton({
  documentPath,
  displayIndex = 1,
  onSuccess,
  onError,
}: DisplayControlButtonProps) {
  const { showDocument, isLoading, error, clearError } = useRemoteDisplay();
  const { toast } = useToast();
  const [windowId, setWindowId] = useState<string | null>(null);

  const handleShowOnDisplay = async () => {
    try {
      clearError();
      const wid = await showDocument(documentPath, displayIndex);
      setWindowId(wid);

      toast({
        title: '성공',
        description: `제작의뢰서가 세컨드 모니터에 표시되었습니다.`,
        variant: 'default',
      });

      onSuccess?.(wid);
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      });
      onError?.(err instanceof Error ? err : new Error(message));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleShowOnDisplay}
        disabled={isLoading}
        variant="default"
        className="w-full"
      >
        {isLoading ? '전송 중...' : '세컨드 모니터에 표시'}
      </Button>

      {error && (
        <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
          {error.message}
        </div>
      )}

      {windowId && (
        <div className="text-xs text-green-600 p-2 bg-green-50 rounded">
          윈도우 ID: {windowId}
        </div>
      )}
    </div>
  );
}
```

---

## 5. 단계 4: 서버 구현 (Electron/Node.js)

### 5.1 파일: src/backend/rpc/handlers/base.ts

```typescript
/**
 * src/backend/rpc/handlers/base.ts
 *
 * RPC 핸들러 기본 클래스
 */

import type { CommandAction, CommandParams, CommandResult } from '@shared/types';

/**
 * 모든 핸들러의 기본 클래스
 */
export abstract class CommandHandler<T extends CommandAction> {
  /** 이 핸들러가 처리하는 명령 */
  abstract action: T;

  /**
   * 핸들러 초기화 (선택사항)
   */
  async initialize?(): Promise<void>;

  /**
   * 입력 데이터 검증 (선택사항)
   */
  async validate?(params: CommandParams<T>): Promise<void> {
    // 기본 구현: 검증 없음
  }

  /**
   * 명령 실행 (필수)
   */
  abstract execute(params: CommandParams<T>): Promise<CommandResult<T>>;

  /**
   * 정리 작업 (선택사항)
   */
  async cleanup?(): Promise<void>;
}
```

### 5.2 파일: src/backend/rpc/handlers/show-document.ts

```typescript
/**
 * src/backend/rpc/handlers/show-document.ts
 *
 * SHOW_DOCUMENT 명령 핸들러
 * 세컨드 모니터에 PDF 또는 이미지를 표시합니다.
 */

import path from 'path';
import { BrowserWindow, screen } from 'electron';
import { CommandHandler } from './base';
import type { CommandParams, CommandResult } from '@shared/types';
import type { NotFoundError, SystemError } from '@shared/types/error';

/**
 * 생성된 윈도우 정보 (메모리에 저장)
 */
const windows = new Map<string, BrowserWindow>();
let windowCounter = 0;

export class ShowDocumentHandler extends CommandHandler<'SHOW_DOCUMENT'> {
  action = 'SHOW_DOCUMENT' as const;

  /**
   * 파일 존재 여부 확인
   */
  async validate(params: CommandParams<'SHOW_DOCUMENT'>): Promise<void> {
    const { documentPath } = params;

    // 경로 검증
    if (!documentPath.startsWith('/') && !documentPath.match(/^[a-zA-Z]:/)) {
      throw {
        type: 'VALIDATION_ERROR',
        message: '절대 경로만 허용됩니다',
        fields: { documentPath: 'Must be an absolute path' },
        timestamp: Date.now(),
      };
    }

    // 파일 시스템 접근 시뮬레이션 (실제로는 fs.existsSync 사용)
    // const fs = require('fs');
    // if (!fs.existsSync(documentPath)) {
    //   throw { type: 'NOT_FOUND_ERROR', ... }
    // }
  }

  /**
   * 명령 실행
   */
  async execute(
    params: CommandParams<'SHOW_DOCUMENT'>
  ): Promise<CommandResult<'SHOW_DOCUMENT'>> {
    const { documentPath, displayIndex = 1, fullscreen = false } = params;

    try {
      // 입력 검증
      await this.validate(params);

      // 디스플레이 정보 확인
      const displays = screen.getAllDisplays();
      if (displayIndex >= displays.length) {
        throw {
          type: 'NOT_FOUND_ERROR',
          resource: 'DISPLAY',
          resourceId: `display-${displayIndex}`,
          timestamp: Date.now(),
        } as const;
      }

      const display = displays[displayIndex];
      const { x, y, width, height } = display.bounds;

      // 새 윈도우 생성
      const windowId = `win-${++windowCounter}`;
      const newWindow = new BrowserWindow({
        x: fullscreen ? x : x + 50,
        y: fullscreen ? y : y + 50,
        width: fullscreen ? width : width - 100,
        height: fullscreen ? height : height - 100,
        fullscreen,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
        },
      });

      // 문서 로드 (PDF Viewer 또는 이미지)
      if (documentPath.endsWith('.pdf')) {
        // PDF 뷰어 로드
        newWindow.webContents.session.protocol.registerFileProtocol('file', (request, callback) => {
          const url = request.url.slice(7);
          callback({ path: url });
        });

        newWindow.loadFile(documentPath);
      } else {
        // 이미지 표시
        newWindow.loadFile(documentPath);
      }

      // 윈도우 정보 저장
      windows.set(windowId, newWindow);

      // 윈도우 닫힐 때 정리
      newWindow.on('closed', () => {
        windows.delete(windowId);
      });

      console.log(`[ShowDocumentHandler] Window created: ${windowId} on display ${displayIndex}`);

      return {
        windowId,
        displayIndex,
        success: true,
      };
    } catch (error: any) {
      console.error('[ShowDocumentHandler] Error:', error);

      throw {
        type: 'SYSTEM_ERROR',
        code: 'SHOW_DOCUMENT_ERROR',
        message: error.message || 'Failed to show document',
        timestamp: Date.now(),
      } as SystemError;
    }
  }
}

/**
 * 윈도우 관리 유틸리티
 */
export function getWindow(windowId: string): BrowserWindow | null {
  return windows.get(windowId) || null;
}

export function getAllWindows(): Map<string, BrowserWindow> {
  return windows;
}
```

### 5.3 파일: src/backend/rpc/handlers/hide-document.ts

```typescript
/**
 * src/backend/rpc/handlers/hide-document.ts
 *
 * HIDE_DOCUMENT 명령 핸들러
 */

import { CommandHandler } from './base';
import type { CommandParams, CommandResult } from '@shared/types';
import { getWindow } from './show-document';

export class HideDocumentHandler extends CommandHandler<'HIDE_DOCUMENT'> {
  action = 'HIDE_DOCUMENT' as const;

  async execute(
    params: CommandParams<'HIDE_DOCUMENT'>
  ): Promise<CommandResult<'HIDE_DOCUMENT'>> {
    const { windowId } = params;

    try {
      const window = getWindow(windowId);
      if (!window) {
        throw {
          type: 'NOT_FOUND_ERROR',
          resource: 'WINDOW',
          resourceId: windowId,
          timestamp: Date.now(),
        };
      }

      window.hide();
      console.log(`[HideDocumentHandler] Window hidden: ${windowId}`);

      return { success: true };
    } catch (error: any) {
      throw {
        type: 'SYSTEM_ERROR',
        code: 'HIDE_DOCUMENT_ERROR',
        message: error.message || 'Failed to hide document',
        timestamp: Date.now(),
      };
    }
  }
}
```

### 5.4 파일: src/backend/rpc/handlers/get-displays.ts

```typescript
/**
 * src/backend/rpc/handlers/get-displays.ts
 *
 * GET_DISPLAYS 명령 핸들러
 * 현재 연결된 모니터 목록을 반환합니다.
 */

import { screen } from 'electron';
import { CommandHandler } from './base';
import type { CommandParams, CommandResult } from '@shared/types';

export class GetDisplaysHandler extends CommandHandler<'GET_DISPLAYS'> {
  action = 'GET_DISPLAYS' as const;

  async execute(
    params: CommandParams<'GET_DISPLAYS'>
  ): Promise<CommandResult<'GET_DISPLAYS'>> {
    try {
      const displays = screen.getAllDisplays();

      return {
        displays: displays.map((display, index) => ({
          id: `display-${index}`,
          name: `Display ${index + 1}`,
          bounds: display.bounds,
          workArea: display.workArea,
          scaleFactor: display.scaleFactor,
          primary: display.id === screen.getPrimaryDisplay().id,
        })),
      };
    } catch (error: any) {
      throw {
        type: 'SYSTEM_ERROR',
        code: 'GET_DISPLAYS_ERROR',
        message: error.message || 'Failed to get displays',
        timestamp: Date.now(),
      };
    }
  }
}
```

### 5.5 파일: src/backend/rpc/server.ts

```typescript
/**
 * src/backend/rpc/server.ts
 *
 * RPC 서버 (WebSocket 기반)
 * Electron 메인 프로세스에서 실행됩니다.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { parseRpcRequest } from '@shared/schema/command.schema';
import { errorToRpcError } from '@shared/types/error';
import { RpcErrorCode } from '@shared/types/rpc';
import type { CommandHandler } from './handlers/base';
import { ShowDocumentHandler } from './handlers/show-document';
import { HideDocumentHandler } from './handlers/hide-document';
import { GetDisplaysHandler } from './handlers/get-displays';

/**
 * RPC 서버
 */
export class RpcServer {
  private wss: WebSocketServer;
  private handlers = new Map<string, CommandHandler<any>>();
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.wss = new WebSocketServer({ port });
    this.registerHandlers();
    this.setupServer();
  }

  /**
   * 핸들러 등록
   */
  private registerHandlers(): void {
    const handlers = [
      new ShowDocumentHandler(),
      new HideDocumentHandler(),
      new GetDisplaysHandler(),
      // 추후 추가: FocusWindowHandler, CloseWindowHandler, etc.
    ];

    handlers.forEach((handler) => {
      this.handlers.set(handler.action, handler);
      console.log(`[RpcServer] Registered handler for: ${handler.action}`);
    });
  }

  /**
   * 서버 설정
   */
  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[RpcServer] Client connected');

      ws.on('message', async (data: Buffer) => {
        await this.handleRequest(ws, data.toString());
      });

      ws.on('close', () => {
        console.log('[RpcServer] Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('[RpcServer] WebSocket error:', error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[RpcServer] Server error:', error);
    });
  }

  /**
   * RPC 요청 처리
   */
  private async handleRequest(ws: WebSocket, data: string): Promise<void> {
    try {
      console.log(`[RpcServer] Received: ${data}`);

      // 요청 파싱 및 검증
      const parseResult = parseRpcRequest(JSON.parse(data));
      if (!parseResult.success) {
        const errors = parseResult.error.flatten();
        return this.sendError(
          ws,
          '-1',
          RpcErrorCode.INVALID_PARAMS,
          'Invalid request parameters',
          { errors: errors.fieldErrors }
        );
      }

      const { id, method, params } = parseResult.data;
      const handler = this.handlers.get(method);

      if (!handler) {
        return this.sendError(
          ws,
          id,
          RpcErrorCode.METHOD_NOT_FOUND,
          `Unknown method: ${method}`
        );
      }

      // 핸들러 실행
      try {
        console.log(`[RpcServer] Executing: ${method}`);
        const result = await handler.execute(params);
        this.sendSuccess(ws, id, result);
      } catch (error: any) {
        console.error(`[RpcServer] Handler error:`, error);
        const rpcError = errorToRpcError(error);
        this.sendError(ws, id, rpcError.code, rpcError.message, rpcError.data);
      }
    } catch (error: any) {
      console.error('[RpcServer] Request handling error:', error);
      this.sendError(
        ws,
        '-1',
        RpcErrorCode.INTERNAL_ERROR,
        'Internal server error',
        { error: error.message }
      );
    }
  }

  /**
   * 성공 응답 전송
   */
  private sendSuccess(ws: WebSocket, id: string | number, result: unknown): void {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };
    console.log(`[RpcServer] Sending success [${id}]:`, result);
    ws.send(JSON.stringify(response));
  }

  /**
   * 에러 응답 전송
   */
  private sendError(
    ws: WebSocket,
    id: string | number,
    code: number,
    message: string,
    data?: unknown
  ): void {
    const response = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };
    console.log(`[RpcServer] Sending error [${id}]:`, response.error);
    ws.send(JSON.stringify(response));
  }

  /**
   * 서버 시작
   */
  start(): void {
    console.log(`[RpcServer] Listening on ws://localhost:${this.port}`);
  }

  /**
   * 서버 종료
   */
  stop(): void {
    this.wss.close();
    console.log('[RpcServer] Server stopped');
  }
}
```

---

## 6. 단계 5: Electron 메인 프로세스 통합

### 6.1 파일: src/backend/electron/main.ts

```typescript
/**
 * src/backend/electron/main.ts
 *
 * Electron 메인 프로세스
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { RpcServer } from '../rpc/server';

let mainWindow: BrowserWindow | null = null;
let rpcServer: RpcServer | null = null;

/**
 * 메인 윈도우 생성
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // 개발 환경
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * RPC 서버 시작
 */
function startRpcServer(): void {
  rpcServer = new RpcServer(3001);
  rpcServer.start();
}

/**
 * 앱 시작
 */
app.on('ready', () => {
  createWindow();
  startRpcServer();
});

/**
 * 앱 종료
 */
app.on('window-all-closed', () => {
  if (rpcServer) {
    rpcServer.stop();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

---

## 7. 통합 테스트

### 7.1 파일: src/__tests__/remote-display.integration.test.ts

```typescript
/**
 * src/__tests__/remote-display.integration.test.ts
 *
 * 통합 테스트: 클라이언트 ↔ 서버 통신
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RpcClient } from '@/frontend/lib/websocket/rpc-client';
import { RpcServer } from '@/backend/rpc/server';
import { WebSocket, Server as WebSocketServer } from 'ws';

describe('Remote Display RPC Communication', () => {
  let server: RpcServer;
  let client: RpcClient;
  let connected = false;

  beforeEach(async () => {
    // 서버 시작
    server = new RpcServer(9001); // 테스트용 포트
    server.start();

    // 클라이언트 생성
    client = new RpcClient({
      url: 'ws://localhost:9001',
      timeout: 5000,
      onConnect: () => { connected = true; },
    });

    await client.connect();
    expect(connected).toBe(true);
  });

  afterEach(() => {
    client.disconnect();
    server.stop();
  });

  it('should get displays successfully', async () => {
    const result = await client.sendCommand('GET_DISPLAYS', {});

    expect(result).toHaveProperty('displays');
    expect(Array.isArray(result.displays)).toBe(true);
    expect(result.displays.length).toBeGreaterThan(0);
  });

  it('should show document with valid path', async () => {
    // Electron 윈도우 모킹
    const result = await client.sendCommand('SHOW_DOCUMENT', {
      documentPath: '/path/to/document.pdf',
      displayIndex: 0,
    });

    expect(result).toHaveProperty('windowId');
    expect(result).toHaveProperty('success', true);
    expect(result.displayIndex).toBe(0);
  });

  it('should reject invalid parameters', async () => {
    await expect(
      client.sendCommand('SHOW_DOCUMENT', {
        documentPath: '', // 빈 경로
        displayIndex: 0,
      })
    ).rejects.toThrow();
  });

  it('should handle timeout', async () => {
    // 의도적으로 느린 핸들러로 타임아웃 유발
    const shortTimeoutClient = new RpcClient({
      url: 'ws://localhost:9001',
      timeout: 100, // 매우 짧은 타임아웃
    });

    await shortTimeoutClient.connect();

    await expect(
      shortTimeoutClient.sendCommand('SHOW_DOCUMENT', {
        documentPath: '/path/to/document.pdf',
        displayIndex: 0,
      })
    ).rejects.toThrow('timeout');

    shortTimeoutClient.disconnect();
  });
});
```

---

## 8. 배포 및 환경 설정

### 8.1 파일: .env.example

```bash
# Frontend
NEXT_PUBLIC_RPC_URL=wss://api.example.com:3001
NEXT_PUBLIC_RPC_TIMEOUT=30000

# Backend (Electron)
RPC_PORT=3001
RPC_HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=production

# Security
ENABLE_HTTPS=true
CERT_PATH=/etc/ssl/certs/server.crt
KEY_PATH=/etc/ssl/private/server.key
```

### 8.2 package.json 스크립트

```json
{
  "scripts": {
    "dev": "concurrently \"next dev\" \"electron --watch\"",
    "build": "next build && npm run build:types",
    "build:types": "tsc --project tsconfig.types.json",
    "start": "next start",
    "electron:dev": "electron src/backend/electron/main.ts",
    "electron:build": "tsc src/backend/electron/main.ts",
    "test": "vitest",
    "test:integration": "vitest --grep integration",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

---

## 9. 문제 해결 가이드

### 9.1 일반적인 문제

| 문제 | 원인 | 해결책 |
|---|---|---|
| "Client is not connected" | RPC 서버 미시작 또는 연결 실패 | `createRpcClient` 호출 및 `connect()` 확인 |
| "Request timeout" | 서버가 응답 안함 | 타임아웃값 증가, 서버 로그 확인 |
| 문서가 표시 안됨 | 파일 경로 오류 | 절대 경로 사용, 파일 존재 확인 |
| 타입 에러 | 명령 파라미터 불일치 | 액션에 맞는 파라미터 확인 |

### 9.2 디버깅 팁

```typescript
// 클라이언트 디버깅
const client = getRpcClient();
console.log('Connected:', client.isConnected());

// 서버 로그 확인
RPC_LOG_LEVEL=debug npm run dev

// RPC 요청/응답 검사
// 브라우저 DevTools → 네트워크 탭 → ws:// 필터
```

---

## 10. 보안 체크리스트

- [ ] WSS (TLS) 사용 (프로덕션)
- [ ] 요청 검증 (Zod 스키마)
- [ ] 요청 인증 (JWT 또는 API 키)
- [ ] 요청 레이트 제한
- [ ] 로깅 (감사 추적)
- [ ] 에러 핸들링 (민감 정보 노출 안함)
- [ ] 권한 검증 (어떤 윈도우를 제어할 수 있는지)

---

## 결론

이 가이드를 따르면 **타입 안전하고 확장 가능한 원격 제어 시스템**을 구축할 수 있습니다:

1. **공유 타입**: 클라이언트와 서버 간 타입 일관성
2. **검증**: Zod를 통한 런타임 안전성
3. **간단한 프로토콜**: JSON-RPC 2.0
4. **실시간 통신**: WebSocket 기반
5. **모니터 제어**: Electron 통합

Vooster 프로젝트에 적용하면 **세컨드 모니터 제작의뢰서 표시(F-06)** 기능을 완성할 수 있습니다!
