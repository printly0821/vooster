# 분산 제어 시스템(Distributed Control System) 백엔드 아키텍처 가이드

## 개요

이 문서는 원격 컴퓨터에 명령을 전달하고 실행 상태를 추적하는 분산 제어 시스템의 백엔드 아키텍처를 다룹니다.

인쇄 생산 현장, 창고 관리, IoT 기기 제어 등 다양한 시나리오에서 중앙 명령 서버가 여러 클라이언트 머신을 제어해야 하는 상황을 해결합니다.

---

## 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [기술 검토](#기술-검토)
3. [아키텍처 디자인](#아키텍처-디자인)
4. [실제 구현 패턴](#실제-구현-패턴)
5. [보안 전략](#보안-전략)
6. [배포 및 모니터링](#배포-및-모니터링)
7. [실제 사례](#실제-사례)

---

## 시스템 요구사항

### 기능 요구사항

```
1. 명령 전달 (Command Delivery)
   - 중앙 서버 → 클라이언트 머신으로 명령 전송
   - 특정 머신, 머신 그룹, 전체 머신에 브로드캐스트 지원
   - 명령 우선순위 관리

2. 상태 추적 (Status Tracking)
   - 각 머신의 연결 상태 실시간 모니터링
   - 명령 실행 상태 변화 추적 (대기 → 진행 → 완료/실패)
   - 명령 결과 수집 및 저장

3. 신뢰성 (Reliability)
   - 네트워크 단절 시 자동 재연결
   - 미전달 명령 자동 재시도
   - 명령 실패 시 로깅 및 알림

4. 확장성 (Scalability)
   - 동시에 수천 개의 클라이언트 연결 지원
   - 명령 처리량 증가에 따른 수평 확장
```

### 비기능 요구사항

```
- 명령 전달 레이턴시: < 500ms (LAN 기준)
- 시스템 가용성: 99.5% 이상
- 보안: 인증, 권한 관리, 감사 로그
- 복잡도: 메시지 큐 최소화로 간단한 구조 유지
```

---

## 기술 검토

### 1. 실시간 양방향 통신 방식 비교

#### A. WebSocket

**개요**: TCP 기반 지속적 연결

**장점**:
- 낮은 레이턴시 (양방향 통신)
- 서버가 클라이언트로 먼저 데이터 푸시 가능
- 연결당 오버헤드 작음

**단점**:
- 상태 저장 필요 (메모리 사용)
- 연결 단절 시 처리 복잡
- 로드 밸런싱 어려움 (sticky session 필요)

**활용 사례**:
- 채팅, 협업 도구 (Slack, Google Docs)
- 실시간 모니터링 대시보드

**Hono.js에서 WebSocket 구현**:

```typescript
// backend/websocket/route.ts
import type { Hono } from 'hono';
import { websocket } from '@hono/hono/helper/websocket';

export const registerWebSocketRoutes = (app: Hono) => {
  app.get('/ws/control', websocket({
    // WebSocket 핸들러
    onOpen: (event, ws) => {
      const clientId = generateClientId();
      activeClients.set(clientId, ws);
      logger.info('Client connected', { clientId });
    },
    onMessage: (event, ws) => {
      const message = JSON.parse(event.data);
      handleClientMessage(message, ws);
    },
    onClose: (event, ws) => {
      // 클라이언트 정리
      removeClient(ws);
    }
  }));
};
```

**단점**: Hono.js의 WebSocket 지원이 제한적이고, Next.js API 라우트와 호환성 이슈

#### B. Server-Sent Events (SSE)

**개요**: HTTP 기반 단방향 푸시 (서버 → 클라이언트)

**장점**:
- 구현 간단 (HTTP 표준)
- 상태 관리 용이
- 자동 재연결 지원
- 로드 밸런싱 용이

**단점**:
- 클라이언트 → 서버 명령은 별도 HTTP POST 필요 (하이브리드)
- 동시 연결 수 제한 (브라우저당 6개)
- 양방향 지연 가능성

**활용 사례**:
- 실시간 알림 시스템
- 진행상황 스트리밍
- 서버에서 클라이언트로의 일방향 업데이트

**Hono.js에서 SSE 구현**:

```typescript
// backend/sse/route.ts
export const registerSSERoutes = (app: Hono<AppEnv>) => {
  app.get('/api/events/:clientId', async (c) => {
    const clientId = c.req.param('clientId');

    // SSE 헤더 설정
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    return c.stream(async (writer) => {
      // 클라이언트 등록
      const eventQueue = new EventQueue();
      activeClients.set(clientId, eventQueue);

      try {
        // 명령을 대기하면서 스트림
        while (true) {
          const event = await eventQueue.wait(30000); // 30초 타임아웃

          if (!event) {
            // keep-alive 메시지
            await writer.write(': heartbeat\n\n');
            continue;
          }

          await writer.write(`event: ${event.type}\n`);
          await writer.write(`data: ${JSON.stringify(event.payload)}\n\n`);
        }
      } finally {
        activeClients.delete(clientId);
      }
    });
  });

  // 명령 전송 엔드포인트
  app.post('/api/commands', async (c) => {
    const { clientId, command } = await c.req.json();

    const eventQueue = activeClients.get(clientId);
    if (eventQueue) {
      eventQueue.push({
        type: 'command',
        payload: command
      });
    }

    return c.json({ ok: true });
  });
};
```

#### C. 폴링(Polling)

**개요**: 클라이언트가 주기적으로 서버에서 데이터 확인

**장점**:
- 구현 가장 간단
- 모든 환경에서 동작
- 로드 밸런싱 쉬움

**단점**:
- 높은 레이턴시 (폴링 간격에 따라 수 초)
- 불필요한 요청 증가로 서버 부하
- 실시간성 떨어짐

**활용 시나리오**: 1초 이상 지연이 허용되는 경우

### 2. 메시지 큐 비교

#### Redis (권장: 간단한 구조)

**사용 사례**:
```typescript
// 명령 큐 구조
LPUSH commands:pending ${commandId} ${commandJson}
LPOP commands:pending

// 상태 추적
SET command:${commandId}:status "pending"
EXPIRE command:${commandId}:status 86400

// 클라이언트별 큐
LPUSH client:${clientId}:queue ${commandJson}
```

**장점**:
- 단순하고 빠름
- 메모리 기반으로 높은 성능
- 세션 저장소로도 활용 가능

**단점**:
- 서버 재시작 시 데이터 손실 (AOF 설정으로 보완)
- 메모리 제한으로 인한 스케일 한계

**구현 예시**:

```typescript
// backend/redis/client.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});

// 명령 저장
export async function saveCommand(command: Command) {
  const commandId = generateId();
  const key = `command:${commandId}`;

  // 명령 메타데이터 저장
  await redis.hset(key, {
    id: commandId,
    status: 'pending',
    clientId: command.clientId,
    action: command.action,
    payload: JSON.stringify(command.payload),
    createdAt: new Date().toISOString(),
    retryCount: 0
  });

  // TTL 설정 (24시간)
  await redis.expire(key, 86400);

  // 클라이언트 큐에 추가
  await redis.rpush(`client:${command.clientId}:queue`, commandId);

  return commandId;
}

// 명령 조회
export async function getCommand(commandId: string) {
  const data = await redis.hgetall(`command:${commandId}`);
  return data ? deserializeCommand(data) : null;
}
```

#### RabbitMQ (권장: 대규모, 높은 신뢰성)

**사용 사례**: 다양한 마이크로서비스 통신, 메시지 지속성 중요

**장점**:
- 강력한 메시지 지속성 (디스크 기반)
- 메시지 우선순위 지원
- Dead Letter Queue (DLQ) 등 고급 기능
- 다양한 라우팅 전략

**단점**:
- 설치, 관리 복잡
- 높은 메모리 사용
- 낮은 처리량

#### Bull (Node.js 권장)

**개요**: Redis 기반 지속적 작업 큐

**장점**:
- Redis 기반으로 간단함
- Node.js와 완벽 호환
- 자동 재시도, 스케줄링
- 작업 진행상황 추적

**단점**:
- Redis 의존성 (Redis 장단점 상속)

**구현 예시**:

```typescript
// backend/queue/commandQueue.ts
import Bull from 'bull';

export const commandQueue = new Bull('commands', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// 작업 추가
export async function enqueueCommand(command: Command) {
  const job = await commandQueue.add(
    'execute',
    { ...command },
    {
      priority: command.priority || 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  );

  return job.id;
}

// 작업 처리
commandQueue.process('execute', async (job) => {
  const command = job.data;

  try {
    // 명령 실행 로직
    const result = await executeCommand(command);
    return result;
  } catch (error) {
    throw error; // 자동 재시도
  }
});
```

### 3. 기술 선택 결론

**권장 구성**:

```
소규모(< 100 클라이언트):
├─ 양방향 통신: SSE + HTTP POST
├─ 상태 저장: Redis (최소 구성)
└─ 복잡도: 낮음

중규모(100-1000 클라이언트):
├─ 양방향 통신: WebSocket (전용 서버)
├─ 상태 저장: Redis + PostgreSQL
└─ 복잡도: 중간

대규모(1000+ 클라이언트):
├─ 양방향 통신: WebSocket (로드 밸런싱)
├─ 메시지 큐: RabbitMQ 또는 Redis Streams
├─ 상태 저장: PostgreSQL + Redis 캐시
└─ 복잡도: 높음
```

---

## 아키텍처 디자인

### 1. 시스템 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Machine(s)                       │
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │  Control Agent   │      │  Control Agent   │             │
│  │  (WebSocket/SSE) │      │  (WebSocket/SSE) │             │
│  └────────┬─────────┘      └────────┬─────────┘             │
└───────────┼────────────────────────┼──────────────────────┘
            │                        │
            │  WebSocket/SSE/HTTP   │
            │                        │
┌───────────┴────────────────────────┴──────────────────────┐
│                    Central Command Server                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          API Layer (Hono.js)                         │  │
│  │  - POST /api/commands (명령 생성)                   │  │
│  │  - GET /api/commands/:id (명령 조회)               │  │
│  │  - PUT /api/commands/:id/status (상태 업데이트)    │  │
│  │  - GET /api/clients (클라이언트 목록)              │  │
│  │  - WS /ws/control (양방향 통신)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Command Service Layer                       │  │
│  │  - 명령 검증 및 생성                                │  │
│  │  - 클라이언트 라우팅                                │  │
│  │  - 상태 추적 및 업데이트                            │  │
│  │  - 재시도 로직                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Storage Layer                              │  │
│  │  ┌─────────────┐  ┌──────────────────────────────┐  │  │
│  │  │   PostgreSQL │  │  Redis (Cache/Queue)       │  │  │
│  │  │  - Commands │  │  - Active Clients          │  │  │
│  │  │  - Logs     │  │  - Command Queue           │  │  │
│  │  │  - Users    │  │  - State Cache             │  │  │
│  │  └─────────────┘  └──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. 명령 생명주기

```
1. 명령 생성 (Command Creation)
   POST /api/commands
   ├─ 입력 검증
   ├─ 권한 확인
   ├─ PostgreSQL에 저장
   └─ 응답: { commandId, status: 'pending' }

2. 명령 전달 (Command Delivery)
   ├─ 대상 클라이언트 확인
   ├─ Redis 큐에 추가
   ├─ SSE/WebSocket으로 즉시 푸시
   └─ 상태: pending → queued

3. 명령 실행 (Command Execution)
   클라이언트가 명령을 수신 후:
   ├─ 실행 시작 (PUT /api/commands/:id/status)
   ├─ 상태: queued → running
   ├─ 작업 수행
   └─ 완료 후 상태 업데이트

4. 결과 수집 (Result Collection)
   ├─ 결과를 서버로 전송
   ├─ PostgreSQL에 저장
   ├─ Redis 캐시 업데이트
   └─ 상태: running → completed/failed

5. 명령 정리 (Cleanup)
   ├─ 완료된 명령을 목록에서 제거
   ├─ 로그 유지
   ├─ 재시도 불필요한 경우 아카이브
   └─ TTL 설정으로 자동 만료
```

### 3. 데이터베이스 스키마

#### PostgreSQL

```sql
-- 클라이언트 정보
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_key TEXT NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'online',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 명령
CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  priority INT DEFAULT 5,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_by UUID REFERENCES auth.users(id),
  INDEX idx_status (status),
  INDEX idx_client_status (client_id, status),
  INDEX idx_created_at (created_at DESC)
);

-- 명령 실행 로그
CREATE TABLE command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES commands(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_command_id (command_id),
  INDEX idx_created_at (created_at DESC)
);

-- 감사 로그
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at DESC)
);
```

#### Redis 키 구조

```
# 클라이언트 상태
client:{clientId}:status -> "online|offline"
client:{clientId}:last_ping -> timestamp
client:{clientId}:ws_id -> websocket_session_id

# 명령 큐
client:{clientId}:queue -> [commandId, ...]  (List)
command:{commandId}:data -> {command json}   (Hash)
command:{commandId}:status -> "pending"      (String)

# 활성 연결
active_clients -> {clientId: socket_id, ...} (Set)

# 명령 캐시 (5분)
command:{commandId}:cache -> {full_data}     (String, EX 300)

# 세션 정보
session:{sessionId} -> {user_data}           (Hash, EX 3600)
```

---

## 실제 구현 패턴

### 1. 최소 복잡도 아키텍처 (권장: 소-중규모)

#### A. 클라이언트 에이전트 구현

```typescript
// client/agent.ts
class ControlAgent {
  private clientId: string;
  private clientKey: string;
  private serverUrl: string;
  private eventSource: EventSource | null = null;
  private commandQueue: Command[] = [];
  private isConnected = false;

  constructor(config: AgentConfig) {
    this.clientId = config.clientId;
    this.clientKey = config.clientKey;
    this.serverUrl = config.serverUrl;
    this.init();
  }

  private async init() {
    // 주기적 재연결 시도
    setInterval(() => this.connect(), 5000);
    await this.connect();
  }

  private async connect() {
    if (this.isConnected) return;

    try {
      // SSE로 명령 스트림 구독
      const eventSource = new EventSource(
        `${this.serverUrl}/api/events/${this.clientId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.clientKey}`
          }
        }
      );

      eventSource.addEventListener('command', (event) => {
        const command = JSON.parse(event.data);
        this.handleCommand(command);
      });

      eventSource.addEventListener('error', () => {
        this.isConnected = false;
        eventSource.close();
      });

      this.eventSource = eventSource;
      this.isConnected = true;

      // 서버에 연결 알림
      await this.notifyConnected();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  private async notifyConnected() {
    await fetch(`${this.serverUrl}/api/clients/${this.clientId}/ping`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.clientKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ timestamp: new Date().toISOString() })
    });
  }

  private async handleCommand(command: Command) {
    try {
      // 명령 실행 시작 알림
      await this.updateStatus(command.id, 'running');

      // 명령 실행
      const result = await this.executeCommand(command);

      // 결과 전송
      await this.reportResult(command.id, result);
    } catch (error) {
      await this.reportError(command.id, error);
    }
  }

  private async executeCommand(command: Command): Promise<CommandResult> {
    switch (command.action) {
      case 'print':
        return await this.handlePrintCommand(command.payload);
      case 'shutdown':
        return await this.handleShutdownCommand(command.payload);
      case 'screenshot':
        return await this.handleScreenshotCommand(command.payload);
      default:
        throw new Error(`Unknown command: ${command.action}`);
    }
  }

  private async handlePrintCommand(payload: any): Promise<CommandResult> {
    // 실제 인쇄 로직
    return {
      success: true,
      message: 'Print job submitted',
      jobId: generateId()
    };
  }

  private async updateStatus(commandId: string, status: string) {
    await fetch(
      `${this.serverUrl}/api/commands/${commandId}/status`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.clientKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }
    );
  }

  private async reportResult(commandId: string, result: any) {
    await fetch(
      `${this.serverUrl}/api/commands/${commandId}/result`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.clientKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result)
      }
    );
  }

  private async reportError(commandId: string, error: any) {
    await fetch(
      `${this.serverUrl}/api/commands/${commandId}/error`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.clientKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack
        })
      }
    );
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.isConnected = false;
    }
  }
}

// 사용
const agent = new ControlAgent({
  clientId: 'client-001',
  clientKey: process.env.CLIENT_KEY,
  serverUrl: 'http://localhost:3000'
});
```

#### B. 서버 엔드포인트 구현

```typescript
// backend/control/route.ts
import type { Hono } from 'hono';
import { z } from 'zod';
import { respond, success, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';

const CreateCommandSchema = z.object({
  clientId: z.string().uuid(),
  action: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  priority: z.number().int().min(1).max(10).optional()
});

export const registerControlRoutes = (app: Hono<AppEnv>) => {
  // 1. 명령 생성
  app.post('/api/commands', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const userId = c.get('userId');

    const parsed = CreateCommandSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return respond(c, failure(400, 'INVALID_INPUT', 'Invalid command data'));
    }

    const { clientId, action, payload, priority } = parsed.data;

    try {
      // 권한 확인
      const canControl = await checkCommandPermission(supabase, userId, clientId);
      if (!canControl) {
        return respond(c, failure(403, 'FORBIDDEN', 'No permission'));
      }

      // 명령 저장
      const { data: command, error } = await supabase
        .from('commands')
        .insert({
          client_id: clientId,
          action,
          payload,
          priority: priority || 5,
          status: 'pending',
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Redis에 큐 추가
      await redis.rpush(
        `client:${clientId}:queue`,
        command.id
      );

      // SSE로 즉시 푸시
      const eventQueue = activeClients.get(clientId);
      if (eventQueue) {
        eventQueue.push({
          type: 'command',
          payload: command
        });
      }

      // 감사 로그
      await logAudit(supabase, {
        userId,
        action: 'COMMAND_CREATED',
        resourceType: 'command',
        resourceId: command.id,
        changes: { command: parsed.data }
      });

      return respond(c, success(command, 201));
    } catch (error) {
      logger.error('Failed to create command', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 2. 명령 조회
  app.get('/api/commands/:id', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');

    try {
      // Redis 캐시 확인
      const cached = await redis.get(`command:${commandId}:cache`);
      if (cached) {
        return respond(c, success(JSON.parse(cached)));
      }

      // PostgreSQL에서 조회
      const { data: command, error } = await supabase
        .from('commands')
        .select('*')
        .eq('id', commandId)
        .single();

      if (error || !command) {
        return respond(c, failure(404, 'NOT_FOUND'));
      }

      // 캐시에 저장 (5분)
      await redis.setex(
        `command:${commandId}:cache`,
        300,
        JSON.stringify(command)
      );

      return respond(c, success(command));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 3. 상태 업데이트
  app.put('/api/commands/:id/status', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');
    const { status } = await c.req.json();

    const validStatuses = ['pending', 'queued', 'running', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return respond(c, failure(400, 'INVALID_STATUS'));
    }

    try {
      const { data: command, error } = await supabase
        .from('commands')
        .update({
          status,
          ...(status === 'running' && { started_at: new Date() }),
          ...(status === 'completed' && { completed_at: new Date() }),
          updated_at: new Date()
        })
        .eq('id', commandId)
        .select()
        .single();

      if (error) throw error;

      // 캐시 무효화
      await redis.del(`command:${commandId}:cache`);

      // 로그 기록
      await logCommandEvent(supabase, commandId, 'STATUS_CHANGED', {
        from: command.status,
        to: status
      });

      return respond(c, success(command));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 4. 결과 저장
  app.post('/api/commands/:id/result', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');
    const result = await c.req.json();

    try {
      const { error } = await supabase
        .from('commands')
        .update({
          result,
          status: 'completed',
          completed_at: new Date()
        })
        .eq('id', commandId);

      if (error) throw error;

      // 캐시 무효화
      await redis.del(`command:${commandId}:cache`);

      return respond(c, success({ ok: true }));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 5. 클라이언트 목록
  app.get('/api/clients', async (c) => {
    const supabase = getSupabase(c);

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return respond(c, success(clients));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 6. Ping (클라이언트 연결 신호)
  app.post('/api/clients/:id/ping', async (c) => {
    const supabase = getSupabase(c);
    const clientId = c.req.param('id');

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          status: 'online',
          last_seen_at: new Date()
        })
        .eq('id', clientId);

      if (error) throw error;

      // Redis에 활성 클라이언트 등록
      await redis.setex(
        `client:${clientId}:ping`,
        30,  // 30초 TTL
        new Date().toISOString()
      );

      return respond(c, success({ ok: true }));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 7. SSE 스트림
  app.get('/api/events/:clientId', async (c) => {
    const clientId = c.req.param('clientId');
    const logger = getLogger(c);

    // 헤더 설정
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    return c.stream(async (writer) => {
      const eventQueue = new EventQueue();
      activeClients.set(clientId, eventQueue);

      logger.info('SSE client connected', { clientId });

      try {
        // 대기 중인 명령이 있다면 먼저 전송
        const pendingCommands = await redis.lrange(
          `client:${clientId}:queue`,
          0,
          -1
        );

        for (const commandId of pendingCommands) {
          const commandData = await redis.hgetall(`command:${commandId}`);
          if (commandData) {
            await writer.write(
              `event: command\ndata: ${JSON.stringify(commandData)}\n\n`
            );
          }
        }

        // 이후 새로운 명령을 기다림
        while (true) {
          const event = await eventQueue.wait(30000); // 30초 타임아웃

          if (!event) {
            // Keep-alive 메시지
            await writer.write(': heartbeat\n\n');
            continue;
          }

          await writer.write(`event: ${event.type}\n`);
          await writer.write(`data: ${JSON.stringify(event.payload)}\n\n`);
        }
      } catch (error) {
        logger.error('SSE error', error);
      } finally {
        activeClients.delete(clientId);
        logger.info('SSE client disconnected', { clientId });
      }
    });
  });
};
```

#### C. 서비스 레이어

```typescript
// backend/control/service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type Result } from '@/backend/http/response';

export async function checkCommandPermission(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<boolean> {
  // 권한 확인 로직
  const { data, error } = await supabase
    .from('client_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .single();

  return !error && !!data;
}

export async function logAudit(
  supabase: SupabaseClient,
  audit: AuditLog
): Promise<Result<void, Error>> {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: audit.userId,
      action: audit.action,
      resource_type: audit.resourceType,
      resource_id: audit.resourceId,
      changes: audit.changes
    });

  return error ? failure(500, 'AUDIT_ERROR') : success(undefined);
}

export async function logCommandEvent(
  supabase: SupabaseClient,
  commandId: string,
  eventType: string,
  metadata: any
): Promise<Result<void, Error>> {
  const { error } = await supabase
    .from('command_logs')
    .insert({
      command_id: commandId,
      event_type: eventType,
      metadata
    });

  return error ? failure(500, 'LOG_ERROR') : success(undefined);
}

export async function retryFailedCommands(
  supabase: SupabaseClient,
  maxRetries: number = 3
): Promise<void> {
  // 재시도 가능한 명령 조회
  const { data: commands } = await supabase
    .from('commands')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', maxRetries);

  for (const command of commands || []) {
    // 재시도 큐에 추가
    await redis.rpush(
      `client:${command.client_id}:queue`,
      command.id
    );

    // 상태 업데이트
    await supabase
      .from('commands')
      .update({
        status: 'pending',
        retry_count: command.retry_count + 1
      })
      .eq('id', command.id);
  }
}
```

### 2. 고급 패턴: 명령 우선순위 및 재시도

```typescript
// backend/control/advanced/retryManager.ts
export class CommandRetryManager {
  private maxRetries = 3;
  private backoffMs = 5000;

  async enqueueWithRetry(
    commandId: string,
    clientId: string,
    retryCount: number = 0
  ): Promise<void> {
    if (retryCount >= this.maxRetries) {
      // 최대 재시도 초과 - 실패로 처리
      await this.markAsFailed(commandId);
      return;
    }

    // 지수 백오프 계산
    const delayMs = this.backoffMs * Math.pow(2, retryCount);

    // Redis에 스케줄된 작업으로 추가
    await redis.zadd(
      'scheduled_commands',
      Date.now() + delayMs,
      JSON.stringify({
        commandId,
        clientId,
        retryCount: retryCount + 1
      })
    );
  }

  async processScheduledCommands(): Promise<void> {
    // 매 10초마다 실행되는 배경 작업
    const now = Date.now();

    const pendingCommands = await redis.zrangebyscore(
      'scheduled_commands',
      0,
      now
    );

    for (const commandStr of pendingCommands) {
      const { commandId, clientId, retryCount } = JSON.parse(commandStr);

      // Redis 큐에 다시 추가
      await redis.rpush(
        `client:${clientId}:queue`,
        commandId
      );

      // SSE로 푸시
      const eventQueue = activeClients.get(clientId);
      if (eventQueue) {
        eventQueue.push({
          type: 'command',
          payload: { commandId, retry: retryCount }
        });
      }

      // 스케줄된 항목 제거
      await redis.zrem('scheduled_commands', commandStr);
    }
  }

  private async markAsFailed(commandId: string): Promise<void> {
    await supabase
      .from('commands')
      .update({
        status: 'failed',
        error_message: 'Maximum retries exceeded'
      })
      .eq('id', commandId);
  }
}

// 백그라운드 작업으로 등록
setInterval(() => {
  retryManager.processScheduledCommands();
}, 10000);
```

### 3. 상태 모니터링

```typescript
// backend/monitoring/clientStatusManager.ts
export class ClientStatusManager {
  private pingTimeout = 30000; // 30초
  private checkInterval = 5000; // 5초마다 확인

  async startMonitoring(): Promise<void> {
    setInterval(() => {
      this.checkClientHealth();
    }, this.checkInterval);
  }

  private async checkClientHealth(): Promise<void> {
    // 모든 클라이언트 조회
    const { data: clients } = await supabase
      .from('clients')
      .select('*');

    for (const client of clients || []) {
      // Redis에서 마지막 ping 확인
      const lastPing = await redis.get(`client:${client.id}:ping`);

      if (lastPing) {
        // 최근에 ping 받음
        const pingSec = parseInt(lastPing);
        if (client.status !== 'online') {
          await this.updateClientStatus(client.id, 'online');
        }
      } else {
        // Ping 받지 못함
        if (client.status !== 'offline') {
          await this.updateClientStatus(client.id, 'offline');
        }
      }
    }
  }

  private async updateClientStatus(
    clientId: string,
    status: 'online' | 'offline'
  ): Promise<void> {
    await supabase
      .from('clients')
      .update({
        status,
        updated_at: new Date()
      })
      .eq('id', clientId);

    // 상태 변경 이벤트 발행
    await redis.publish('client_status_changed', JSON.stringify({
      clientId,
      status,
      timestamp: new Date().toISOString()
    }));
  }
}
```

---

## 보안 전략

### 1. 인증 및 권한

```typescript
// backend/auth/clientAuth.ts
import { z } from 'zod';

const ClientAuthSchema = z.object({
  clientId: z.string().uuid(),
  clientKey: z.string().min(32)
});

export async function verifyClientAuth(
  c: Context,
  supabase: SupabaseClient
): Promise<Result<Client, Error>> {
  // 1. 헤더에서 인증 정보 추출
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return failure(401, 'UNAUTHORIZED', 'Missing auth header');
  }

  const clientKey = authHeader.slice(7);

  // 2. 클라이언트 확인
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('client_key', clientKey)
    .single();

  if (error || !client) {
    return failure(401, 'UNAUTHORIZED', 'Invalid client key');
  }

  // 3. 클라이언트 활성 상태 확인
  if (client.status === 'disabled') {
    return failure(403, 'FORBIDDEN', 'Client is disabled');
  }

  return success(client);
}

// 미들웨어로 사용
export const clientAuthMiddleware = (app: Hono<AppEnv>) => {
  app.use('/api/*', async (c, next) => {
    const supabase = getSupabase(c);
    const result = await verifyClientAuth(c, supabase);

    if (!result.ok) {
      return respond(c, result);
    }

    c.set('clientId', result.data.id);
    await next();
  });
};
```

### 2. 명령 권한 확인

```typescript
// backend/auth/commandPermission.ts
interface CommandPermission {
  clientId: string;
  allowedActions: string[];
  maxCommandsPerDay: number;
  rateLimit: number; // commands per minute
}

export async function checkCommandPermission(
  supabase: SupabaseClient,
  clientId: string,
  action: string
): Promise<Result<void, Error>> {
  // 1. 클라이언트의 권한 조회
  const { data: permission, error } = await supabase
    .from('client_permissions')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error || !permission) {
    return failure(403, 'FORBIDDEN', 'No permission found');
  }

  // 2. 명령이 허용된 목록에 있는지 확인
  if (!permission.allowed_actions.includes(action)) {
    return failure(403, 'FORBIDDEN', `Action ${action} not allowed`);
  }

  // 3. 일일 한도 확인
  const today = new Date().toDateString();
  const key = `commands:${clientId}:${today}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 86400); // 24시간
  }

  if (count > permission.max_commands_per_day) {
    return failure(429, 'RATE_LIMIT', 'Daily limit exceeded');
  }

  // 4. 분당 레이트 리밋 확인
  const minuteKey = `ratelimit:${clientId}:${Date.now() / 60000}`;
  const minuteCount = await redis.incr(minuteKey);

  if (minuteCount === 1) {
    await redis.expire(minuteKey, 60);
  }

  if (minuteCount > permission.rate_limit) {
    return failure(429, 'RATE_LIMIT', 'Rate limit exceeded');
  }

  return success(undefined);
}
```

### 3. 감사 로깅

```typescript
// backend/audit/auditLogger.ts
export class AuditLogger {
  async logCommandExecution(
    supabase: SupabaseClient,
    clientId: string,
    commandId: string,
    action: string,
    result: 'success' | 'failure',
    details: any
  ): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        client_id: clientId,
        command_id: commandId,
        action,
        result,
        details,
        ip_address: null, // 필요시 클라이언트 IP
        timestamp: new Date()
      });

    if (error) {
      console.error('Audit logging failed:', error);
    }
  }

  async logSecurityEvent(
    supabase: SupabaseClient,
    eventType: string,
    severity: 'info' | 'warning' | 'critical',
    details: any
  ): Promise<void> {
    const { error } = await supabase
      .from('security_events')
      .insert({
        event_type: eventType,
        severity,
        details,
        timestamp: new Date()
      });

    if (error) {
      console.error('Security event logging failed:', error);
    }
  }
}

