# 원격 컴퓨터 제어 분산 시스템 아키텍처 설계
## TypeScript 기반 타입 안정성과 네트워크 통신 전략

**작성일**: 2025-10-23
**대상**: 세컨드 모니터 제작의뢰서 표시(F-06) 기능 구현
**핵심 목표**: 타입 안전성을 확보하면서 네트워크 통신의 복잡도를 최소화

---

## 1. 개요

원격 컴퓨터 제어 분산 시스템은 클라이언트(웹앱)에서 서버(Node.js/Electron)로 명령을 전송하여 로컬 컴퓨터의 윈도우나 디스플레이를 제어하는 구조입니다. 이 문서는 다음을 다룹니다:

1. **기존 솔루션 분석**: gRPC, tRPC, 커스텀 RPC의 장단점
2. **TypeScript 타입 시스템**: 네트워크 통신에서의 안전성 확보 방법
3. **단순화된 아키텍처**: 복잡도를 줄이면서 타입 안정성을 유지하는 방안
4. **실제 코드 예시**: Command 패턴 기반의 구현

---

## 2. 기존 솔루션 분석 및 비교

### 2.1 gRPC (Google Remote Procedure Call)

#### 장점
- 프로토콜 버퍼(Protocol Buffers)로 엄격한 스키마 정의
- HTTP/2 기반의 효율적인 통신
- 다양한 언어 지원 (Go, Java, Python, Node.js 등)
- 양방향 스트리밍 지원

#### 단점
- **학습 곡선이 높음**: Proto 파일 학습 필요
- **웹 브라우저 지원 부족**: gRPC-Web 별도 구성 필요
- **TypeScript 생성 코드 품질**: Proto → TypeScript 변환 시 복잡한 타입 구조
- **배포 복잡도**: Node.js에 gRPC 서버 구성, Proto 컴파일 필요
- **개발 속도**: Proto 파일 수정 후 코드 생성 과정이 번거로움

```typescript
// gRPC 타입 생성 예시 (복잡도 높음)
// google.protobuf.Timestamp -> Date 변환 필요
// 메시지 객체 생성 과정이 복잡함
const displayCommand = DisplayCommand.create({
  action: "SHOW_DOCUMENT",
  documentPath: "/path/to/document",
  timestamp: Timestamp.now(),
  metadata: {
    windowId: "123",
    displayIndex: 1
  }
});
```

### 2.2 tRPC (TypeScript RPC)

#### 장점
- **TypeScript 네이티브**: 타입 생성 자동화, 코드 제너레이션 불필요
- **엔드-투-엔드 타입 안정성**: 클라이언트-서버 간 타입 공유
- **빠른 개발**: 별도의 스키마 정의 파일 불필요
- **HTTP/REST 기반**: 브라우저 및 모든 환경에서 작동
- **간단한 API**: 함수 호출처럼 RPC 사용

#### 단점
- **Node.js 또는 TypeScript 환경 필요**: 다른 언어 클라이언트 어려움
- **프로토콜 버퍼 없음**: 스키마 명시성이 약함
- **웹소켓 기반 양방향 통신**: 설정 복잡도가 있을 수 있음
- **번들 크기**: 브라우저 번들에 tRPC 클라이언트 포함

```typescript
// tRPC 예시 (간단한 타입 안정성)
export const appRouter = router({
  displayCommand: publicProcedure
    .input(DisplayCommandSchema)
    .mutation(async ({ input }) => {
      // TypeScript가 자동으로 input 타입 추론
      return await remoteDisplay.show(input);
    })
});
```

### 2.3 커스텀 JSON-RPC 기반 솔루션

#### 장점
- **최소 복잡도**: 표준 JSON 스키마 + TypeScript 타입
- **모든 언어 지원**: JSON은 유니버설
- **웹소켓 네이티브**: 실시간 양방향 통신 용이
- **유연한 확장성**: 커스텀 로직 추가 가능
- **디버깅 용이**: JSON 형식으로 간단한 로깅/모니터링

#### 단점
- **타입 안정성**: 스키마와 TypeScript 타입을 별도로 유지해야 함
- **런타임 검증**: Zod/Joi 같은 라이브러리로 검증 필요
- **코드 제너레이션**: OpenAPI/JSON Schema → TypeScript 타입 생성 필요
- **프로토콜 정의**: 표준 형식이 없어 팀 규칙 필요

```typescript
// JSON-RPC 예시 (단순하지만 검증 필요)
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: unknown;
}

// TypeScript 타입 정의 필요
interface DisplayCommandParams {
  action: "SHOW_DOCUMENT" | "HIDE_DOCUMENT" | "FOCUS_WINDOW";
  documentPath: string;
  windowId?: string;
}
```

---

## 3. 프로젝트별 추천 솔루션

| 프로젝트 유형 | 추천 솔루션 | 이유 |
|---|---|---|
| **마이크로서비스 + 다중 언어** | gRPC | 언어 독립성, 프로토콜 버퍼의 스키마 관리 |
| **TypeScript Full-Stack** | tRPC | 엔드-투-엔드 타입 안정성, 빠른 개발 |
| **웹앱 + 로컬 서버 (Electron/Node.js)** | **JSON-RPC + Zod** | 단순성, 웹소켓 기반 실시간 통신, 타입 검증 |
| **PWA + 백엔드 마이크로서비스** | gRPC-Web | 웹 지원, 타입 안정성 |

**Vooster 프로젝트의 경우**: **JSON-RPC + Zod + TypeScript** 추천
- 세컨드 모니터는 로컬 Electron/Node.js 서버로만 제어
- 웹앱 ↔ 로컬 서버 간 간단한 명령 전달
- WebSocket으로 실시간 양방향 통신 필요
- TypeScript Full-Stack 환경

---

## 4. 복잡도 감소 전략

### 4.1 단순 규칙 기반 설계

