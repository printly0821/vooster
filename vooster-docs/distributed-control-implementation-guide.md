# 분산 제어 시스템 실제 구현 가이드

이 문서는 분산 제어 시스템을 실제로 구현할 때 필요한 단계별 가이드를 제공합니다.

---

## 1단계: 프로젝트 초기 설정

### 필요한 패키지 설치

```bash
# 기존 Next.js 프로젝트에 패키지 추가
npm install --save \
  ioredis \
  zod \
  @hono/hono \
  date-fns \
  tsx

# 개발 의존성
npm install --save-dev \
  @types/node \
  @types/ioredis
```

### 환경 변수 설정

```bash
# .env.local
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/control_system
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Client Configuration
CLIENT_KEY_PREFIX=sk_

# Security
JWT_SECRET=your_jwt_secret_key_here
MAX_COMMANDS_PER_DAY=1000
```

---

## 2단계: 데이터베이스 초기화

### Supabase 마이그레이션 파일 생성

```sql
-- supabase/migrations/20250101_init_control_system.sql

-- 1. 클라이언트 테이블
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_key TEXT NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'disabled')),
  zone VARCHAR(10),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_client_key ON clients(client_key);

-- 2. 명령 테이블
CREATE TABLE public.commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed')),
  priority INT DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_by UUID REFERENCES auth.users(id),
  estimated_duration_seconds INT,
  tags TEXT[]
);

CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_client_status ON commands(client_id, status);
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
CREATE INDEX idx_commands_priority ON commands(priority DESC);

-- 3. 명령 로그
CREATE TABLE public.command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES commands(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_command_logs_command_id ON command_logs(command_id);
CREATE INDEX idx_command_logs_created_at ON command_logs(created_at DESC);

-- 4. 감사 로그
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES clients(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. 클라이언트 권한
CREATE TABLE public.client_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  allowed_actions TEXT[] NOT NULL,
  max_commands_per_day INT DEFAULT 1000,
  rate_limit INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- 6. 클라이언트 상태 히스토리
CREATE TABLE public.client_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_status_history_client ON client_status_history(client_id);
CREATE INDEX idx_client_status_history_created ON client_status_history(created_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 기본 정책 (인증된 사용자만 접근)
CREATE POLICY "authenticated_can_read_commands" ON commands
  FOR SELECT USING (auth.role() = 'authenticated_user');

CREATE POLICY "authenticated_can_create_commands" ON commands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "authenticated_can_update_commands" ON commands
  FOR UPDATE USING (auth.role() = 'authenticated_user');
```

### Supabase 마이그레이션 실행

```bash
# Supabase CLI를 통해 마이그레이션 적용
npx supabase migration up
```

---

## 3단계: 백엔드 구조 구성

### 디렉토리 구조 생성

```
src/
├── features/
│   ├── control/
│   │   ├── backend/
│   │   │   ├── route.ts          # 명령 API 엔드포인트
│   │   │   ├── schema.ts         # Zod 검증 스키마
│   │   │   ├── service.ts        # 비즈니스 로직
│   │   │   ├── error.ts          # 에러 정의
│   │   │   └── auth.ts           # 클라이언트 인증
│   │   ├── components/           # 프론트엔드 컴포넌트
│   │   ├── hooks/
│   │   │   ├── useCommandQuery.ts
│   │   │   └── useClientStatus.ts
│   │   ├── lib/
│   │   │   ├── dto.ts
│   │   │   └── constants.ts
│   │   └── types.ts
│   └── monitoring/
│       ├── backend/
│       │   ├── route.ts          # 모니터링 API
│       │   └── service.ts
│       └── components/           # 대시보드 컴포넌트
├── backend/
│   ├── hono/
│   │   └── context.ts            # Hono 컨텍스트
│   ├── redis/
│   │   ├── client.ts             # Redis 클라이언트
│   │   └── manager.ts            # 상태 관리
│   ├── auth/
│   │   ├── clientAuth.ts         # 클라이언트 인증
│   │   └── permission.ts         # 권한 관리
│   ├── worker/
│   │   ├── retryManager.ts       # 재시도 관리
│   │   ├── statusMonitor.ts      # 상태 모니터링
│   │   └── scheduler.ts          # 스케줄 작업
│   ├── http/
│   │   └── response.ts           # HTTP 응답 유틸
│   └── supabase/
│       └── client.ts             # Supabase 클라이언트
└── lib/
    ├── remote/
    │   └── api-client.ts         # API 클라이언트
    └── supabase/
        ├── client.ts
        └── server.ts
```