// 사용 예
const auditLogger = new AuditLogger();

// 의심스러운 활동 감지
if (commandCount > permission.max_commands_per_day * 1.5) {
  await auditLogger.logSecurityEvent(
    supabase,
    'SUSPICIOUS_ACTIVITY',
    'warning',
    {
      clientId,
      reason: 'Exceeds daily command quota by 50%'
    }
  );
}
```

---

## 배포 및 모니터링

### 1. Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Redis 헬스 체크
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD npm run health || exit 1

EXPOSE 3000

CMD ["npm", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/control_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=control_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

### 2. 모니터링 및 메트릭

```typescript
// backend/monitoring/metrics.ts
import { register, Counter, Gauge, Histogram } from 'prom-client';

export const metrics = {
  // 명령 메트릭
  commandsCreated: new Counter({
    name: 'commands_created_total',
    help: 'Total commands created'
  }),

  commandsCompleted: new Counter({
    name: 'commands_completed_total',
    help: 'Total commands completed',
    labelNames: ['status']
  }),

  commandDuration: new Histogram({
    name: 'command_duration_seconds',
    help: 'Command execution duration in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // 클라이언트 메트릭
  activeClients: new Gauge({
    name: 'active_clients',
    help: 'Number of active clients'
  }),

  clientCommandsQueue: new Gauge({
    name: 'client_commands_queue',
    help: 'Commands in queue per client',
    labelNames: ['clientId']
  }),

  // 시스템 메트릭
  redisConnectionErrors: new Counter({
    name: 'redis_connection_errors_total',
    help: 'Redis connection errors'
  })
};

// 메트릭 수집 엔드포인트
export const registerMetricsRoute = (app: Hono) => {
  app.get('/metrics', async (c) => {
    c.header('Content-Type', register.contentType);
    return c.text(await register.metrics());
  });
};
```

### 3. 헬스 체크

```typescript
// backend/health/route.ts
export const registerHealthRoutes = (app: Hono<AppEnv>) => {
  app.get('/health', async (c) => {
    const checks = {
      redis: await checkRedisHealth(),
      database: await checkDatabaseHealth(),
      timestamp: new Date().toISOString()
    };

    const allHealthy = Object.values(checks).every(
      check => check === true || check.ok === true
    );

    return c.json(checks, allHealthy ? 200 : 503);
  });

  app.get('/health/ready', async (c) => {
    // readiness check - 트래픽을 받을 준비가 되었는가?
    try {
      await redis.ping();
      const supabase = getSupabase(c);
      await supabase.from('clients').select('id').limit(1);
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false }, 503);
    }
  });
};