#### 원칙 1: 모든 명령은 명시적 타입 정의
```typescript
// 명령 정의: 한 곳에서 관리
type CommandAction =
  | 'SHOW_DOCUMENT'
  | 'HIDE_DOCUMENT'
  | 'FOCUS_WINDOW'
  | 'MOVE_WINDOW'
  | 'CLOSE_WINDOW';

// 각 명령별 파라미터
type CommandParams<T extends CommandAction> = T extends 'SHOW_DOCUMENT'
  ? { documentPath: string; windowId?: string }
  : T extends 'FOCUS_WINDOW'
  ? { windowId: string }
  : T extends 'MOVE_WINDOW'
  ? { windowId: string; x: number; y: number }
  : T extends 'CLOSE_WINDOW'
  ? { windowId: string }
  : never;
```

#### 원칙 2: 직렬화/역직렬화 자동화
```typescript
// 요청과 응답을 일관된 형식으로
interface RpcRequest<T extends CommandAction> {
  id: string;
  method: T;
  params: CommandParams<T>;
  timestamp: number;
}

interface RpcResponse<T> {
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    details?: unknown;
  };
}
```

#### 원칙 3: 에러는 타입 안전하게 처리
```typescript
// 에러도 구분 - 타입 가드로 처리
type CommandError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'NOT_FOUND_ERROR'; resource: string }
  | { type: 'PERMISSION_ERROR'; required: string[] }
  | { type: 'TIMEOUT_ERROR'; timeout: number }
  | { type: 'UNKNOWN_ERROR'; message: string };

// 타입 가드
function isValidationError(error: CommandError): error is Extract<CommandError, { type: 'VALIDATION_ERROR' }> {
  return error.type === 'VALIDATION_ERROR';
}
```

### 4.2 코드 제너레이션을 통한 자동화

```typescript
// 스크립트: generate-commands.ts
// CommandAction 타입 정의 → JSON 스키마 → 검증 코드 자동 생성

import { z } from 'zod';

const CommandSchemas = {
  SHOW_DOCUMENT: z.object({
    documentPath: z.string().min(1),
    windowId: z.string().optional()
  }),
  HIDE_DOCUMENT: z.object({
    windowId: z.string()
  }),
  FOCUS_WINDOW: z.object({
    windowId: z.string()
  }),
  MOVE_WINDOW: z.object({
    windowId: z.string(),
    x: z.number(),
    y: z.number()
  })
} as const;

// 제너레이션된 타입
type CommandAction = keyof typeof CommandSchemas;

// 타입 안전한 명령 빌더
export function createCommand<T extends CommandAction>(
  action: T,
  params: z.infer<typeof CommandSchemas[T]>
) {
  const schema = CommandSchemas[action];
  const validated = schema.parse(params);
  return {
    method: action,
    params: validated
  };
}
```

### 4.3 프로토콜 정의의 최소화

```typescript
// 단 하나의 JSON 스키마 파일로 모든 검증
// shared/schemas/command.schema.json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "method": { "const": "SHOW_DOCUMENT" },
        "params": {
          "type": "object",
          "properties": {
            "documentPath": { "type": "string" },
            "windowId": { "type": "string" }
          },
          "required": ["documentPath"]
        }
      },
      "required": ["method", "params"]
    },
    {
      "type": "object",
      "properties": {
        "method": { "const": "HIDE_DOCUMENT" },
        "params": {
          "type": "object",
          "properties": {
            "windowId": { "type": "string" }
          },
          "required": ["windowId"]
        }
      },
      "required": ["method", "params"]
    }
  ]
}

// TypeScript 타입 생성
// npx json-schema-to-typescript command.schema.json > command.types.ts
```

---

## 5. 권장 아키텍처 설계

### 5.1 전체 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                      웹 앱 (브라우저)                          │
│              (Next.js + React + TypeScript)                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ UI Layer                                               │ │
│  │ - 바코드 스캔 → 주문 조회                               │ │
│  │ - "세컨드 모니터에 표시" 버튼 클릭                      │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Command Client Layer (WebSocket)                       │ │
│  │ - 명령 생성 (타입 안전)                                 │ │
│  │ - 직렬화 (JSON)                                         │ │
│  │ - 네트워크 전송                                         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────┬──────────────────────────────────────────┘
                  │
        WebSocket (TLS 권장)
        JSON-RPC 2.0 프로토콜
                  │
┌─────────────────▼──────────────────────────────────────────┐
│            로컬 서버 (Node.js / Electron)                    │
│              (TypeScript 기반)                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ RPC Server (WebSocket)                                │ │
│  │ - 요청 수신                                             │ │
│  │ - 검증 (Zod)                                           │ │
│  │ - 디스패치 (타입 안전)                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Command Handler Layer                                  │ │
│  │ - ShowDocumentHandler                                 │ │
│  │ - HideDocumentHandler                                 │ │
│  │ - FocusWindowHandler                                  │ │
│  │ - MoveWindowHandler                                   │ │
│  │ - CloseWindowHandler                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ System Integration Layer                              │ │
│  │ - Window Management API (Electron)                    │ │
│  │ - File System Access                                 │ │
│  │ - Process Management                                 │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 디렉토리 구조