---

## 4단계: Redis 관리자 구현

### Redis 클라이언트 설정

```typescript
// src/backend/redis/client.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected');
});
```

### Redis 매니저

```typescript
// src/backend/redis/manager.ts
import { redis } from './client';

export class RedisManager {
  private PREFIX = 'control_system:';

  // 클라이언트 상태 관리
  async setClientOnline(clientId: string): Promise<void> {
    const key = `${this.PREFIX}client:${clientId}:status`;
    await redis.setex(key, 300, 'online'); // 5분 TTL
  }

  async getClientStatus(clientId: string): Promise<string | null> {
    const key = `${this.PREFIX}client:${clientId}:status`;
    return await redis.get(key);
  }

  // 명령 큐 관리
  async enqueueCommand(
    clientId: string,
    commandId: string,
    commandData: any
  ): Promise<void> {
    const queueKey = `${this.PREFIX}client:${clientId}:queue`;
    const dataKey = `${this.PREFIX}command:${commandId}`;

    // 명령 데이터 저장
    await redis.hset(dataKey, JSON.stringify(commandData));
    await redis.expire(dataKey, 86400); // 24시간 TTL

    // 큐에 추가
    await redis.rpush(queueKey, commandId);
  }

  async dequeueCommand(clientId: string): Promise<string | null> {
    const queueKey = `${this.PREFIX}client:${clientId}:queue`;
    return await redis.lpop(queueKey);
  }

  async getCommandData(commandId: string): Promise<any | null> {
    const key = `${this.PREFIX}command:${commandId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 활성 클라이언트 관리
  async registerActiveClient(
    clientId: string,
    socketId: string
  ): Promise<void> {
    const key = `${this.PREFIX}active_clients`;
    await redis.hset(key, clientId, socketId);
  }

  async unregisterActiveClient(clientId: string): Promise<void> {
    const key = `${this.PREFIX}active_clients`;
    await redis.hdel(key, clientId);
  }

  async getActiveClients(): Promise<Record<string, string>> {
    const key = `${this.PREFIX}active_clients`;
    return await redis.hgetall(key);
  }

  // 세션 관리
  async createSession(
    sessionId: string,
    userId: string,
    expiresIn: number = 3600
  ): Promise<void> {
    const key = `${this.PREFIX}session:${sessionId}`;
    await redis.setex(key, expiresIn, userId);
  }

  async getSession(sessionId: string): Promise<string | null> {
    const key = `${this.PREFIX}session:${sessionId}`;
    return await redis.get(key);
  }

  // 레이트 리밋 확인
  async checkRateLimit(
    clientId: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    const key = `${this.PREFIX}ratelimit:${clientId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    return current <= limit;
  }

  // 캐시 관리
  async cacheData(
    key: string,
    data: any,
    expiresIn: number = 300
  ): Promise<void> {
    const cacheKey = `${this.PREFIX}cache:${key}`;
    await redis.setex(cacheKey, expiresIn, JSON.stringify(data));
  }

  async getCachedData(key: string): Promise<any | null> {
    const cacheKey = `${this.PREFIX}cache:${key}`;
    const data = await redis.get(cacheKey);
    return data ? JSON.parse(data) : null;
  }

  async invalidateCache(key: string): Promise<void> {
    const cacheKey = `${this.PREFIX}cache:${key}`;
    await redis.del(cacheKey);
  }
}

export const redisManager = new RedisManager();
```

---

## 5단계: 인증 및 권한 시스템

### 클라이언트 인증

```typescript
// src/backend/auth/clientAuth.ts
import { z } from 'zod';
import { Context } from 'hono';
import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type Result } from '@/backend/http/response';
import { redisManager } from '@/backend/redis/manager';

export interface AuthenticatedClient {
  id: string;
  name: string;
  status: string;
  zone?: string;
}

export async function authenticateClient(
  c: Context,
  supabase: SupabaseClient
): Promise<Result<AuthenticatedClient, { code: string; message: string }>> {
  try {
    // 1. Bearer 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return failure(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
    }

    const clientKey = authHeader.slice(7);

    // 2. Redis 캐시에서 먼저 확인
    const cached = await redisManager.getCachedData(`client:${clientKey}`);
    if (cached) {
      return success(cached);
    }

    // 3. 데이터베이스에서 클라이언트 조회
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, status, zone')
      .eq('client_key', clientKey)
      .single();

    if (error || !client) {
      return failure(401, 'UNAUTHORIZED', 'Invalid client key');
    }

    // 4. 클라이언트 상태 확인
    if (client.status === 'disabled') {
      return failure(403, 'FORBIDDEN', 'Client is disabled');
    }

    // 5. Redis에 캐시
    await redisManager.cacheData(`client:${clientKey}`, client, 3600);

    return success(client as AuthenticatedClient);
  } catch (error) {
    console.error('Authentication error:', error);
    return failure(500, 'INTERNAL_ERROR', 'Authentication failed');
  }
}

export async function verifyClientPermission(
  supabase: SupabaseClient,
  clientId: string,
  action: string
): Promise<Result<void, { code: string; message: string }>> {
  try {
    // 권한 정보 조회
    const { data: permission, error } = await supabase
      .from('client_permissions')
      .select('allowed_actions')
      .eq('client_id', clientId)
      .single();

    if (error || !permission) {
      return failure(403, 'FORBIDDEN', 'No permission record found');
    }

    // 명령이 허용된 목록에 있는지 확인
    if (!permission.allowed_actions.includes(action)) {
      return failure(403, 'FORBIDDEN', `Action '${action}' not allowed`);
    }

    return success(undefined);
  } catch (error) {
    console.error('Permission verification error:', error);
    return failure(500, 'INTERNAL_ERROR', 'Permission verification failed');
  }
}

export function createClientMiddleware(
  authenticateClient: (c: Context, supabase: SupabaseClient) => Promise<Result<AuthenticatedClient>>
) {
  return async (c: Context, next: () => Promise<void>) => {
    const supabase = getSupabase(c);
    const result = await authenticateClient(c, supabase);

    if (!result.ok) {
      return respond(c, result);
    }

    c.set('clientId', result.data.id);
    c.set('client', result.data);

    await next();
  };
}
```

### Zod 검증 스키마

```typescript
// src/features/control/backend/schema.ts
import { z } from 'zod';

export const CreateCommandSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  action: z.string()
    .min(1, 'Action cannot be empty')
    .max(100, 'Action name too long'),
  payload: z.record(z.unknown()).optional(),
  priority: z.number()
    .int('Priority must be integer')
    .min(1, 'Priority minimum is 1')
    .max(10, 'Priority maximum is 10')
    .default(5),
  estimatedDuration: z.number()
    .int()
    .positive('Duration must be positive')
    .optional(),
  tags: z.array(z.string()).optional()
});

export const UpdateCommandStatusSchema = z.object({
  status: z.enum([
    'pending',
    'queued',
    'running',
    'completed',
    'failed'
  ] as const),
  message: z.string().optional()
});

export const CommandResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  message: z.string().optional(),
  duration: z.number().optional()
});

export type CreateCommandInput = z.infer<typeof CreateCommandSchema>;
export type UpdateCommandStatusInput = z.infer<typeof UpdateCommandStatusSchema>;
export type CommandResult = z.infer<typeof CommandResultSchema>;
```

---

## 6단계: API 엔드포인트 구현

### 명령 API

```typescript
// src/features/control/backend/route.ts
import type { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '@/backend/hono/context';
import { respond, success, failure } from '@/backend/http/response';
import { getSupabase, getLogger } from '@/backend/hono/context';
import { authenticateClient, verifyClientPermission } from '@/backend/auth/clientAuth';
import { CreateCommandSchema, UpdateCommandStatusSchema, CommandResultSchema } from './schema';
import { redisManager } from '@/backend/redis/manager';

export const registerControlRoutes = (app: Hono<AppEnv>) => {
  // 1. 명령 생성
  app.post('/api/commands', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const userId = c.get('userId');

    try {
      const body = await c.req.json();
      const parsed = CreateCommandSchema.safeParse(body);

      if (!parsed.success) {
        const errors = parsed.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return respond(c, failure(400, 'VALIDATION_ERROR', JSON.stringify(errors)));
      }

      const { clientId, action, payload, priority, estimatedDuration, tags } = parsed.data;

      // 권한 확인
      const permResult = await verifyClientPermission(supabase, clientId, action);
      if (!permResult.ok) {
        logger.warn('Permission denied', { clientId, action, userId });
        return respond(c, permResult);
      }

      // 레이트 리밋 확인
      const isAllowed = await redisManager.checkRateLimit(clientId, 100, 60);
      if (!isAllowed) {
        return respond(c, failure(429, 'RATE_LIMIT', 'Too many commands'));
      }

      // 명령 저장
      const { data: command, error } = await supabase
        .from('commands')
        .insert({
          client_id: clientId,
          action,
          payload: payload || {},
          priority,
          status: 'pending',
          created_by: userId,
          estimated_duration_seconds: estimatedDuration,
          tags: tags || []
        })
        .select()
        .single();

      if (error) throw error;

      // Redis 큐에 추가
      await redisManager.enqueueCommand(clientId, command.id, command);

      // 감사 로깅
      await logAudit(supabase, {
        userId,
        clientId,
        action: 'COMMAND_CREATED',
        resourceId: command.id,
        changes: { command }
      });

      logger.info('Command created', { commandId: command.id, clientId });
      return respond(c, success(command, 201));
    } catch (error) {
      logger.error('Failed to create command', error);
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Failed to create command'));
    }
  });

  // 2. 명령 조회
  app.get('/api/commands/:id', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');
    const logger = getLogger(c);

    try {
      // Redis 캐시 확인
      const cached = await redisManager.getCachedData(`command:${commandId}`);
      if (cached) {
        return respond(c, success(cached));
      }

      // PostgreSQL에서 조회
      const { data: command, error } = await supabase
        .from('commands')
        .select('*')
        .eq('id', commandId)
        .single();

      if (error || !command) {
        return respond(c, failure(404, 'NOT_FOUND', 'Command not found'));
      }

      // 캐시 저장
      await redisManager.cacheData(`command:${commandId}`, command, 300);

      return respond(c, success(command));
    } catch (error) {
      logger.error('Failed to fetch command', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 3. 명령 상태 업데이트
  app.put('/api/commands/:id/status', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');
    const logger = getLogger(c);

    try {
      const body = await c.req.json();
      const parsed = UpdateCommandStatusSchema.safeParse(body);

      if (!parsed.success) {
        return respond(c, failure(400, 'VALIDATION_ERROR'));
      }

      const { status, message } = parsed.data;

      // 명령 업데이트
      const { data: command, error } = await supabase
        .from('commands')
        .update({
          status,
          ...(status === 'running' && { started_at: new Date() }),
          ...(status === 'completed' || status === 'failed') && {
            completed_at: new Date()
          },
          updated_at: new Date()
        })
        .eq('id', commandId)
        .select()
        .single();

      if (error) throw error;

      // 캐시 무효화
      await redisManager.invalidateCache(`command:${commandId}`);

      // 로그 기록
      await logCommandEvent(supabase, commandId, 'STATUS_CHANGED', {
        newStatus: status,
        message
      });

      logger.info('Command status updated', { commandId, status });
      return respond(c, success(command));
    } catch (error) {
      logger.error('Failed to update command status', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 4. 결과 저장
  app.post('/api/commands/:id/result', async (c) => {
    const supabase = getSupabase(c);
    const commandId = c.req.param('id');
    const logger = getLogger(c);

    try {
      const body = await c.req.json();
      const parsed = CommandResultSchema.safeParse(body);

      if (!parsed.success) {
        return respond(c, failure(400, 'VALIDATION_ERROR'));
      }

      const result = parsed.data;

      // 명령 결과 저장
      const { error } = await supabase
        .from('commands')
        .update({
          result,
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', commandId);

      if (error) throw error;

      // 캐시 무효화
      await redisManager.invalidateCache(`command:${commandId}`);

      // 이벤트 기록
      await logCommandEvent(supabase, commandId, 'RESULT_RECEIVED', result);

      logger.info('Command result saved', {
        commandId,
        success: result.success
      });

      return respond(c, success({ ok: true }));
    } catch (error) {
      logger.error('Failed to save command result', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 5. 클라이언트 목록
  app.get('/api/clients', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, status, zone, last_seen_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return respond(c, success(clients));
    } catch (error) {
      logger.error('Failed to fetch clients', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 6. Ping 엔드포인트
  app.post('/api/clients/:id/ping', async (c) => {
    const supabase = getSupabase(c);
    const clientId = c.req.param('id');
    const logger = getLogger(c);

    try {
      // Redis에 클라이언트 온라인 상태 기록
      await redisManager.setClientOnline(clientId);

      // 데이터베이스 업데이트
      const { error } = await supabase
        .from('clients')
        .update({
          status: 'online',
          last_seen_at: new Date()
        })
        .eq('id', clientId);

      if (error) throw error;

      logger.debug('Client ping received', { clientId });
      return respond(c, success({ ok: true }));
    } catch (error) {
      logger.error('Failed to process ping', error);
      return respond(c, failure(500, 'INTERNAL_ERROR'));
    }
  });

  // 7. SSE 스트림
  app.get('/api/events/:clientId', async (c) => {
    const clientId = c.req.param('clientId');
    const logger = getLogger(c);

    // SSE 헤더 설정
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('X-Accel-Buffering', 'no');

    logger.info('SSE connection opened', { clientId });

    return c.stream(async (writer) => {
      try {
        let lastEventId = 0;

        // 이미 대기 중인 명령이 있다면 먼저 전송
        const queuedCommand = await redisManager.dequeueCommand(clientId);
        if (queuedCommand) {
          const commandData = await redisManager.getCommandData(queuedCommand);
          if (commandData) {
            await writer.write(
              `id: ${lastEventId++}\nevent: command\ndata: ${JSON.stringify(commandData)}\n\n`
            );
          }
        }

        // Keep-alive 타이머
        let heartbeatCount = 0;
        const heartbeatInterval = setInterval(async () => {
          try {
            await writer.write(`:  heartbeat ${heartbeatCount++}\n\n`);
          } catch (error) {
            clearInterval(heartbeatInterval);
            logger.info('SSE connection closed', { clientId });
          }
        }, 30000);

        // 닫혀질 때까지 계속 듣기
        while (true) {
          const nextCommand = await redisManager.dequeueCommand(clientId);

          if (nextCommand) {
            const commandData = await redisManager.getCommandData(nextCommand);
            if (commandData) {
              await writer.write(
                `id: ${lastEventId++}\nevent: command\ndata: ${JSON.stringify(commandData)}\n\n`
              );
            }
          }

          // 1초마다 확인
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        logger.error('SSE error', error);
      }
    });
  });
};

// 헬퍼 함수들
async function logAudit(
  supabase: SupabaseClient,
  audit: {
    userId?: string;
    clientId: string;
    action: string;
    resourceId?: string;
    changes: any;
  }
) {
  await supabase.from('audit_logs').insert({
    user_id: audit.userId,
    client_id: audit.clientId,
    action: audit.action,
    resource_id: audit.resourceId,
    changes: audit.changes
  });
}

async function logCommandEvent(
  supabase: SupabaseClient,
  commandId: string,
  eventType: string,
  metadata: any
) {
  await supabase.from('command_logs').insert({
    command_id: commandId,
    event_type: eventType,
    metadata
  });
}
```

---

## 7단계: 클라이언트 에이전트 구현

### TypeScript 클라이언트

```typescript
// client-agent.ts (Node.js 환경)
import axios, { AxiosInstance } from 'axios';

interface AgentConfig {
  clientId: string;
  clientKey: string;
  serverUrl: string;
  maxRetries?: number;
  backoffMs?: number;
}

interface Command {
  id: string;
  action: string;
  payload: any;
}

interface CommandResult {
  success: boolean;
  data?: any;
  message?: string;
  duration?: number;
}

class ControlAgent {
  private config: AgentConfig;
  private client: AxiosInstance;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: AgentConfig) {
    this.config = {
      maxRetries: 3,
      backoffMs: 5000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.serverUrl,
      headers: {
        'Authorization': `Bearer ${this.config.clientKey}`,
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          console.error('Unauthorized: Invalid client key');
        }
        return Promise.reject(error);
      }
    );
  }

  async start(): Promise<void> {
    console.log('Control Agent starting...');

    // 백그라운드 작업 시작
    this.startHeartbeat();
    await this.connect();
  }

  private async connect(): Promise<void> {
    while (!this.isConnected) {
      try {
        console.log('Connecting to server...');

        // 초기 핑으로 연결 확인
        await this.ping();

        // SSE 연결 시작
        await this.connectSSE();
        this.isConnected = true;
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('Connection failed:', error);

        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          throw new Error('Max reconnection attempts exceeded');
        }

        const delay = Math.min(
          this.config.backoffMs! * Math.pow(2, this.reconnectAttempts),
          30000
        );

        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async connectSSE(): Promise<void> {
    const eventSource = new EventSource(
      `${this.config.serverUrl}/api/events/${this.config.clientId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.clientKey}`
        }
      } as any
    );

    eventSource.addEventListener('command', (event: Event) => {
      const messageEvent = event as MessageEvent;
      try {
        const command = JSON.parse(messageEvent.data);
        this.handleCommand(command);
      } catch (error) {
        console.error('Failed to parse command:', error);
      }
    });

    eventSource.addEventListener('error', () => {
      console.error('SSE connection error');
      this.isConnected = false;
      eventSource.close();
      this.connect();
    });

    return new Promise(() => {}); // 계속 실행
  }

  private async handleCommand(command: Command): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Executing command: ${command.action} (${command.id})`);

      // 실행 시작 알림
      await this.updateStatus(command.id, 'running');

      // 명령 실행
      const result = await this.executeCommand(command);

      // 실행 완료
      const duration = (Date.now() - startTime) / 1000;
      await this.reportResult(command.id, {
        success: true,
        ...result,
        duration
      });

      console.log(`Command completed: ${command.id}`);
    } catch (error) {
      console.error(`Command failed: ${command.id}`, error);
      await this.reportError(command.id, error);
    }
  }

  private async executeCommand(command: Command): Promise<any> {
    switch (command.action) {
      case 'print':
        return await this.handlePrintCommand(command.payload);
      case 'screenshot':
        return await this.handleScreenshotCommand(command.payload);
      case 'shutdown':
        return await this.handleShutdownCommand(command.payload);
      default:
        throw new Error(`Unknown command: ${command.action}`);
    }
  }

  private async handlePrintCommand(payload: any): Promise<any> {
    const { filePath, printerName, options } = payload;
    console.log(`Printing ${filePath} to ${printerName}`);

    // 실제 인쇄 로직 구현
    // (플랫폼별로 다름: Windows - WinSpoolAPI, macOS - lp 명령어, Linux - lpr)

    return {
      data: {
        jobId: `job_${Date.now()}`,
        printer: printerName
      },
      message: 'Print job submitted'
    };
  }

  private async handleScreenshotCommand(payload: any): Promise<any> {
    console.log('Taking screenshot...');

    // 스크린샷 로직
    // 실제 구현은 플랫폼별로 다름

    return {
      data: {
        imagePath: '/tmp/screenshot.png',
        timestamp: new Date().toISOString()
      }
    };
  }

  private async handleShutdownCommand(payload: any): Promise<any> {
    const { delay } = payload;
    console.log(`Shutdown scheduled in ${delay}ms`);

    // 재시도 불가능한 상태 저장
    setTimeout(() => {
      process.exit(0);
    }, delay || 5000);

    return { data: { scheduled: true } };
  }

  private async updateStatus(
    commandId: string,
    status: string
  ): Promise<void> {
    await this.client.put(`/api/commands/${commandId}/status`, {
      status,
      message: `Status updated to ${status}`
    });
  }

  private async reportResult(
    commandId: string,
    result: CommandResult
  ): Promise<void> {
    await this.client.post(`/api/commands/${commandId}/result`, result);
  }

  private async reportError(
    commandId: string,
    error: any
  ): Promise<void> {
    await this.client.post(`/api/commands/${commandId}/result`, {
      success: false,
      message: error.message,
      data: {
        stack: error.stack
      }
    });
  }

  private async ping(): Promise<void> {
    await this.client.post(`/api/clients/${this.config.clientId}/ping`);
  }

  private startHeartbeat(): void {
    setInterval(async () => {
      try {
        if (this.isConnected) {
          await this.ping();
        }
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }
    }, 30000); // 30초마다
  }

  async stop(): Promise<void> {
    this.isConnected = false;
    console.log('Control Agent stopped');
  }
}

