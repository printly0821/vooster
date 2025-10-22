# 원격 컴퓨터 제어 시스템 - Next.js 기반 풀스택 구현 전략

**문서 버전**: 1.0.0
**작성일**: 2025-10-23
**상태**: 설계 단계

---

## 목차
1. [개요](#개요)
2. [기술 스택 설계](#기술-스택-설계)
3. [아키텍처 개요](#아키텍처-개요)
4. [파일 구조 및 모듈 설계](#파일-구조-및-모듈-설계)
5. [실시간 통신 구현](#실시간-통신-구현)
6. [API 엔드포인트 설계](#api-엔드포인트-설계)
7. [클라이언트 Agent 구현](#클라이언트-agent-구현)
8. [배포 및 운영](#배포-및-운영)
9. [확장성 고려](#확장성-고려)
10. [개발 로드맵](#개발-로드맵)

---

## 개요

### 프로젝트 목표
원격 컴퓨터 제어 시스템은 스마트폰 웹 애플리케이션에서 Windows/macOS/Linux 컴퓨터를 실시간으로 제어하는 풀스택 솔루션입니다.

### 핵심 요구사항
- **웹앱**: Next.js 기반 반응형 UI (스마트폰, 태블릿)
- **클라이언트 Agent**: 각 컴퓨터에서 실행되는 Node.js 서비스
- **실시간 통신**: WebSocket을 통한 양방향 통신
- **명령 시스템**: 마우스, 키보드, 시스템 제어 등 다양한 명령 지원
- **보안**: 토큰 기반 인증, HTTPS 암호화, 방화벽 고려

### 사용 시나리오
1. **현장 인쇄**: 프린터 제어, 색감 조정, 출력 모니터링
2. **창고 관리**: PC 원격 제어, 데이터 조회, 시스템 모니터링
3. **매장 디스플레이**: 디지털 사이니지 제어, 콘텐츠 업데이트
4. **일반 원격 제어**: 화면 공유, 파일 전송, 시스템 제어

---

## 기술 스택 설계

### 1. 웹앱 (Web Frontend)

#### 프레임워크 및 기본 도구
| 항목 | 선택 | 이유 |
|------|------|------|
| **Framework** | Next.js 15 (App Router) | 풀스택 통합, SSR, 실시간 기능 지원 |
| **Language** | TypeScript 5 | 타입 안전성, 개발 생산성 |
| **Styling** | TailwindCSS 4 | 빠른 UI 개발, 반응형 디자인 |
| **UI Library** | shadcn/ui | 커스터마이징 가능한 컴포넌트 |
| **State Management** | Zustand | 클라이언트 상태 관리 |
| **Data Fetching** | @tanstack/react-query | 서버 상태 관리 |
| **Real-time** | socket.io-client | WebSocket 클라이언트 |

#### 추가 라이브러리
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.0.0",
    "socket.io-client": "^4.7.0",
    "@hookform/resolvers": "^3.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.0.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.263.0",
    "date-fns": "^2.30.0",
    "js-cookie": "^3.0.0"
  }
}
```

### 2. 백엔드 API 서버 (Next.js API Routes)

#### API 프레임워크 선택
| 선택 | 장점 | 단점 |
|------|------|------|
| **Hono.js** ✓ | 경량, TypeScript 네이티브, Next.js 통합 용이 | WebSocket 지원 제한 |
| **별도 Node.js** (ws + Express) | 완전한 WebSocket 제어, 높은 성능 | 배포 복잡도 증가 |
| **Next.js 내장** | 통합 편의성 | WebSocket 제한 |

**권장 전략**: Hono.js로 REST API 구성 + socket.io로 WebSocket 별도 구성

#### API 서버 구조
```
- REST API: Hono.js (HTTP 요청 처리)
  ├── 인증 (로그인, 토큰 갱신)
  ├── 컴퓨터 관리 (등록, 목록, 상태)
  ├── 명령 큐 관리 (명령 전송, 이력 조회)
  └── 시스템 정보 조회

- WebSocket Server: socket.io (실시간 통신)
  ├── 클라이언트 Agent 연결
  ├── 웹앱 클라이언트 연결
  └── 메시지 라우팅
```

### 3. 클라이언트 Agent (Node.js Service)

#### 기술 스택
```json
{
  "dependencies": {
    "socket.io-client": "^4.7.0",
    "robotjs": "^0.6.0",
    "systeminformation": "^5.20.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0",
    "winston": "^3.10.0"
  }
}
```

#### 주요 역할
- WebSocket 연결 및 재연결 관리
- 명령 수신 및 실행 (마우스, 키보드, 시스템)
- 컴퓨터 상태 모니터링 및 보고
- 로그 기록 및 오류 처리

### 4. 데이터베이스

| 선택 | 용도 |
|------|------|
| **Supabase (PostgreSQL)** | 사용자, 컴퓨터, 명령 이력 저장 |
| **Redis** (선택) | 실시간 세션 상태, 캐싱 |

---

## 아키텍처 개요

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                     인터넷 / VPN                        │
└────────┬──────────────────────────────────┬─────────────┘
         │                                  │
    ┌────▼───────────┐            ┌────────▼────────┐
    │  웹앱           │            │  클라이언트      │
    │  (스마트폰)     │            │  Agent (PC)     │
    │  Next.js        │            │  Node.js        │
    │  React Query    │            │  socket.io      │
    │  socket.io      │            │  robotjs        │
    └────┬───────────┘            └────────┬────────┘
         │                                  │
         │         WebSocket (socket.io)    │
         │ ◄────────────────────────────────►
         │                                  │
         │    HTTP REST API (Hono.js)       │
         │ ◄────────────────────────────────►
         │                                  │
    ┌────▼──────────────────────────────────▼─────────┐
    │                                                  │
    │        Next.js API Server                       │
    │  ┌──────────────────────────────────────────┐  │
    │  │  API Routes (Hono.js)                    │  │
    │  │  ├── Authentication Routes               │  │
    │  │  ├── Computer Management                 │  │
    │  │  ├── Command Management                  │  │
    │  │  └── System Info Routes                  │  │
    │  └──────────────────────────────────────────┘  │
    │  ┌──────────────────────────────────────────┐  │
    │  │  WebSocket Server (socket.io)            │  │
    │  │  ├── Client Connection Handler           │  │
    │  │  ├── Agent Connection Handler            │  │
    │  │  └── Message Router                      │  │
    │  └──────────────────────────────────────────┘  │
    │  ┌──────────────────────────────────────────┐  │
    │  │  Database Layer (Supabase)               │  │
    │  │  ├── Users                               │  │
    │  │  ├── Computers                           │  │
    │  │  ├── Commands                            │  │
    │  │  └── Sessions                            │  │
    │  └──────────────────────────────────────────┘  │
    │                                                  │
    └──────────────────────────────────────────────────┘
```

### 통신 흐름

#### 1. 명령 전송 흐름
```
웹앱 사용자가 "마우스 이동" 명령 클릭
  ↓
React Query: POST /api/commands (명령 생성)
  ↓
API 서버: 명령을 DB에 저장
  ↓
WebSocket: 해당 Agent에 "newCommand" 이벤트 전송
  ↓
Agent: 명령 수신 → robotjs로 마우스 이동 실행
  ↓
Agent: 실행 결과 WebSocket으로 서버에 보고
  ↓
API 서버: 명령 상태 업데이트 (DB)
  ↓
웹앱: WebSocket 구독으로 상태 변경 감지 → UI 업데이트
```

#### 2. 실시간 상태 갱신 흐름
```
Agent: 주기적으로 시스템 상태 수집
  ↓
Agent: WebSocket으로 "statusUpdate" 전송
  ↓
API 서버: Redis에 최신 상태 캐시
  ↓
웹앱: socket.io 구독 → 상태 변경 수신
  ↓
웹앱: UI 업데이트 (실시간)
```

---

## 파일 구조 및 모듈 설계

### 1. 웹앱 파일 구조

```
vooster/
├── src/
│   ├── app/
│   │   ├── (protected)/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx              # 대시보드 메인
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── computers/
│   │   │   │   ├── page.tsx              # 컴퓨터 목록
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx          # 컴퓨터 상세 페이지
│   │   │   │   │   └── control.tsx       # 제어 인터페이스
│   │   │   │   └── layout.tsx
│   │   │   ├── commands/
│   │   │   │   ├── page.tsx              # 명령 이력
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── [[...hono]]/
│   │   │       └── route.ts              # Hono API 진입점
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── page.tsx
│   │   ├── layout.tsx                    # 루트 레이아웃
│   │   ├── providers.tsx                 # 글로벌 프로바이더
│   │   └── error.tsx
│   │
│   ├── backend/
│   │   ├── hono/
│   │   │   ├── index.ts                  # Hono 앱 초기화
│   │   │   ├── context.ts                # 컨텍스트 타입 및 헬퍼
│   │   │   └── websocket-server.ts       # socket.io 서버 초기화
│   │   ├── http/
│   │   │   ├── response.ts               # 통일된 응답 형식
│   │   │   └── errors.ts                 # 에러 정의
│   │   ├── middleware/
│   │   │   ├── auth.ts                   # 인증 미들웨어
│   │   │   ├── error-handler.ts          # 에러 핸들링
│   │   │   └── logger.ts                 # 로깅
│   │   └── supabase/
│   │       ├── client.ts                 # 서버용 Supabase 클라이언트
│   │       └── admin.ts                  # 관리자용 클라이언트
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── backend/
│   │   │   │   ├── route.ts
│   │   │   │   ├── schema.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── error.ts
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignupForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   └── useAuthUser.ts
│   │   │   ├── lib/
│   │   │   │   └── dto.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── computers/
│   │   │   ├── backend/
│   │   │   │   ├── route.ts              # GET /api/computers, POST, DELETE 등
│   │   │   │   ├── schema.ts             # Zod 검증 스키마
│   │   │   │   ├── service.ts            # 비즈니스 로직
│   │   │   │   └── error.ts              # 에러 정의
│   │   │   ├── components/
│   │   │   │   ├── ComputerList.tsx      # 컴퓨터 목록
│   │   │   │   ├── ComputerCard.tsx      # 카드 컴포넌트
│   │   │   │   ├── ComputerDetail.tsx    # 상세 정보
│   │   │   │   ├── ComputerStatus.tsx    # 상태 표시
│   │   │   │   └── AddComputerDialog.tsx # 컴퓨터 추가
│   │   │   ├── hooks/
│   │   │   │   ├── useComputersQuery.ts
│   │   │   │   ├── useComputerDetail.ts
│   │   │   │   ├── useAddComputer.ts
│   │   │   │   └── useComputerStatus.ts  # WebSocket 구독
│   │   │   ├── lib/
│   │   │   │   ├── dto.ts
│   │   │   │   └── utils.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── remote-control/
│   │   │   ├── backend/
│   │   │   │   ├── route.ts              # 명령 관련 API
│   │   │   │   ├── schema.ts
│   │   │   │   ├── service.ts
│   │   │   │   └── error.ts
│   │   │   ├── components/
│   │   │   │   ├── ControlPanel.tsx      # 제어 패널 메인
│   │   │   │   ├── MouseControl.tsx      # 마우스 제어
│   │   │   │   ├── KeyboardControl.tsx   # 키보드 제어
│   │   │   │   ├── SystemControl.tsx     # 시스템 제어
│   │   │   │   ├── CommandQueue.tsx      # 명령 큐 표시
│   │   │   │   └── ScreenMirror.tsx      # 화면 미러링 (선택)
│   │   │   ├── hooks/
│   │   │   │   ├── useSendCommand.ts
│   │   │   │   ├── useCommandQueue.ts
│   │   │   │   └── useRemoteControl.ts
│   │   │   ├── lib/
│   │   │   │   ├── command-builder.ts    # 명령 생성 유틸리티
│   │   │   │   └── dto.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   │
│   │   └── system-info/
│   │       ├── backend/
│   │       │   ├── route.ts
│   │       │   ├── schema.ts
│   │       │   ├── service.ts
│   │       │   └── error.ts
│   │       ├── components/
│   │       │   ├── SystemInfoPanel.tsx
│   │       │   ├── CPUMonitor.tsx
│   │       │   └── MemoryMonitor.tsx
│   │       ├── hooks/
│   │       │   └── useSystemInfo.ts
│   │       ├── types.ts
│   │       └── constants.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── Navigation.tsx
│   │   ├── ui/                           # shadcn/ui 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── NotificationCenter.tsx
│   │   └── providers/
│   │       ├── QueryProvider.tsx
│   │       ├── ThemeProvider.tsx
│   │       └── SocketProvider.tsx
│   │
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-websocket.ts              # WebSocket 훅
│   │   └── use-responsive.ts
│   │
│   ├── lib/
│   │   ├── remote/
│   │   │   └── api-client.ts             # axios 인스턴스
│   │   ├── supabase/
│   │   │   ├── client.ts                 # 브라우저용
│   │   │   └── server.ts                 # 서버용
│   │   ├── socket/
│   │   │   ├── client.ts                 # socket.io 클라이언트
│   │   │   └── events.ts                 # 이벤트 정의
│   │   └── utils.ts                      # cn(), 유틸리티
│   │
│   ├── constants/
│   │   ├── api.ts                        # API 엔드포인트
│   │   ├── commands.ts                   # 명령 정의
│   │   └── errors.ts                     # 에러 메시지
│   │
│   └── types/
│       ├── api.ts
│       ├── computer.ts
│       ├── command.ts
│       └── index.ts
│
├── agents/                               # 클라이언트 Agent 코드
│   ├── electron-agent/                   # Electron 기반 (선택)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── preload.ts
│   │   │   └── socket-client.ts
│   │   └── package.json
│   │
│   └── node-agent/                       # Node.js 기반 (권장)
│       ├── src/
│       │   ├── index.ts                  # 진입점
│       │   ├── config.ts                 # 설정 관리
│       │   ├── socket-client.ts          # WebSocket 클라이언트
│       │   ├── command-executor.ts       # 명령 실행
│       │   ├── system-monitor.ts         # 시스템 모니터링
│       │   ├── logger.ts                 # 로깅
│       │   └── utils/
│       │       ├── retry-logic.ts        # 재연결 로직
│       │       ├── encryption.ts         # 암호화
│       │       └── validators.ts         # 검증
│       ├── .env.example
│       ├── package.json
│       └── README.md
│
├── supabase/
│   └── migrations/
│       ├── 001_auth_tables.sql
│       ├── 002_computers_table.sql
│       ├── 003_commands_table.sql
│       ├── 004_sessions_table.sql
│       └── 005_rls_policies.sql
│
├── docs/
│   ├── DEPLOYMENT.md                    # 배포 가이드
│   ├── ARCHITECTURE.md
│   ├── AGENT_SETUP.md                   # Agent 설정 가이드
│   └── API.md                            # API 문서
│
├── .env.example
├── .env.local                            # 개발 환경변수
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
└── README.md
```

### 2. 공유 타입 정의 (Shared Types)

```typescript
// src/types/command.ts
export type CommandType =
  | 'mouse-move'
  | 'mouse-click'
  | 'mouse-scroll'
  | 'key-press'
  | 'key-release'
  | 'text-input'
  | 'screenshot'
  | 'system-info'
  | 'sleep'
  | 'wake'
  | 'file-transfer';

export interface Command {
  id: string;
  computerId: string;
  type: CommandType;
  payload: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  executedAt?: string;
  result?: Record<string, any>;
  error?: string;
}

export interface Computer {
  id: string;
  name: string;
  osType: 'windows' | 'macos' | 'linux';
  ipAddress: string;
  lastSeen: string;
  status: 'online' | 'offline' | 'idle';
  systemInfo?: SystemInfo;
  agentVersion: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
}

export interface WebSocketEvents {
  'command:new': Command;
  'command:updated': Command;
  'status:update': { computerId: string; status: Computer['status'] };
  'agent:connect': { computerId: string };
  'agent:disconnect': { computerId: string };
  'system-info:update': { computerId: string; info: SystemInfo };
}
```

---

## 실시간 통신 구현

### 1. WebSocket 서버 (socket.io)

#### 서버 초기화
```typescript
// src/backend/hono/websocket-server.ts
import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import { logger } from './logger';
import { validateToken } from '@/features/auth/backend/service';

export interface SocketContext {
  userId: string;
  computerId?: string;
  isAgent: boolean;
}

interface ExtendedSocket extends Socket {
  context?: SocketContext;
}

export function initializeWebSocket(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // 인증 미들웨어
  io.use(async (socket: ExtendedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const isAgent = socket.handshake.auth.isAgent;

      if (!token) {
        return next(new Error('Missing token'));
      }

      const user = await validateToken(token);
      if (!user) {
        return next(new Error('Invalid token'));
      }

      socket.context = {
        userId: user.id,
        computerId: socket.handshake.auth.computerId,
        isAgent: isAgent || false,
      };

      next();
    } catch (error) {
      logger.error('WebSocket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // 클라이언트(웹앱) 네임스페이스
  const clientNs = io.of('/client');

  clientNs.on('connection', (socket: ExtendedSocket) => {
    const { userId, computerId } = socket.context!;
    logger.info(`Client connected: ${userId}`);

    // 구독: 특정 컴퓨터 상태 업데이트
    socket.on('subscribe:computer', (data: { computerId: string }) => {
      socket.join(`computer:${data.computerId}`);
      logger.info(`Client ${userId} subscribed to computer ${data.computerId}`);
    });

    // 구독 취소
    socket.on('unsubscribe:computer', (data: { computerId: string }) => {
      socket.leave(`computer:${data.computerId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${userId}`);
    });
  });

  // Agent(클라이언트 컴퓨터) 네임스페이스
  const agentNs = io.of('/agent');

  agentNs.on('connection', (socket: ExtendedSocket) => {
    const { userId, computerId } = socket.context!;
    logger.info(`Agent connected: ${computerId}`);

    // Agent 상태 저장
    socket.join(`agent:${computerId}`);

    // 명령 수신
    socket.on('command:execute', async (command: Command) => {
      logger.info(`Command executed on ${computerId}:`, command.type);

      // DB에 실행 결과 저장
      // 웹앱에 결과 브로드캐스트
      clientNs.to(`computer:${computerId}`).emit('command:executed', {
        commandId: command.id,
        status: command.status,
        result: command.result,
      });
    });

    // 시스템 정보 업데이트
    socket.on('system-info:update', (data: SystemInfo) => {
      logger.info(`System info updated for ${computerId}`);

      // 웹앱 클라이언트에 브로드캐스트
      clientNs.to(`computer:${computerId}`).emit('system-info:updated', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Agent disconnected: ${computerId}`);

      // 웹앱에 오프라인 상태 알림
      clientNs.to(`computer:${computerId}`).emit('computer:offline');
    });
  });

  return { io, clientNs, agentNs };
}
```

### 2. 클라이언트 Agent (Node.js)

#### 재연결 로직
```typescript
// agents/node-agent/src/socket-client.ts
import { io, Socket } from 'socket.io-client';
import { logger } from './logger';
import { config } from './config';

interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class AgentSocketClient {
  private socket?: Socket;
  private reconnectConfig: ReconnectConfig;
  private reconnectAttempts = 0;

  constructor() {
    this.reconnectConfig = {
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(config.SERVER_URL, {
          namespace: '/agent',
          auth: {
            token: config.AUTH_TOKEN,
            computerId: config.COMPUTER_ID,
            isAgent: true,
          },
          reconnection: true,
          reconnectionDelay: this.calculateDelay(),
          reconnectionDelayMax: this.reconnectConfig.maxDelay,
          reconnectionAttempts: this.reconnectConfig.maxAttempts,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
          logger.info('Connected to server');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          logger.error('Connection error:', error);
          this.handleReconnect(reject);
        });

        this.socket.on('disconnect', (reason) => {
          logger.warn(`Disconnected: ${reason}`);
        });

        // 명령 수신 리스너
        this.socket.on('command:new', (command: Command) => {
          this.handleCommand(command);
        });

        // 오류 처리
        this.socket.on('error', (error) => {
          logger.error('Socket error:', error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private calculateDelay(): number {
    const exponentialDelay = Math.min(
      this.reconnectConfig.baseDelay *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts),
      this.reconnectConfig.maxDelay
    );

    // 랜덤 지터 추가 (thundering herd 문제 방지)
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  private handleReconnect(reject: Function): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      logger.error('Max reconnection attempts reached');
      reject(new Error('Failed to connect after max attempts'));
    } else {
      const delay = this.calculateDelay();
      logger.info(`Reconnecting in ${Math.round(delay)}ms... (Attempt ${this.reconnectAttempts})`);
    }
  }

  private async handleCommand(command: Command): Promise<void> {
    try {
      logger.info(`Executing command: ${command.type}`);

      const result = await executeCommand(command);

      // 실행 결과 전송
      this.socket?.emit('command:execute', {
        ...command,
        status: 'completed',
        result,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Command execution failed: ${command.type}`, error);

      this.socket?.emit('command:execute', {
        ...command,
        status: 'failed',
        error: String(error),
        executedAt: new Date().toISOString(),
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
```

### 3. 클라이언트 웹앱 (React Hook)

```typescript
// src/hooks/use-websocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocketClient } from '@/lib/socket/client';

export function useWebSocket(computerId: string, onCommandUpdate?: (command: Command) => void) {
  const socket = getSocketClient();
  const queryClient = useQueryClient();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!socket?.connected || !computerId) return;

    // 구독 시작
    socket.emit('subscribe:computer', { computerId });
    isSubscribedRef.current = true;

    // 명령 실행 완료 리스너
    const handleCommandExecuted = (data: { commandId: string; status: string; result: any }) => {
      // React Query 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['commands', computerId],
      });

      onCommandUpdate?.({
        id: data.commandId,
        status: data.status,
        result: data.result,
      } as Command);
    };

    // 시스템 정보 업데이트 리스너
    const handleSystemInfoUpdated = (info: SystemInfo) => {
      queryClient.setQueryData(['system-info', computerId], info);
    };

    // 오프라인 상태 리스너
    const handleComputerOffline = () => {
      queryClient.setQueryData(['computer', computerId], (old: Computer) => ({
        ...old,
        status: 'offline',
      }));
    };

    socket.on('command:executed', handleCommandExecuted);
    socket.on('system-info:updated', handleSystemInfoUpdated);
    socket.on('computer:offline', handleComputerOffline);

    return () => {
      if (isSubscribedRef.current) {
        socket.emit('unsubscribe:computer', { computerId });
        socket.off('command:executed', handleCommandExecuted);
        socket.off('system-info:updated', handleSystemInfoUpdated);
        socket.off('computer:offline', handleComputerOffline);
        isSubscribedRef.current = false;
      }
    };
  }, [socket, computerId, queryClient, onCommandUpdate]);
}
```

---

## API 엔드포인트 설계

### 1. 인증 API

```typescript
// Endpoint: POST /api/auth/login
Request: {
  email: string;
  password: string;
}
Response: {
  token: string;
  user: User;
  expiresIn: number;
}

// Endpoint: POST /api/auth/logout
Response: {
  success: boolean;
}

// Endpoint: POST /api/auth/refresh
Request: {
  refreshToken: string;
}
Response: {
  token: string;
  expiresIn: number;
}
```

### 2. 컴퓨터 관리 API

```typescript
// Endpoint: GET /api/computers
Response: {
  computers: Computer[];
  total: number;
}

// Endpoint: GET /api/computers/:id
Response: Computer

// Endpoint: POST /api/computers
Request: {
  name: string;
  registrationKey: string;  // Agent에서 제공하는 고유 키
}
Response: Computer

// Endpoint: PUT /api/computers/:id
Request: {
  name?: string;
}
Response: Computer

// Endpoint: DELETE /api/computers/:id
Response: {
  success: boolean;
}

// Endpoint: GET /api/computers/:id/system-info
Response: SystemInfo

// Endpoint: GET /api/computers/:id/status
Response: {
  status: 'online' | 'offline' | 'idle';
  lastSeen: string;
}
```

### 3. 명령 관리 API

```typescript
// Endpoint: POST /api/commands
Request: {
  computerId: string;
  type: CommandType;
  payload: Record<string, any>;
}
Response: Command

// Endpoint: GET /api/commands?computerId=:id&limit=50
Response: {
  commands: Command[];
  total: number;
}

// Endpoint: GET /api/commands/:id
Response: Command

// Endpoint: GET /api/commands/:id/result
Response: {
  status: string;
  result?: any;
  error?: string;
}

// Endpoint: DELETE /api/commands/:id
Response: {
  success: boolean;
}
```

### 4. 파일 전송 API

```typescript
// Endpoint: POST /api/files/upload
Request: FormData (multipart/form-data)
  - computerId: string
  - file: File
Response: {
  fileId: string;
  size: number;
  url: string;
}

// Endpoint: GET /api/files/:id
Response: File download

// Endpoint: DELETE /api/files/:id
Response: {
  success: boolean;
}
```

### 5. 세션 관리 API

```typescript
// Endpoint: GET /api/sessions
Response: {
  sessions: Session[];
}

// Endpoint: DELETE /api/sessions/:id
Response: {
  success: boolean;
}
```

---

## 클라이언트 Agent 구현

### 1. 명령 실행 시스템

```typescript
// agents/node-agent/src/command-executor.ts
import robot from 'robotjs';
import type { Command } from '@/types/command';

export class CommandExecutor {
  async execute(command: Command): Promise<Record<string, any>> {
    switch (command.type) {
      case 'mouse-move':
        return this.executeMoveMove(command);
      case 'mouse-click':
        return this.executeMouseClick(command);
      case 'key-press':
        return this.executeKeyPress(command);
      case 'screenshot':
        return this.executeScreenshot(command);
      case 'system-info':
        return this.executeSystemInfo(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private executeMoveMove(command: Command): Record<string, any> {
    const { x, y } = command.payload as { x: number; y: number };
    robot.moveMouse(x, y);
    return { x, y };
  }

  private executeMouseClick(command: Command): Record<string, any> {
    const { button = 'left', doubleClick = false } = command.payload;
    if (doubleClick) {
      robot.mouseClick(button, true);
    } else {
      robot.mouseClick(button);
    }
    return { button, doubleClick };
  }

  private executeKeyPress(command: Command): Record<string, any> {
    const { key, isDown = true } = command.payload;
    if (isDown) {
      robot.keyToggle(key, 'down');
    } else {
      robot.keyToggle(key, 'up');
    }
    return { key, isDown };
  }

  private async executeScreenshot(command: Command): Promise<Record<string, any>> {
    // 스크린샷 캡처 및 저장
    const screenshot = robot.screen.capture();
    return {
      width: screenshot.width,
      height: screenshot.height,
      // URL로 변환해 클라우드 스토리지에 업로드
    };
  }

  private executeSystemInfo(command: Command): Record<string, any> {
    const os = require('os');
    return {
      hostname: os.hostname(),
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
    };
  }
}
```

### 2. 시스템 모니터링

```typescript
// agents/node-agent/src/system-monitor.ts
import si from 'systeminformation';
import type { SystemInfo } from '@/types/computer';

export class SystemMonitor {
  private intervalId?: NodeJS.Timeout;

  startMonitoring(socket: Socket, computerId: string, interval: number = 5000) {
    this.intervalId = setInterval(async () => {
      try {
        const info = await this.gatherSystemInfo();
        socket.emit('system-info:update', {
          computerId,
          ...info,
        });
      } catch (error) {
        logger.error('System monitoring error:', error);
      }
    }, interval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async gatherSystemInfo(): Promise<SystemInfo> {
    const [cpu, mem] = await Promise.all([
      si.currentLoad(),
      si.mem(),
    ]);

    return {
      hostname: require('os').hostname(),
      platform: process.platform,
      arch: process.arch,
      cpuUsage: cpu.currentLoad,
      memoryUsage: (mem.used / mem.total) * 100,
      diskUsage: 0, // TODO: 디스크 사용량 추가
      uptime: require('os').uptime(),
    };
  }
}
```

### 3. 설정 관리

```typescript
// agents/node-agent/src/config.ts
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export const config = {
  // 서버 정보
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:3000',

  // 인증 정보
  AUTH_TOKEN: process.env.AUTH_TOKEN || '',
  COMPUTER_ID: process.env.COMPUTER_ID || '',

  // 로깅
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',

  // 모니터링
  MONITORING_INTERVAL: parseInt(process.env.MONITORING_INTERVAL || '5000'),

  // SSL/TLS
  USE_TLS: process.env.USE_TLS === 'true',
  CERT_PATH: process.env.CERT_PATH,
  KEY_PATH: process.env.KEY_PATH,

  // 기타
  MAX_COMMAND_QUEUE_SIZE: parseInt(process.env.MAX_COMMAND_QUEUE_SIZE || '100'),
};

// 검증
if (!config.AUTH_TOKEN || !config.COMPUTER_ID) {
  throw new Error('AUTH_TOKEN and COMPUTER_ID environment variables are required');
}

// 로그 디렉토리 생성
if (!fs.existsSync(config.LOG_DIR)) {
  fs.mkdirSync(config.LOG_DIR, { recursive: true });
}
```

---

## 배포 및 운영

### 1. 개발 환경 (로컬 다중 컴퓨터 시뮬레이션)

#### Docker Compose를 이용한 로컬 개발

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # Next.js 앱
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/vooster
      NEXT_PUBLIC_APP_URL: http://localhost:3000
      AUTH_SECRET: dev-secret-key
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: vooster
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis (선택)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Agent 시뮬레이션 (여러 개 실행)
  agent-1:
    build:
      context: ./agents/node-agent
    environment:
      SERVER_URL: http://app:3000
      AUTH_TOKEN: test-token-1
      COMPUTER_ID: computer-001
      COMPUTER_NAME: "Desktop (Office)"
      LOG_LEVEL: info
    depends_on:
      - app
    volumes:
      - ./agents/node-agent:/agent

  agent-2:
    build:
      context: ./agents/node-agent
    environment:
      SERVER_URL: http://app:3000
      AUTH_TOKEN: test-token-2
      COMPUTER_ID: computer-002
      COMPUTER_NAME: "Laptop (Warehouse)"
      LOG_LEVEL: info
    depends_on:
      - app
    volumes:
      - ./agents/node-agent:/agent

volumes:
  postgres_data:
```

#### 개발 스크립트

```bash
# 전체 스택 시작
docker-compose -f docker-compose.dev.yml up -d

# 앱 로그 확인
docker-compose -f docker-compose.dev.yml logs -f app

# Agent 로그 확인
docker-compose -f docker-compose.dev.yml logs -f agent-1

# 종료
docker-compose -f docker-compose.dev.yml down
```

### 2. 프로덕션 배포

#### 배포 아키텍처

```
┌─────────────────┐
│  CDN (Vercel)   │
└────────┬────────┘
         │ (정적 자산)
         │
┌────────▼────────────────────┐
│  Vercel (Next.js App)        │
│  ├── API Routes (Hono.js)    │
│  ├── WebSocket Server        │
│  └── Database: Supabase      │
└────────┬─────────────────────┘
         │
    ┌────┴────┐
    │ 인터넷  │
    └────┬────┘
         │
    ┌────▼────────────────────┐
    │  클라이언트 에이전트    │
    │  (Agent VM / Docker)     │
    └─────────────────────────┘
```

#### Vercel 배포

```bash
# 1. Vercel 설정
vercel login
vercel link

# 2. 환경 변수 설정
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add NEXT_PUBLIC_APP_URL

# 3. 배포
vercel deploy --prod
```

#### Agent 배포 (Docker)

```dockerfile
# agents/node-agent/Dockerfile
FROM node:20-alpine

WORKDIR /agent

# 의존성 설치
COPY package*.json ./
RUN npm ci --production

# 소스 코드
COPY src ./src
COPY tsconfig.json ./

# 환경 변수
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# 시작
CMD ["npm", "start"]
```

#### 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy-agent.sh

COMPUTER_ID=$1
AGENT_IMAGE="vooster-agent:latest"
CONTAINER_NAME="vooster-agent-${COMPUTER_ID}"

# 이미지 빌드
docker build -t $AGENT_IMAGE ./agents/node-agent

# 기존 컨테이너 중지 및 삭제
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# 새 컨테이너 실행
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -e COMPUTER_ID=$COMPUTER_ID \
  -e AUTH_TOKEN=$(grep "AUTH_TOKEN_${COMPUTER_ID}" .env | cut -d'=' -f2) \
  -e SERVER_URL=$SERVER_URL \
  -e LOG_LEVEL=info \
  -v /var/log/vooster:/agent/logs \
  $AGENT_IMAGE

echo "Agent deployed: $CONTAINER_NAME"
```

### 3. 모니터링 및 로깅

#### 로깅 구조

```typescript
// src/backend/hono/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export { logger };
```

#### 모니터링 메트릭

```typescript
// src/backend/hono/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const metricsRegistry = new Registry();

// API 요청 메트릭
export const apiRequestCount = new Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const apiRequestDuration = new Histogram({
  name: 'api_request_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['method', 'route'],
  registers: [metricsRegistry],
});

// WebSocket 연결 메트릭
export const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['type'], // 'agent' or 'client'
  registers: [metricsRegistry],
});

// 명령 실행 메트릭
export const commandExecutionCount = new Counter({
  name: 'commands_executed_total',
  help: 'Total commands executed',
  labelNames: ['type', 'status'],
  registers: [metricsRegistry],
});
```

#### Prometheus 엔드포인트

```typescript
// src/app/api/[[...hono]]/route.ts에 추가
app.get('/metrics', (c) => {
  return c.text(metricsRegistry.metrics(), 200, {
    'Content-Type': metricsRegistry.contentType,
  });
});
```

### 4. 보안 고려사항

#### HTTPS/SSL 설정

```typescript
// Agent와 Server 간 SSL 통신
const socketOptions = {
  ...baseOptions,
  ...(config.USE_TLS && {
    ca: fs.readFileSync(config.CERT_PATH),
    rejectUnauthorized: true,
  }),
};
```

#### 토큰 기반 인증

```typescript
// JWT 토큰 검증
async function validateToken(token: string): Promise<User | null> {
  try {
    const payload = jwt.verify(token, process.env.AUTH_SECRET!);
    return payload as User;
  } catch {
    return null;
  }
}
```

#### RLS (Row Level Security) 정책

```sql
-- Supabase RLS 정책
CREATE POLICY "Users can only see their own computers"
  ON computers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can only manage their own commands"
  ON commands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM computers
      WHERE computers.id = commands.computer_id
      AND computers.user_id = auth.uid()
    )
  );
```

---

## 확장성 고려

### 1. 현장 인쇄 시스템으로 확장

```typescript
// src/features/print-management/backend/route.ts
export const registerPrintRoutes = (app: Hono<AppEnv>) => {
  // 프린터 목록 조회
  app.get('/printers', async (c) => {
    const computerId = c.req.query('computerId');
    // computerId의 Agent에 프린터 목록 요청
  });

  // 인쇄 작업 전송
  app.post('/print-jobs', async (c) => {
    const { computerId, file, copies, colorMode } = await c.req.json();
    // 인쇄 명령 전송
  });

  // 인쇄 진행률 조회
  app.get('/print-jobs/:id/progress', async (c) => {
    // 실시간 진행률 반환
  });
};
```

### 2. 창고 관리 시스템으로 확장

```typescript
// src/features/warehouse/backend/route.ts
export const registerWarehouseRoutes = (app: Hono<AppEnv>) => {
  // 재고 시스템 PC 제어
  app.post('/inventory/search', async (c) => {
    // 원격 PC에서 재고 조회
  });

  app.post('/inventory/update', async (c) => {
    // 원격 PC에서 재고 업데이트
  });
};
```

### 3. 매장 디스플레이 시스템으로 확장

```typescript
// src/features/display-management/backend/route.ts
export const registerDisplayRoutes = (app: Hono<AppEnv>) => {
  // 디지털 사이니지 콘텐츠 관리
  app.post('/displays/:id/content', async (c) => {
    // 디스플레이에 콘텐츠 전송
  });

  app.post('/displays/:id/schedule', async (c) => {
    // 스케줄 설정
  });
};
```

### 4. 데이터 구조 확장

```typescript
// src/types/command.ts에 추가
export type CommandType =
  | 'mouse-move'
  | 'mouse-click'
  // ... 기존
  | 'print-command'
  | 'printer-query'
  | 'inventory-lookup'
  | 'display-update'
  | 'file-download'
  | 'file-upload';
```

---

## 개발 로드맵

### Phase 1: MVP (4주)

#### Week 1: 기초 설정
- [ ] Next.js 프로젝트 초기화
- [ ] Supabase 설정 및 테이블 생성
- [ ] 기본 레이아웃 및 UI 컴포넌트
- [ ] 인증 시스템 구현

#### Week 2: 백엔드 API
- [ ] Hono.js API 라우트 설정
- [ ] 컴퓨터 관리 API 구현
- [ ] 명령 관리 API 구현
- [ ] 기본 에러 처리

#### Week 3: WebSocket & 실시간 통신
- [ ] socket.io 서버 초기화
- [ ] 클라이언트 연결 처리
- [ ] Agent 연결 및 메시지 라우팅
- [ ] 웹앱 실시간 업데이트

#### Week 4: 클라이언트 Agent
- [ ] Node.js Agent 기본 구조
- [ ] 명령 실행 시스템
- [ ] 시스템 모니터링
- [ ] 재연결 로직

### Phase 2: 고급 기능 (3주)

- [ ] 화면 공유 (WebRTC)
- [ ] 파일 전송
- [ ] 명령 매크로
- [ ] 사용자 권한 관리

### Phase 3: 운영 최적화 (2주)

- [ ] 모니터링 및 로깅
- [ ] 성능 최적화
- [ ] 보안 감사
- [ ] 배포 자동화

---

## 빠른 시작 가이드

### 로컬 개발 환경 구성

```bash
# 1. 저장소 클론
git clone <repository-url>
cd vooster

# 2. 환경 변수 설정
cp .env.example .env.local

# 3. 의존성 설치
npm install

# 4. Supabase 마이그레이션
npx supabase migrate up

# 5. 개발 서버 시작
npm run dev

# 6. Agent 시작 (별도 터미널)
cd agents/node-agent
npm install
npm run dev
```

### 배포 전 체크리스트

- [ ] 모든 환경 변수 설정
- [ ] TypeScript 컴파일 오류 없음
- [ ] 테스트 통과
- [ ] 보안 감사 완료
- [ ] 성능 테스트 완료 (Lighthouse > 90)
- [ ] 마이그레이션 완료
- [ ] 백업 계획 수립

---

## 참고 자료

### 내부 문서
- [바코드 주문 조회 시스템 PRD](./prd.md)
- [기술 스택 상세](./architecture.md)
- [코드 가이드라인](./guideline.md)

### 외부 참고
- [Next.js 공식 문서](https://nextjs.org/docs)
- [socket.io 문서](https://socket.io/docs/)
- [Supabase 공식 문서](https://supabase.com/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)

---

**버전 이력**
| 버전 | 날짜 | 변경 사항 |
|------|------|---------|
| 1.0.0 | 2025-10-23 | 초안 작성 |