```
src/
├── shared/
│   ├── types/
│   │   ├── command.ts           # 명령 타입 정의 (공유)
│   │   └── rpc.ts               # RPC 요청/응답 타입
│   ├── schema/
│   │   └── command.schema.ts    # Zod 스키마 (공유)
│   └── constants/
│       └── commands.ts          # 명령 상수
│
├── frontend/                     # 웹 앱
│   ├── features/
│   │   └── remote-display/
│   │       ├── components/
│   │       │   └── DisplayControlButton.tsx
│   │       ├── hooks/
│   │       │   └── useRemoteDisplay.ts
│   │       ├── lib/
│   │       │   └── rpc-client.ts   # RPC 클라이언트
│   │       └── types.ts
│   └── lib/
│       └── websocket/
│           └── connection.ts
│
├── backend/                      # 로컬 서버
│   ├── rpc/
│   │   ├── server.ts            # WebSocket RPC 서버
│   │   └── handlers/
│   │       ├── base.ts          # 핸들러 기본 클래스
│   │       ├── show-document.ts
│   │       ├── hide-document.ts
│   │       ├── focus-window.ts
│   │       └── move-window.ts
│   ├── system/
│   │   ├── window-manager.ts    # 윈도우 관리 (Electron/Windows API)
│   │   └── file-system.ts       # 파일 시스템 접근
│   └── utils/
│       └── logger.ts
│
└── shared.d.ts                   # 타입 선언 (공유)
```

---

## 6. 타입 안전한 구현 예시

### 6.1 명령 정의 (공유)

```typescript
// src/shared/types/command.ts

/**
 * 모든 가능한 명령 액션
 * 이 타입을 수정하면 클라이언트/서버 모두 타입 오류가 발생
 */
export type CommandAction =
  | 'SHOW_DOCUMENT'
  | 'HIDE_DOCUMENT'
  | 'FOCUS_WINDOW'
  | 'MOVE_WINDOW'
  | 'CLOSE_WINDOW'
  | 'RESIZE_WINDOW';

/**
 * 명령별 파라미터를 조건부 타입으로 정의
 * 각 명령은 고유한 파라미터 구조를 가짐
 */
export type CommandParams<T extends CommandAction = CommandAction> =
  T extends 'SHOW_DOCUMENT'
    ? {
        documentPath: string;
        windowId?: string;
        displayIndex?: number; // 모니터 인덱스
        fullscreen?: boolean;
      }
    : T extends 'HIDE_DOCUMENT'
    ? {
        windowId: string;
      }
    : T extends 'FOCUS_WINDOW'
    ? {
        windowId: string;
      }
    : T extends 'MOVE_WINDOW'
    ? {
        windowId: string;
        x: number;
        y: number;
      }
    : T extends 'CLOSE_WINDOW'
    ? {
        windowId: string;
      }
    : T extends 'RESIZE_WINDOW'
    ? {
        windowId: string;
        width: number;
        height: number;
      }
    : never;

/**
 * 명령 응답 타입
 */
export type CommandResult<T extends CommandAction = CommandAction> =
  T extends 'SHOW_DOCUMENT'
    ? { windowId: string; displayIndex: number; success: true }
    : T extends 'HIDE_DOCUMENT'
    ? { success: true }
    : T extends 'FOCUS_WINDOW'
    ? { success: true }
    : T extends 'MOVE_WINDOW'
    ? { success: true; x: number; y: number }
    : T extends 'CLOSE_WINDOW'
    ? { success: true }
    : T extends 'RESIZE_WINDOW'
    ? { success: true; width: number; height: number }
    : never;

/**
 * 타입 안전한 명령 객체
 */
export interface Command<T extends CommandAction = CommandAction> {
  action: T;
  params: CommandParams<T>;
  metadata?: {
    userId: string;
    timestamp: number;
    correlationId: string;
  };
}
```

### 6.2 RPC 프로토콜 정의

```typescript
// src/shared/types/rpc.ts

import type { Command, CommandAction, CommandResult } from './command';

/**
 * JSON-RPC 2.0 요청 형식
 */
export interface RpcRequest<T extends CommandAction = CommandAction> {
  jsonrpc: '2.0';
  id: string;
  method: T;
  params: import('./command').CommandParams<T>;
}

/**
 * 성공 응답
 */
export interface RpcSuccessResponse<T extends CommandAction = CommandAction> {
  jsonrpc: '2.0';
  id: string;
  result: CommandResult<T>;
}

/**
 * 에러 응답
 */
export interface RpcErrorResponse {
  jsonrpc: '2.0';
  id: string;
  error: {
    code: RpcErrorCode;
    message: string;
    data?: {
      details: string;
      timestamp: number;
    };
  };
}

/**
 * RPC 응답 통합
 */
export type RpcResponse<T extends CommandAction = CommandAction> =
  | RpcSuccessResponse<T>
  | RpcErrorResponse;

/**
 * RPC 에러 코드 (JSON-RPC 2.0 표준)
 */
export enum RpcErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR_START = -32099,
  SERVER_ERROR_END = -32000,
  CUSTOM_ERROR = -1, // 커스텀 에러
}

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

### 6.3 Zod 스키마 (검증)

```typescript
// src/shared/schema/command.schema.ts

import { z } from 'zod';
import type { CommandAction, CommandParams } from '../types/command';

/**
 * 각 명령별 파라미터 스키마
 */
export const CommandSchemas = {
  SHOW_DOCUMENT: z.object({
    documentPath: z.string().min(1, '문서 경로는 필수입니다'),
    windowId: z.string().optional(),
    displayIndex: z.number().int().min(0).optional(),
    fullscreen: z.boolean().optional().default(false),
  }),
  HIDE_DOCUMENT: z.object({
    windowId: z.string().min(1, '윈도우 ID는 필수입니다'),
  }),
  FOCUS_WINDOW: z.object({
    windowId: z.string().min(1, '윈도우 ID는 필수입니다'),
  }),
  MOVE_WINDOW: z.object({
    windowId: z.string().min(1, '윈도우 ID는 필수입니다'),
    x: z.number().int(),
    y: z.number().int(),
  }),
  CLOSE_WINDOW: z.object({
    windowId: z.string().min(1, '윈도우 ID는 필수입니다'),
  }),
  RESIZE_WINDOW: z.object({
    windowId: z.string().min(1, '윈도우 ID는 필수입니다'),
    width: z.number().int().positive('너비는 양수여야 합니다'),
    height: z.number().int().positive('높이는 양수여야 합니다'),
  }),
} as const;

/**
 * 명령 액션에 따른 파라미터 검증
 */