// 사용 예
const agent = new ControlAgent({
  clientId: process.env.CLIENT_ID!,
  clientKey: process.env.CLIENT_KEY!,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000'
});

agent.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await agent.stop();
  process.exit(0);
});
```

---

## 배포 체크리스트

```markdown
## 프로덕션 배포 전 확인사항

### 데이터베이스
- [ ] 마이그레이션 실행됨
- [ ] 인덱스 생성됨
- [ ] RLS 정책 활성화됨
- [ ] 백업 설정 완료
- [ ] 연결 풀 설정됨

### Redis
- [ ] AOF 활성화 (지속성)
- [ ] 메모리 제한 설정
- [ ] 암호 설정
- [ ] 모니터링 설정
- [ ] 클러스터 (선택사항)

### API 서버
- [ ] 모든 환경 변수 설정
- [ ] SSL/TLS 인증서 설정
- [ ] 로깅 레벨 조정
- [ ] 에러 핸들링 테스트
- [ ] 로드 밸런싱 설정

### 보안
- [ ] 클라이언트 키 발급
- [ ] 권한 설정
- [ ] Rate limiting 활성화
- [ ] CORS 설정
- [ ] 감사 로깅 활성화

### 모니터링
- [ ] 메트릭 수집 설정
- [ ] 로그 수집 설정
- [ ] 알림 규칙 설정
- [ ] 대시보드 구성
- [ ] 헬스 체크 설정

### 테스트
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 부하 테스트 완료
- [ ] 보안 테스트 완료
- [ ] 재해 복구 테스트

### 문서화
- [ ] API 문서 완성
- [ ] 배포 가이드 작성
- [ ] 운영 매뉴얼 작성
- [ ] 트러블슈팅 가이드 작성
- [ ] 클라이언트 가이드 작성
```

이 가이드를 따라 단계적으로 분산 제어 시스템을 구축할 수 있습니다.