async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('clients').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
```

---

## 실제 사례

### Case 1: 인쇄 현장 자동 제어 시스템

#### 요구사항

```
- 인쇄 작업이 할당되면 해당 프린터로 PDF 전송
- 프린터 상태 실시간 모니터링
- 종이 부족, 토너 부족 알림
- 인쇄 완료 확인
```

#### 구현 아키텍처

```
┌─────────────────┐
│  주문 관리 시스템 │
└────────┬────────┘
         │ (작업 할당)
         ▼
┌─────────────────────────────────────┐
│      명령 서버 (Hono.js)             │
│  POST /api/commands                 │
│  { action: 'print', printer: 'P001' }│
└────────┬────────────────────────────┘
         │ (SSE 푸시)
         ▼
┌─────────────────┐
│  프린터 에이전트   │
│  (Windows .NET) │
│  - PDF 인쇄      │
│  - 상태 모니터링  │
└─────────────────┘
```

#### 클라이언트 구현 (프린터 에이전트)

```csharp
// PrinterAgent.cs
public class PrinterAgent
{
    private readonly string _clientKey;
    private readonly string _serverUrl;
    private EventSource _eventSource;

    public async Task StartAsync()
    {
        while (true)
        {
            try
            {
                await ConnectAsync();
            }
            catch (Exception ex)
            {
                Logger.Error("Connection error", ex);
                await Task.Delay(5000);
            }
        }
    }