export function validateCommandParams<T extends CommandAction>(
  action: T,
  params: unknown
): z.SafeParseResult<CommandParams<T>> {
  const schema = CommandSchemas[action];
  return (schema as any).safeParse(params);
}

/**
 * RPC 요청 검증 스키마
 */
export const RpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string().or(z.number()),
  method: z.enum([
    'SHOW_DOCUMENT',
    'HIDE_DOCUMENT',
    'FOCUS_WINDOW',
    'MOVE_WINDOW',
    'CLOSE_WINDOW',
    'RESIZE_WINDOW',
  ]),
  params: z.record(z.any()),
});

type ValidationResult<T> = { success: true; data: T } | { success: false; error: z.ZodError };

export function parseRpcRequest(data: unknown): ValidationResult<any> {
  const result = RpcRequestSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const { method, params } = result.data;
  const paramValidation = validateCommandParams(method, params);

  if (!paramValidation.success) {
    return { success: false, error: paramValidation.error };
  }

  return { success: true, data: result.data };
}
```

### 6.4 에러 타입 정의

```typescript
// src/shared/types/error.ts

/**
 * 에러 계층 구조
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
  timeout: number; // ms
  command: string;
  timestamp: number;
}

/**
 * 시스템 에러 (OS/Electron)
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
 * 타입 가드 함수들
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

/**
 * 에러를 RPC 응답으로 변환
 */
export function errorToRpcError(error: CommandError): { code: number; message: string; data: unknown } {
  const codeMap: Record<CommandError['type'], number> = {
    VALIDATION_ERROR: -32602, // Invalid Params
    NOT_FOUND_ERROR: -32601,  // Method not found (리소스 부재)
    PERMISSION_ERROR: -32603, // Internal error
    TIMEOUT_ERROR: -32603,    // Internal error
    SYSTEM_ERROR: -32000,     // Server error
    UNKNOWN_ERROR: -32603,    // Internal error
  };

  return {
    code: codeMap[error.type],
    message: error.message,
    data: error,
  };
}
```

### 6.5 클라이언트 구현 (RPC 클라이언트)

```typescript
// src/frontend/lib/websocket/rpc-client.ts

import type {
  CommandAction,
  CommandParams,
  CommandResult,
  RpcRequest,
  RpcResponse,
  RpcErrorResponse,
  RpcSuccessResponse,
} from '@/shared/types';
import { isSuccessResponse, isErrorResponse } from '@/shared/types/rpc';

/**
 * RPC 클라이언트 옵션
 */
export interface RpcClientOptions {
  url: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * RPC 요청을 기다리는 대기자
 */
interface PendingRequest<T extends CommandAction> {
  resolve: (result: CommandResult<T>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * 타입 안전한 RPC 클라이언트
 */
export class RpcClient {
  private ws: WebSocket | null = null;
  private url: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
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
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.connected = true;
          this.callbacks.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket error');
          this.callbacks.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.callbacks.onDisconnect?.();
        };
      } catch (error) {
        reject(error);
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
      throw new Error('RPC client is not connected');
    }

    const id = String(++this.requestId);
    const request: RpcRequest<T> = {
      jsonrpc: '2.0',
      id,
      method: action,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC request timeout after ${this.timeout}ms`));
      }, this.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
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
      const id = response.id;
      const pending = this.pendingRequests.get(String(id));

      if (!pending) {
        console.warn(`Received response for unknown request ID: ${id}`);
        return;
      }

      this.pendingRequests.delete(String(id));
      clearTimeout(pending.timeout);

      if (isSuccessResponse(response)) {
        pending.resolve(response.result);
      } else if (isErrorResponse(response)) {
        const error = new Error(response.error.message);
        (error as any).code = response.error.code;
        (error as any).data = response.error.data;
        pending.reject(error);
      }
    } catch (error) {
      console.error('Failed to parse RPC response:', error);
    }
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

/**
 * 싱글톤 인스턴스 생성
 */
let clientInstance: RpcClient | null = null;

export function createRpcClient(options: RpcClientOptions): RpcClient {
  clientInstance = new RpcClient(options);
  return clientInstance;
}

export function getRpcClient(): RpcClient {
  if (!clientInstance) {
    throw new Error('RPC client not initialized. Call createRpcClient first.');
  }
  return clientInstance;
}
```

### 6.6 서버 구현 (RPC 핸들러)

```typescript
// src/backend/rpc/handlers/base.ts

import type { CommandAction, CommandParams, CommandResult } from '@/shared/types';
import type { CommandError } from '@/shared/types/error';

/**
 * 핸들러 기본 클래스 (제너릭)
 */
export abstract class CommandHandler<T extends CommandAction> {
  abstract action: T;

  /**
   * 명령 실행
   */
  abstract execute(params: CommandParams<T>): Promise<CommandResult<T>>;

  /**
   * 검증 (선택 사항)
   */
  async validate(params: CommandParams<T>): Promise<void> {
    // 기본 구현: 검증 없음
  }
}
```

```typescript
// src/backend/rpc/handlers/show-document.ts

import { CommandHandler } from './base';
import { windowManager } from '../system/window-manager';
import { fileSystem } from '../system/file-system';
import type { CommandParams, CommandResult } from '@/shared/types';

export class ShowDocumentHandler extends CommandHandler<'SHOW_DOCUMENT'> {
  action = 'SHOW_DOCUMENT' as const;

  async validate(params: CommandParams<'SHOW_DOCUMENT'>): Promise<void> {
    const exists = await fileSystem.exists(params.documentPath);
    if (!exists) {
      throw {
        type: 'NOT_FOUND_ERROR',
        resource: 'DOCUMENT',
        resourceId: params.documentPath,
        timestamp: Date.now(),
      };
    }
  }

  async execute(
    params: CommandParams<'SHOW_DOCUMENT'>
  ): Promise<CommandResult<'SHOW_DOCUMENT'>> {
    // 파일 존재 확인
    await this.validate(params);

    // 윈도우 생성 및 문서 표시
    const windowId = await windowManager.createWindow({
      filePath: params.documentPath,
      displayIndex: params.displayIndex ?? 0,
      fullscreen: params.fullscreen ?? false,
    });

    return {
      windowId,
      displayIndex: params.displayIndex ?? 0,
      success: true,
    };
  }
}
```

```typescript
// src/backend/rpc/server.ts

import { WebSocketServer } from 'ws';
import { RpcErrorCode, isSuccessResponse } from '@/shared/types/rpc';
import { parseRpcRequest } from '@/shared/schema/command.schema';
import { errorToRpcError } from '@/shared/types/error';
import type { CommandHandler } from './handlers/base';
import { ShowDocumentHandler } from './handlers/show-document';
import { HideDocumentHandler } from './handlers/hide-document';
import { FocusWindowHandler } from './handlers/focus-window';
import { MoveWindowHandler } from './handlers/move-window';
import { CloseWindowHandler } from './handlers/close-window';

/**
 * RPC 서버 (WebSocket 기반)
 */
export class RpcServer {
  private wss: WebSocketServer;
  private handlers: Map<string, CommandHandler<any>> = new Map();

  constructor(port: number) {
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
      new FocusWindowHandler(),
      new MoveWindowHandler(),
      new CloseWindowHandler(),
    ];

    handlers.forEach((handler) => {
      this.handlers.set(handler.action, handler);
    });
  }

  /**
   * 서버 설정
   */
  private setupServer(): void {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');

      ws.on('message', async (data: Buffer) => {
        await this.handleRequest(ws, data.toString());
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  /**
   * RPC 요청 처리
   */
  private async handleRequest(ws: WebSocket, data: string): Promise<void> {
    try {
      // 요청 파싱 및 검증
      const parseResult = parseRpcRequest(JSON.parse(data));
      if (!parseResult.success) {
        return this.sendError(ws, '-1', RpcErrorCode.INVALID_PARAMS, 'Invalid request', parseResult.error);
      }

      const request = parseResult.data;
      const handler = this.handlers.get(request.method);

      if (!handler) {
        return this.sendError(ws, request.id, RpcErrorCode.METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
      }

      // 핸들러 실행
      try {
        const result = await handler.execute(request.params);
        this.sendSuccess(ws, request.id, result);
      } catch (error: any) {
        // 핸들러가 던진 에러 처리
        const rpcError = errorToRpcError(error);
        this.sendError(ws, request.id, rpcError.code, rpcError.message, rpcError.data);
      }
    } catch (error: any) {
      console.error('Failed to handle RPC request:', error);
      this.sendError(ws, '-1', RpcErrorCode.INTERNAL_ERROR, 'Internal server error', error);
    }
  }

  /**
   * 성공 응답 전송
   */
  private sendSuccess(ws: WebSocket, id: string | number, result: unknown): void {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }));
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
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    }));
  }

  /**
   * 서버 시작
   */
  start(): void {
    console.log('RPC Server listening on ws://localhost:3001');
  }

  /**
   * 서버 종료
   */
  stop(): void {
    this.wss.close();
  }
}

// 사용 예시
if (require.main === module) {
  const server = new RpcServer(3001);
  server.start();
}
```

---

## 7. 클라이언트 사용 예시

```typescript
// src/frontend/features/remote-display/hooks/useRemoteDisplay.ts

'use client';

import { useState, useCallback, useEffect } from 'react';
import { getRpcClient, createRpcClient } from '@/lib/websocket/rpc-client';
import type { CommandError } from '@/shared/types/error';

interface UseRemoteDisplayReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  showDocument: (path: string, displayIndex?: number) => Promise<void>;
  hideDocument: (windowId: string) => Promise<void>;
  focusWindow: (windowId: string) => Promise<void>;
}

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
          onConnect: () => setIsConnected(true),
          onDisconnect: () => setIsConnected(false),
          onError: (err) => setError(err),
        });

        await client.connect();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Connection failed'));
      }
    };

    initClient();

    return () => {
      const client = getRpcClient();
      client.disconnect();
    };
  }, []);

  const showDocument = useCallback(
    async (path: string, displayIndex = 0) => {
      if (!isConnected) {
        throw new Error('RPC client is not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        const client = getRpcClient();
        const result = await client.sendCommand('SHOW_DOCUMENT', {
          documentPath: path,
          displayIndex,
        });

        console.log('Document shown:', result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to show document');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected]
  );

  const hideDocument = useCallback(
    async (windowId: string) => {
      const client = getRpcClient();
      setIsLoading(true);
      setError(null);

      try {
        await client.sendCommand('HIDE_DOCUMENT', { windowId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to hide document');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const focusWindow = useCallback(
    async (windowId: string) => {
      const client = getRpcClient();
      setIsLoading(true);
      setError(null);

      try {
        await client.sendCommand('FOCUS_WINDOW', { windowId });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to focus window');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isConnected,
    isLoading,
    error,
    showDocument,
    hideDocument,
    focusWindow,
  };
}
```

```typescript
// src/frontend/features/remote-display/components/DisplayControlButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRemoteDisplay } from '../hooks/useRemoteDisplay';
import { useToast } from '@/hooks/use-toast';

interface DisplayControlButtonProps {
  documentPath: string;
  displayIndex?: number;
}

export function DisplayControlButton({ documentPath, displayIndex = 0 }: DisplayControlButtonProps) {
  const { showDocument, isLoading, error } = useRemoteDisplay();
  const { toast } = useToast();
  const [windowId, setWindowId] = useState<string | null>(null);

  const handleShow = async () => {
    try {
      const result = await showDocument(documentPath, displayIndex);
      setWindowId(result.windowId);
      toast({
        title: 'Success',
        description: `Document shown on display ${result.displayIndex}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to show document';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={handleShow}
      disabled={isLoading}
      variant="primary"
    >
      {isLoading ? '전송 중...' : '세컨드 모니터에 표시'}
    </Button>
  );
}
```

---

## 8. 타입 검증 전략 - 엔드-투-엔드

### 8.1 빌드 타임 검증

```typescript
// TypeScript 컴파일러가 자동으로 타입 오류 감지

// ❌ 컴파일 에러: 잘못된 액션
const result = await client.sendCommand('INVALID_ACTION', {});

// ❌ 컴파일 에러: SHOW_DOCUMENT는 documentPath 필요
const result = await client.sendCommand('SHOW_DOCUMENT', {
  windowId: 'win-123' // documentPath 누락
});

// ❌ 컴파일 에러: SHOW_DOCUMENT는 displayIndex가 선택사항
const result = await client.sendCommand('SHOW_DOCUMENT', {
  documentPath: '/path/to/doc',
  displayIndex: 'invalid' // 타입 오류: number 필요
});

// ✅ 컴파일 성공
const result = await client.sendCommand('SHOW_DOCUMENT', {
  documentPath: '/path/to/doc',
  displayIndex: 0
});
```

### 8.2 런타임 검증 (Zod)

```typescript
// 서버에서 요청 검증
const parseResult = parseRpcRequest(JSON.parse(data));

if (!parseResult.success) {
  // Zod 에러 상세 정보 반환
  const errors = parseResult.error.flatten();
  return sendError(ws, id, RpcErrorCode.INVALID_PARAMS, 'Validation failed', {
    fieldErrors: errors.fieldErrors,
    formErrors: errors.formErrors,
  });
}

// ✅ 타입 안전한 request 객체 사용
const { method, params } = parseResult.data;
const handler = this.handlers.get(method);
```

### 8.3 타입-레벨 테스트

```typescript
// src/backend/rpc/handlers/__tests__/types.test.ts

import type { CommandParams, CommandResult } from '@/shared/types';

/**
 * 컴파일 타임에만 실행되는 타입 테스트
 */

// ✅ SHOW_DOCUMENT 파라미터 타입 체크
const showDocParams: CommandParams<'SHOW_DOCUMENT'> = {
  documentPath: '/path/to/doc',
  displayIndex: 0,
};

// ✅ 응답 타입 체크
const showDocResult: CommandResult<'SHOW_DOCUMENT'> = {
  windowId: 'win-123',
  displayIndex: 0,
  success: true,
};

// ❌ 컴파일 에러: HIDE_DOCUMENT는 displayIndex 미지원
// const hideDocParams: CommandParams<'HIDE_DOCUMENT'> = {
//   windowId: 'win-123',
//   displayIndex: 0 // Error: Property 'displayIndex' does not exist
// };
```

---

## 9. 실제 통신 흐름 시각화

### 9.1 성공 케이스

```
[클라이언트]                          [서버]
     │
     │ WebSocket 연결
     ├────────────────────────────────→│
     │                             연결됨
     │
     │ RPC Request (SHOW_DOCUMENT)
     │ {
     │   "jsonrpc": "2.0",
     │   "id": "1",
     │   "method": "SHOW_DOCUMENT",
     │   "params": {
     │     "documentPath": "/orders/1234.pdf",
     │     "displayIndex": 1
     │   }
     │ }
     ├────────────────────────────────→│ 요청 파싱
     │                                 │ 검증 (Zod)
     │                                 │ ShowDocumentHandler 실행
     │                                 │ 파일 확인
     │                                 │ 윈도우 생성 (Electron)
     │ RPC Success Response            │
     │ {                               │
     │   "jsonrpc": "2.0",             │
     │   "id": "1",                    │
     │   "result": {                   │
     │     "windowId": "win-456",      │
     │     "displayIndex": 1,          │
     │     "success": true             │
     │   }                             │
     │ }←────────────────────────────── │
     │ 응답 처리                         │
     │ 타입 안전하게 결과 사용
     │
```

### 9.2 에러 케이스

```
[클라이언트]                          [서버]
     │
     │ RPC Request (SHOW_DOCUMENT)
     │ {
     │   "method": "SHOW_DOCUMENT",
     │   "params": {
     │     "documentPath": "/invalid/path.pdf"
     │   }
     │ }
     ├────────────────────────────────→│ 파일 미존재
     │                                 │ NOT_FOUND_ERROR 던짐
     │ RPC Error Response              │
     │ {                               │
     │   "jsonrpc": "2.0",             │
     │   "id": "1",                    │
     │   "error": {                    │
     │     "code": -32601,             │
     │     "message": "File not found",│
     │     "data": {                   │
     │       "type": "NOT_FOUND_ERROR",│
     │       "resource": "DOCUMENT",   │
     │       "resourceId": "/invalid/path.pdf"
     │     }                           │
     │   }                             │
     │ }←────────────────────────────── │
     │ 에러 처리                         │
     │ 사용자에게 알림
     │
```

---

## 10. 성능 및 확장성 고려사항

### 10.1 메시지 압축

```typescript
// 대용량 데이터 전송 시 압축
import pako from 'pako';

export class CompressedRpcClient extends RpcClient {
  protected async sendCommand<T extends CommandAction>(
    action: T,
    params: CommandParams<T>
  ): Promise<CommandResult<T>> {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: action,
      params,
    };