    private async Task ConnectAsync()
    {
        var uri = new Uri($"{_serverUrl}/api/events/{Environment.MachineName}");

        using (var httpClient = new HttpClient())
        {
            httpClient.DefaultRequestHeaders.Add(
                "Authorization",
                $"Bearer {_clientKey}"
            );

            using (var response = await httpClient.GetAsync(
                uri,
                HttpCompletionOption.ResponseHeadersRead
            ))
            {
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var reader = new StreamReader(stream))
                {
                    string line;
                    while ((line = await reader.ReadLineAsync()) != null)
                    {
                        if (line.StartsWith("data:"))
                        {
                            var json = line.Substring(5);
                            var command = JsonConvert.DeserializeObject<Command>(json);

                            _ = HandleCommandAsync(command);
                        }
                    }
                }
            }
        }
    }

    private async Task HandleCommandAsync(Command command)
    {
        try
        {
            await NotifyStatusAsync(command.Id, "running");

            switch (command.Action)
            {
                case "print":
                    await HandlePrintAsync(command.Payload);
                    break;
                case "status":
                    await HandleStatusAsync(command.Payload);
                    break;
            }

            await NotifyStatusAsync(command.Id, "completed");
        }
        catch (Exception ex)
        {
            Logger.Error("Command error", ex);
            await NotifyErrorAsync(command.Id, ex.Message);
        }
    }

    private async Task HandlePrintAsync(JObject payload)
    {
        var pdfUrl = payload["pdfUrl"].ToString();
        var printerName = payload["printer"].ToString();

        // PDF 다운로드
        var pdfPath = await DownloadPdfAsync(pdfUrl);

        // 인쇄
        using (var printDocument = new PrintDocument())
        {
            printDocument.PrinterSettings.PrinterName = printerName;
            printDocument.Print();
        }

        // 모니터링
        while (true)
        {
            var status = GetPrinterStatus(printerName);

            if (status == PrinterStatus.Idle)
            {
                break;
            }

            await Task.Delay(1000);
        }
    }
}
```

#### 서버 엔드포인트

```typescript
// features/print/backend/route.ts
export const registerPrintRoutes = (app: Hono<AppEnv>) => {
  // 인쇄 작업 생성
  app.post('/api/print/jobs', async (c) => {
    const { printerId, pdfUrl, copies } = await c.req.json();
    const supabase = getSupabase(c);

    const command = {
      clientId: printerId,
      action: 'print',
      payload: {
        pdfUrl,
        copies,
        options: { duplex: true }
      }
    };

    // 명령 생성 (위에서 정의한 패턴 사용)
    const { data: created } = await supabase
      .from('commands')
      .insert({
        ...command,
        status: 'pending'
      })
      .select()
      .single();

    return c.json(created, 201);
  });

  // 프린터 상태 조회
  app.get('/api/printers/:id/status', async (c) => {
    const printerId = c.req.param('id');
    const supabase = getSupabase(c);

    // 최근 명령의 결과 조회
    const { data: command } = await supabase
      .from('commands')
      .select('*')
      .eq('client_id', printerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return c.json({
      printerId,
      status: command?.status,
      lastCommand: command?.action,
      completedAt: command?.completed_at
    });
  });
};
```

### Case 2: 창고 관리 시스템 (WMS)

#### 요구사항

```
- 픽킹 지시서를 PDA로 전송
- 바코드 스캔 결과 서버로 전송
- 실시간 진행상황 추적
- 대량의 동시 지시 (100+)
```

#### 아키텍처

```
┌──────────────────────┐
│   주문/재고 관리시스템 │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│    명령 서버                   │
│ - 우선순위 큐                  │
│ - 지역별 라우팅                │
│ - 진행상황 대시보드            │
└──┬──────────────────────────┘
   │
   ├─ PDA 1 (구역 A)
   ├─ PDA 2 (구역 B)
   ├─ PDA 3 (구역 C)
   └─ ...

데이터 플로우:
1. 주문 생성 → 작업 분배
2. PDA 큐에 작업 할당
3. PDA 수령 확인
4. 픽킹 수행
5. 바코드 스캔 (서버 검증)
6. 완료 확인
7. 다음 작업 할당
```

#### 고급 라우팅 로직

```typescript
// backend/wms/routing.ts
import type { Command } from '@/types';

interface PickTask {
  taskId: string;
  items: { sku: string; location: string; quantity: number }[];
  zone: 'A' | 'B' | 'C' | 'D';
  priority: number;
}

export class WMSRouter {
  async routePickTaskToOptimalAgent(
    task: PickTask,
    agents: Agent[]
  ): Promise<string> {
    // 1. 같은 존에 있는 에이전트 필터링
    const zoneAgents = agents.filter(a => a.zone === task.zone);

    if (zoneAgents.length === 0) {
      throw new Error(`No agents available in zone ${task.zone}`);
    }

    // 2. 현재 작업 부하가 적은 에이전트 선택
    const agentLoads = await Promise.all(
      zoneAgents.map(async (agent) => ({
        agent,
        queueLength: await this.getQueueLength(agent.id),
        estimatedCompletion: await this.getEstimatedCompletion(agent.id)
      }))
    );

    // 3. 예상 완료 시간이 가장 짧은 에이전트 선택
    const optimalAgent = agentLoads.reduce((best, current) =>
      current.estimatedCompletion < best.estimatedCompletion ? current : best
    ).agent;

    return optimalAgent.id;
  }

  async createBulkPickTasks(
    orders: Order[],
    agents: Agent[]
  ): Promise<void> {
    const tasks = this.generatePickTasks(orders);

    for (const task of tasks) {
      const targetAgent = await this.routePickTaskToOptimalAgent(task, agents);

      const command: Command = {
        clientId: targetAgent,
        action: 'pick',
        payload: {
          taskId: task.taskId,
          items: task.items,
          priority: task.priority
        },
        priority: task.priority
      };

      await this.enqueueCommand(command);
    }
  }

  private generatePickTasks(orders: Order[]): PickTask[] {
    // 주문을 픽 작업으로 변환
    return orders.flatMap(order =>
      order.items.map(item => ({
        taskId: generateId(),
        items: [item],
        zone: this.getZoneByLocation(item.location),
        priority: order.priority
      }))
    );
  }

  private getZoneByLocation(location: string): 'A' | 'B' | 'C' | 'D' {
    // 로케이션 코드로부터 존 결정
    return location.charAt(0) as any;
  }

  private async getQueueLength(agentId: string): Promise<number> {
    return await redis.llen(`client:${agentId}:queue`);
  }

  private async getEstimatedCompletion(agentId: string): Promise<number> {
    // 예상 완료 시간 계산
    const queueLength = await this.getQueueLength(agentId);
    const avgTimePerTask = 300; // 5분

    return Date.now() + (queueLength * avgTimePerTask * 1000);
  }

  private async enqueueCommand(command: Command): Promise<void> {
    // 우선순위에 따라 큐에 삽입
    await redis.zadd(
      `client:${command.clientId}:priority_queue`,
      command.priority,
      JSON.stringify(command)
    );
  }
}
```

---

## 요약 및 권장사항

### 기술 선택 로드맵

```
Phase 1 (MVP, < 50 클라이언트):
├─ 양방향: SSE + HTTP POST
├─ 저장소: Redis만 사용
├─ 복잡도: 최소
└─ 개발 시간: 1-2주

Phase 2 (확장, 50-500 클라이언트):
├─ 양방향: WebSocket (별도 서버)
├─ 저장소: PostgreSQL + Redis
├─ 추가: 기본 인증, 감사 로그
└─ 개발 시간: 2-3주

Phase 3 (대규모, 500+ 클라이언트):
├─ 양방향: WebSocket + 로드 밸런싱
├─ 메시지: Redis Streams 또는 RabbitMQ
├─ 추가: RBAC, 상세 모니터링
└─ 개발 시간: 3-4주
```

### 성능 최적화 팁

```
1. 연결 최소화
   - SSE/WebSocket 연결은 오래 유지
   - HTTP 폴링은 피하기

2. 메시지 직렬화
   - JSON은 간단하지만 무거움
   - 필요시 MessagePack이나 Protocol Buffers 고려

3. 메모리 관리
   - Redis 메모리 한계 설정 (maxmemory)
   - 오래된 명령 자동 정리 (TTL)

4. 확장성
   - 로드 밸런서 앞에 API 배치
   - WebSocket용 sticky session
   - Redis 클러스터링 (대규모)
```

### 보안 체크리스트

```
□ 모든 통신 HTTPS/WSS
□ 클라이언트 인증 (토큰 기반)
□ 명령 권한 확인
□ Rate limiting 구현
□ 감사 로깅 활성화
□ 민감한 데이터 암호화
□ 정기적 보안 감사
□ 침투 테스트 수행
```

이 문서를 통해 분산 제어 시스템의 백엔드 아키텍처를 구축할 수 있습니다. 구체적인 구현은 귀사의 규모와 요구사항에 맞게 조정하세요.