    const json = JSON.stringify(request);
    const compressed = pako.deflate(json);

    // 압축된 데이터 전송
    this.ws.send(compressed);
  }
}
```

### 10.2 배치 요청

```typescript
// 여러 명령을 한 번에 전송
interface BatchRequest {
  requests: RpcRequest[];
}

async function sendBatchCommands(
  commands: Array<[CommandAction, CommandParams<any>]>
): Promise<RpcResponse[]> {
  const requests = commands.map((cmd, idx) => ({
    jsonrpc: '2.0',
    id: idx.toString(),
    method: cmd[0],
    params: cmd[1],
  }));

  const response = await fetch('ws://localhost:3001/batch', {
    method: 'POST',
    body: JSON.stringify(requests),
  });

  return response.json();
}
```

### 10.3 연결 풀링

```typescript
// 다중 디스플레이 제어 시 여러 연결 사용
export class RpcClientPool {
  private clients: RpcClient[] = [];
  private nextIndex = 0;

  constructor(count: number, options: RpcClientOptions) {
    for (let i = 0; i < count; i++) {
      this.clients.push(new RpcClient(options));
    }
  }

  async getClient(): Promise<RpcClient> {
    const client = this.clients[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.clients.length;

    if (!client.isConnected()) {
      await client.connect();
    }

    return client;
  }
}
```

---

## 11. 보안 고려사항

### 11.1 인증 및 인가

```typescript
// 서버: 요청 인증
interface AuthenticatedRpcRequest extends RpcRequest {
  token: string;
}

export async function authenticateRequest(token: string): Promise<boolean> {
  // JWT 또는 API 키 검증
  return verifyToken(token);
}

// 클라이언트: 토큰과 함께 전송
export class AuthenticatedRpcClient extends RpcClient {
  constructor(options: RpcClientOptions & { token: string }) {
    super(options);
    this.token = options.token;
  }

  async sendCommand<T extends CommandAction>(
    action: T,
    params: CommandParams<T>
  ): Promise<CommandResult<T>> {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: action,
      params,
      token: this.token,
    };

    this.ws.send(JSON.stringify(request));
  }
}
```

### 11.2 TLS/WSS (보안 WebSocket)

```typescript
// 클라이언트
const client = createRpcClient({
  url: 'wss://secure-server.com:3001', // WSS 사용
  token: process.env.RPC_TOKEN,
});

// 서버
import https from 'https';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const server = https.createServer({
  cert: fs.readFileSync('/path/to/cert.pem'),
  key: fs.readFileSync('/path/to/key.pem'),
});

const wss = new WebSocketServer({ server });

server.listen(3001, () => {
  console.log('Secure WebSocket server listening on wss://localhost:3001');
});
```

### 11.3 입력 검증

```typescript
// Zod를 이용한 철저한 검증
const ShowDocumentParamsSchema = z.object({
  documentPath: z
    .string()
    .min(1)
    .max(500) // 경로 길이 제한
    .regex(/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/, 'Invalid path characters'), // 경로 패턴
  displayIndex: z.number().int().min(0).max(10),
  fullscreen: z.boolean().optional(),
});

// 모든 입력 검증
const validation = ShowDocumentParamsSchema.safeParse(params);
if (!validation.success) {
  return failure(400, 'INVALID_PARAMS', 'Invalid parameters', validation.error.flatten());
}
```

---

## 12. 모니터링 및 로깅

### 12.1 구조화된 로깅

```typescript
// src/backend/utils/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// 핸들러에서 사용
export class ShowDocumentHandler extends CommandHandler<'SHOW_DOCUMENT'> {
  async execute(params: CommandParams<'SHOW_DOCUMENT'>): Promise<CommandResult<'SHOW_DOCUMENT'>> {
    logger.info(
      {
        action: 'SHOW_DOCUMENT',
        documentPath: params.documentPath,
        displayIndex: params.displayIndex,
      },
      'Executing show document command'
    );

    try {
      const result = await windowManager.createWindow({...});

      logger.info(
        { windowId: result.windowId },
        'Document shown successfully'
      );

      return result;
    } catch (error) {
      logger.error(
        { error, documentPath: params.documentPath },
        'Failed to show document'
      );
      throw error;
    }
  }
}
```

### 12.2 메트릭 수집

```typescript
// src/backend/utils/metrics.ts

interface CommandMetrics {
  command: CommandAction;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
}

export class MetricsCollector {
  private metrics: CommandMetrics[] = [];

  record(metric: CommandMetrics): void {
    this.metrics.push(metric);

    // 주기적으로 집계 (e.g., 60초마다)
    if (this.metrics.length >= 1000) {
      this.aggregate();
    }
  }

  private aggregate(): void {
    const grouped = this.metrics.reduce((acc, m) => {
      const key = m.command;
      if (!acc[key]) {
        acc[key] = { total: 0, success: 0, failures: 0, avgDuration: 0, durations: [] };
      }
      acc[key].total++;
      if (m.success) acc[key].success++;
      else acc[key].failures++;
      acc[key].durations.push(m.duration);
      return acc;
    }, {} as Record<CommandAction, any>);

    // 메트릭 서버로 전송 (Prometheus 등)
    Object.entries(grouped).forEach(([command, stats]) => {
      console.log(`${command}: ${stats.success}/${stats.total} success, avg ${(stats.durations.reduce((a, b) => a + b) / stats.durations.length).toFixed(2)}ms`);
    });

    this.metrics = [];
  }
}

export const metricsCollector = new MetricsCollector();
```

---

## 13. 테스트 전략

### 13.1 단위 테스트

```typescript
// src/backend/rpc/handlers/__tests__/show-document.handler.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShowDocumentHandler } from '../show-document';
import { windowManager } from '../../system/window-manager';
import { fileSystem } from '../../system/file-system';

vi.mock('../../system/window-manager');
vi.mock('../../system/file-system');

describe('ShowDocumentHandler', () => {
  let handler: ShowDocumentHandler;

  beforeEach(() => {
    handler = new ShowDocumentHandler();
  });

  it('should show document successfully', async () => {
    // Arrange
    vi.mocked(fileSystem.exists).mockResolvedValue(true);
    vi.mocked(windowManager.createWindow).mockResolvedValue({
      windowId: 'win-123',
      displayIndex: 0,
      success: true,
    });

    // Act
    const result = await handler.execute({
      documentPath: '/path/to/doc.pdf',
      displayIndex: 0,
    });

    // Assert
    expect(result).toEqual({
      windowId: 'win-123',
      displayIndex: 0,
      success: true,
    });
    expect(fileSystem.exists).toHaveBeenCalledWith('/path/to/doc.pdf');
    expect(windowManager.createWindow).toHaveBeenCalled();
  });

  it('should throw NOT_FOUND_ERROR when document does not exist', async () => {
    // Arrange
    vi.mocked(fileSystem.exists).mockResolvedValue(false);

    // Act & Assert
    await expect(
      handler.execute({
        documentPath: '/invalid/path.pdf',
        displayIndex: 0,
      })
    ).rejects.toEqual(
      expect.objectContaining({
        type: 'NOT_FOUND_ERROR',
        resource: 'DOCUMENT',
      })
    );
  });
});
```

### 13.2 통합 테스트

```typescript
// src/frontend/__tests__/remote-display.integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRpcClient, getRpcClient } from '@/lib/websocket/rpc-client';
import { RpcServer } from '@/backend/rpc/server';

describe('Remote Display Integration', () => {
  let server: RpcServer;
  let clientConnected = false;

  beforeEach(async () => {
    server = new RpcServer(3001);
    server.start();

    const client = createRpcClient({
      url: 'ws://localhost:3001',
      onConnect: () => { clientConnected = true; },
    });
    await client.connect();
  });

  afterEach(async () => {
    const client = getRpcClient();
    client.disconnect();
    server.stop();
  });

  it('should send SHOW_DOCUMENT command and receive result', async () => {
    // Arrange
    const client = getRpcClient();
    expect(clientConnected).toBe(true);

    // Act
    const result = await client.sendCommand('SHOW_DOCUMENT', {
      documentPath: '/test/document.pdf',
      displayIndex: 0,
    });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({
        windowId: expect.any(String),
        displayIndex: 0,
        success: true,
      })
    );
  });

  it('should handle validation errors', async () => {
    // Arrange
    const client = getRpcClient();

    // Act & Assert
    await expect(
      client.sendCommand('SHOW_DOCUMENT', {
        documentPath: '', // 빈 경로
        displayIndex: 0,
      })
    ).rejects.toThrow('Validation failed');
  });
});
```

---

## 14. 배포 및 운영

### 14.1 환경 설정

```typescript
// .env.example
# 클라이언트
NEXT_PUBLIC_RPC_URL=wss://api.example.com:3001
NEXT_PUBLIC_RPC_TIMEOUT=30000

# 서버 (Electron/Node.js)
RPC_PORT=3001
RPC_HOST=0.0.0.0
LOG_LEVEL=info
SECURE=true
CERT_PATH=/etc/ssl/certs/cert.pem
KEY_PATH=/etc/ssl/private/key.pem
RPC_TOKEN_SECRET=your-secret-key
```

### 14.2 도커 구성

```dockerfile
# Dockerfile for RPC Server
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/backend/rpc/server.js"]
```

### 14.3 헬스 체크

```typescript
// src/backend/rpc/server.ts (추가)

export class RpcServer {
  // ... 기존 코드 ...

  private setupServer(): void {
    // WebSocket 설정
    this.wss.on('connection', (ws) => { /* ... */ });

    // HTTP 헬스 체크 엔드포인트
    const httpServer = this.wss.server;
    httpServer.on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          connections: this.wss.clients.size,
        }));
      }
    });
  }
}
```

---

## 15. 마이그레이션 가이드 (gRPC → JSON-RPC)

### 15.1 단계별 전환

| 단계 | 내용 | 기간 |
|---|---|---|
| 1 | 타입 정의 및 스키마 작성 | 1주 |
| 2 | JSON-RPC 클라이언트 구현 | 1주 |
| 3 | RPC 서버 구현 및 핸들러 | 2주 |
| 4 | 기존 gRPC에서 마이그레이션 | 1주 |
| 5 | 통합 테스트 및 배포 | 1주 |

### 15.2 점진적 마이그레이션 패턴

```typescript
// 과도기: 두 프로토콜 지원
export interface DualProtocolServer {
  // gRPC 서버 (기존)
  grpcServer: grpc.Server;

  // JSON-RPC 서버 (신규)
  rpcServer: RpcServer;
}

// 라우터가 요청 타입 감지
export function createDualServer(): DualProtocolServer {
  const grpcServer = new grpc.Server();
  const rpcServer = new RpcServer(3001);

  // 두 프로토콜 모두 지원
  // 점차 JSON-RPC로 클라이언트 마이그레이션
  // 모두 전환 후 gRPC 서버 폐지

  return { grpcServer, rpcServer };
}
```

---

## 결론

### 핵심 권장사항

1. **TypeScript 타입 시스템 활용**: Conditional Types와 Generic Constraints를 통한 완벽한 타입 안전성
2. **JSON-RPC 2.0 + Zod**: 단순하면서도 강력한 검증
3. **WebSocket 기반 실시간 통신**: 세컨드 모니터 같은 실시간 상황에 최적
4. **명령 기반 아키텍처 (Command Pattern)**: 확장성과 유지보수성 확보
5. **구조화된 로깅과 모니터링**: 운영 단계에서 문제 해결 용이

### Vooster 프로젝트 적용 계획

1. `shared/types/command.ts` 작성 (명령 정의)
2. `shared/schema/command.schema.ts` 작성 (Zod 검증)
3. `frontend/lib/websocket/rpc-client.ts` 구현
4. `backend/rpc/server.ts` 구현 (Electron 메인 프로세스)
5. `features/remote-display/hooks/useRemoteDisplay.ts` 작성 (React Hook)
6. 통합 테스트 및 배포

이 아키텍처를 따르면 **타입 안전하면서도 운영이 간편한 분산 제어 시스템**을 구축할 수 있습니다.
