# 원격 컴퓨터 제어 시스템 - 구현 가이드

**문서 버전**: 1.0.0
**작성일**: 2025-10-23
**목적**: 설계 문서의 구체적인 구현 예제 및 단계별 가이드

---

## 목차
1. [프로젝트 초기화](#프로젝트-초기화)
2. [Supabase 설정](#supabase-설정)
3. [백엔드 구현](#백엔드-구현)
4. [WebSocket 서버 구현](#websocket-서버-구현)
5. [클라이언트 Agent 구현](#클라이언트-agent-구현)
6. [프론트엔드 구현](#프론트엔드-구현)
7. [테스트 및 배포](#테스트-및-배포)

---

## 프로젝트 초기화

### 1. Next.js 프로젝트 생성

```bash
# Next.js 15 프로젝트 생성
npx create-next-app@latest vooster \
  --typescript \
  --tailwind \
  --app \
  --no-git

cd vooster

# 필수 패키지 설치
npm install \
  @supabase/ssr \
  @supabase/supabase-js \
  socket.io \
  socket.io-client \
  @tanstack/react-query \
  zustand \
  zod \
  @hookform/resolvers \
  react-hook-form \
  axios \
  hono \
  @hono/node-server \
  lucide-react \
  date-fns \
  js-cookie \
  next-themes

# 개발 의존성
npm install -D \
  @types/node \
  @types/react \
  @types/react-dom \
  @testing-library/react \
  @testing-library/jest-dom \
  vitest \
  @playwright/test
```

### 2. 환경 변수 설정

```bash
# .env.example 생성
cat > .env.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=your-random-secret-key

# Socket.io
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
EOF

# 개발용 복사
cp .env.example .env.local
```

### 3. TypeScript 설정

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules", ".next"]
}
```

---

## Supabase 설정

### 1. 테이블 생성 (마이그레이션)

```sql
-- supabase/migrations/001_auth_tables.sql
-- 사용자 정보 (Supabase Auth와 동기)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- supabase/migrations/002_computers_table.sql
-- 등록된 컴퓨터
CREATE TABLE computers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  os_type TEXT NOT NULL CHECK (os_type IN ('windows', 'macos', 'linux')),
  ip_address INET,
  agent_version TEXT NOT NULL,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'idle')),
  last_seen TIMESTAMPTZ,
  registration_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_computers_user_id ON computers(user_id);
CREATE INDEX idx_computers_status ON computers(status);

-- supabase/migrations/003_commands_table.sql
-- 실행된 명령 이력
CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  computer_id UUID NOT NULL REFERENCES computers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_commands_computer_id ON commands(computer_id);
CREATE INDEX idx_commands_user_id ON commands(user_id);
CREATE INDEX idx_commands_status ON commands(status);
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);

-- supabase/migrations/004_sessions_table.sql
-- WebSocket 세션 추적
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  computer_id UUID REFERENCES computers(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('web', 'agent')),
  ip_address INET,
  user_agent TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_computer_id ON sessions(computer_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- supabase/migrations/005_rls_policies.sql
-- Row Level Security 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users: 자신의 정보만 조회
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Computers: 사용자가 소유한 컴퓨터만 조회
CREATE POLICY "Users can view own computers"
  ON computers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own computers"
  ON computers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own computers"
  ON computers FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own computers"
  ON computers FOR DELETE
  USING (user_id = auth.uid());

-- Commands: 사용자의 컴퓨터 명령만 조회
CREATE POLICY "Users can view own commands"
  ON commands FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own commands"
  ON commands FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Sessions: 자신의 세션만 조회
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (user_id = auth.uid());
```

### 2. Supabase 클라이언트 생성

```typescript
// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 쿠키 설정 실패 가능
          }
        },
      },
    }
  );
}

// src/lib/supabase/admin.ts
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const adminSupabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## 백엔드 구현

### 1. Hono.js API 설정

```typescript
// src/backend/hono/index.ts
import { Hono } from 'hono';
import { logger } from './logger';
import { errorHandler } from '../middleware/error-handler';
import { registerAuthRoutes } from '@/features/auth/backend/route';
import { registerComputerRoutes } from '@/features/computers/backend/route';
import { registerCommandRoutes } from '@/features/remote-control/backend/route';
import { registerSystemInfoRoutes } from '@/features/system-info/backend/route';

export type AppEnv = {
  Variables: {
    userId: string;
    computerId?: string;
  };
};

export function createHonoApp() {
  const app = new Hono<AppEnv>();

  // 미들웨어
  app.use('*', async (c, next) => {
    await next();
  });

  // 라우트 등록
  registerAuthRoutes(app);
  registerComputerRoutes(app);
  registerCommandRoutes(app);
  registerSystemInfoRoutes(app);

  // 헬스 체크
  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  // 에러 핸들링
  app.onError(errorHandler);

  return app;
}
```

### 2. 인증 라우트 구현

```typescript
// src/features/auth/backend/route.ts
import { Hono } from 'hono';
import { createClient } from '@/lib/supabase/server';
import { success, failure, respond } from '@/backend/http/response';
import { LoginSchema, SignupSchema } from './schema';
import type { AppEnv } from '@/backend/hono';

export const registerAuthRoutes = (app: Hono<AppEnv>) => {
  // 로그인
  app.post('/api/auth/login', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = LoginSchema.safeParse(body);

      if (!parsed.success) {
        return respond(c, failure(400, 'INVALID_INPUT', 'Invalid input', parsed.error));
      }

      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        return respond(c, failure(401, 'AUTH_FAILED', 'Invalid credentials'));
      }

      return respond(c, success({
        token: data.session?.access_token,
        user: data.user,
      }));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });

  // 회원가입
  app.post('/api/auth/signup', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = SignupSchema.safeParse(body);

      if (!parsed.success) {
        return respond(c, failure(400, 'INVALID_INPUT', 'Invalid input', parsed.error));
      }

      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUpWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        return respond(c, failure(400, 'SIGNUP_FAILED', error.message));
      }

      return respond(c, success({
        user: data.user,
        message: 'Signup successful. Please check your email to confirm.',
      }));
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });

  // 로그아웃
  app.post('/api/auth/logout', async (c) => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return respond(c, success({ message: 'Logged out' }));
  });
};

// src/features/auth/backend/schema.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});
```

### 3. 컴퓨터 관리 라우트

```typescript
// src/features/computers/backend/route.ts
import { Hono } from 'hono';
import { createClient } from '@/lib/supabase/server';
import { success, failure, respond } from '@/backend/http/response';
import { AddComputerSchema } from './schema';
import { addComputer, getComputers, getComputerById, deleteComputer } from './service';
import type { AppEnv } from '@/backend/hono';

export const registerComputerRoutes = (app: Hono<AppEnv>) => {
  // 컴퓨터 목록 조회
  app.get('/api/computers', async (c) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return respond(c, failure(401, 'UNAUTHORIZED', 'Not authenticated'));
      }

      const result = await getComputers(supabase, user.id);
      return respond(c, result);
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });

  // 컴퓨터 상세 조회
  app.get('/api/computers/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return respond(c, failure(401, 'UNAUTHORIZED', 'Not authenticated'));
      }

      const result = await getComputerById(supabase, id, user.id);
      return respond(c, result);
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });

  // 컴퓨터 등록
  app.post('/api/computers', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = AddComputerSchema.safeParse(body);

      if (!parsed.success) {
        return respond(c, failure(400, 'INVALID_INPUT', 'Invalid input', parsed.error));
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return respond(c, failure(401, 'UNAUTHORIZED', 'Not authenticated'));
      }

      const result = await addComputer(supabase, user.id, parsed.data);
      return respond(c, result);
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });

  // 컴퓨터 삭제
  app.delete('/api/computers/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return respond(c, failure(401, 'UNAUTHORIZED', 'Not authenticated'));
      }

      const result = await deleteComputer(supabase, id, user.id);
      return respond(c, result);
    } catch (error) {
      return respond(c, failure(500, 'INTERNAL_ERROR', 'Server error', error));
    }
  });
};

// src/features/computers/backend/service.ts
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { success, failure, type Result } from '@/backend/http/response';
import type { Computer } from '@/types/computer';

export async function getComputers(
  supabase: any,
  userId: string
): Promise<Result<Computer[], any>> {
  const { data, error } = await supabase
    .from('computers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return failure(500, 'DB_ERROR', 'Failed to fetch computers', error);
  }

  return success(data || []);
}

export async function getComputerById(
  supabase: any,
  id: string,
  userId: string
): Promise<Result<Computer, any>> {
  const { data, error } = await supabase
    .from('computers')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return failure(404, 'NOT_FOUND', 'Computer not found');
    }
    return failure(500, 'DB_ERROR', 'Failed to fetch computer', error);
  }

  return success(data);
}

export async function addComputer(
  supabase: any,
  userId: string,
  data: { name: string; registrationKey: string }
): Promise<Result<Computer, any>> {
  // 등록 키 검증
  const { data: regData, error: regError } = await supabase
    .from('computers')
    .select('id')
    .eq('registration_key', data.registrationKey)
    .eq('user_id', userId)
    .single();

  if (!regError && regData) {
    return failure(400, 'KEY_EXISTS', 'Registration key already used');
  }

  // 컴퓨터 등록
  const { data: newComputer, error } = await supabase
    .from('computers')
    .insert({
      user_id: userId,
      name: data.name,
      registration_key: data.registrationKey,
      os_type: 'windows', // Agent가 보고할 때까지 기본값
      agent_version: '1.0.0',
    })
    .select()
    .single();

  if (error) {
    return failure(500, 'DB_ERROR', 'Failed to register computer', error);
  }

  return success(newComputer);
}

export async function deleteComputer(
  supabase: any,
  id: string,
  userId: string
): Promise<Result<{ success: boolean }, any>> {
  const { error } = await supabase
    .from('computers')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return failure(500, 'DB_ERROR', 'Failed to delete computer', error);
  }

  return success({ success: true });
}
```

### 4. 통일된 응답 형식

```typescript
// src/backend/http/response.ts
export interface HttpResponse<T = any, E = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: E;
  };
}

export type Result<T = any, E = any> =
  | { ok: true; data: T }
  | { ok: false; error: HttpError<E> };

export interface HttpError<E = any> {
  status: number;
  code: string;
  message: string;
  details?: E;
}

export function success<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function failure<E>(
  status: number,
  code: string,
  message: string,
  details?: E
): Result<never, E> {
  return {
    ok: false,
    error: { status, code, message, details },
  };
}

export async function respond<T, E>(
  c: any,
  result: Result<T, E>
): Promise<Response> {
  if (result.ok) {
    return c.json(
      {
        success: true,
        data: result.data,
      },
      200
    );
  } else {
    return c.json(
      {
        success: false,
        error: {
          code: result.error.code,
          message: result.error.message,
          details: result.error.details,
        },
      },
      result.error.status
    );
  }
}
```

---

## WebSocket 서버 구현

### 1. socket.io 서버 통합

```typescript
// src/app/api/[[...hono]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createHonoApp } from '@/backend/hono';

export const runtime = 'nodejs';

const app = createHonoApp();

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

// WebSocket은 별도로 처리 필요 (Vercel 제한)
// 프로덕션에서는 별도 Node.js 서버 또는 Heroku 사용 권장

// 개발용 WebSocket 서버 (로컬)
if (process.env.NODE_ENV === 'development') {
  import('@/backend/hono/websocket-server').then(({ initializeWebSocket }) => {
    const { createServer } = require('http');
    const server = createServer();
    initializeWebSocket(server);
    server.listen(3001, () => {
      console.log('WebSocket server running on port 3001');
    });
  });
}
```

### 2. 별도 WebSocket 서버 (권장)

```typescript
// src/backend/websocket-service.ts
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './hono/logger';
import type { Command, Computer } from '@/types';

interface SocketContext {
  userId: string;
  computerId?: string;
  isAgent: boolean;
}

declare global {
  namespace Express {
    interface Socket {
      context?: SocketContext;
    }
  }
}

export class WebSocketService {
  private io: SocketIOServer;
  private clientConnections = new Map<string, Set<string>>();
  private agentConnections = new Map<string, string>();

  constructor(httpServer: createServer.Server) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupNamespaces();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const isAgent = socket.handshake.auth.isAgent;

        if (!token) {
          return next(new Error('Missing token'));
        }

        // 토큰 검증 (실제 구현에서는 JWT 검증)
        const userId = this.validateToken(token);
        if (!userId) {
          return next(new Error('Invalid token'));
        }

        (socket as any).context = {
          userId,
          computerId: socket.handshake.auth.computerId,
          isAgent: isAgent || false,
        };

        next();
      } catch (error) {
        logger.error('WebSocket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupNamespaces(): void {
    // 클라이언트 네임스페이스
    const clientNs = this.io.of('/client');

    clientNs.on('connection', (socket) => {
      const context = (socket as any).context as SocketContext;
      logger.info(`[Client] Connected: ${context.userId}`);

      // 사용자의 모든 소켓 추적
      if (!this.clientConnections.has(context.userId)) {
        this.clientConnections.set(context.userId, new Set());
      }
      this.clientConnections.get(context.userId)!.add(socket.id);

      // 컴퓨터 구독
      socket.on('subscribe:computer', ({ computerId }) => {
        socket.join(`computer:${computerId}`);
        logger.info(`[Client] Subscribed to computer: ${computerId}`);
      });

      socket.on('unsubscribe:computer', ({ computerId }) => {
        socket.leave(`computer:${computerId}`);
        logger.info(`[Client] Unsubscribed from computer: ${computerId}`);
      });

      socket.on('disconnect', () => {
        const connections = this.clientConnections.get(context.userId);
        if (connections) {
          connections.delete(socket.id);
        }
        logger.info(`[Client] Disconnected: ${context.userId}`);
      });
    });

    // Agent 네임스페이스
    const agentNs = this.io.of('/agent');

    agentNs.on('connection', (socket) => {
      const context = (socket as any).context as SocketContext;
      const computerId = context.computerId!;

      logger.info(`[Agent] Connected: ${computerId}`);

      // Agent 연결 추적
      this.agentConnections.set(computerId, socket.id);
      socket.join(`agent:${computerId}`);

      // 명령 실행 완료
      socket.on('command:executed', (command: Command) => {
        logger.info(`[Agent] Command executed: ${command.id}`);

        // 클라이언트에 브로드캐스트
        clientNs.to(`computer:${computerId}`).emit('command:executed', {
          id: command.id,
          status: command.status,
          result: command.result,
          error: command.error,
        });
      });

      // 시스템 정보 업데이트
      socket.on('system-info:update', (info) => {
        logger.debug(`[Agent] System info updated: ${computerId}`);

        // 클라이언트에 브로드캐스트
        clientNs.to(`computer:${computerId}`).emit('system-info:updated', info);
      });

      // Ping (연결 확인)
      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', () => {
        this.agentConnections.delete(computerId);
        clientNs.to(`computer:${computerId}`).emit('computer:offline');
        logger.info(`[Agent] Disconnected: ${computerId}`);
      });
    });
  }

  // 클라이언트에게 명령 전송
  sendCommandToAgent(computerId: string, command: Command): boolean {
    const agentSocket = this.agentConnections.get(computerId);
    if (agentSocket) {
      this.io.to(`agent:${computerId}`).emit('command:new', command);
      return true;
    }
    return false;
  }

  // 사용자 알림
  notifyUser(userId: string, event: string, data: any): void {
    const userSockets = this.clientConnections.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  private validateToken(token: string): string | null {
    try {
      // 실제 구현에서는 JWT 검증
      // const decoded = jwt.verify(token, process.env.AUTH_SECRET!);
      // return decoded.userId;
      return 'user-' + token.substring(0, 8);
    } catch {
      return null;
    }
  }

  getConnectionStats() {
    return {
      connectedClients: this.io.of('/client').sockets.size,
      connectedAgents: this.io.of('/agent').sockets.size,
    };
  }
}
```

---

## 클라이언트 Agent 구현

### 1. Agent 메인 파일

```typescript
// agents/node-agent/src/index.ts
import dotenv from 'dotenv';
import { AgentSocketClient } from './socket-client';
import { CommandExecutor } from './command-executor';
import { SystemMonitor } from './system-monitor';
import { logger } from './logger';
import { config } from './config';

dotenv.config();

class Agent {
  private socketClient: AgentSocketClient;
  private commandExecutor: CommandExecutor;
  private systemMonitor: SystemMonitor;

  constructor() {
    this.socketClient = new AgentSocketClient();
    this.commandExecutor = new CommandExecutor();
    this.systemMonitor = new SystemMonitor();
  }

  async start(): Promise<void> {
    logger.info('Starting Agent...');
    logger.info(`Computer ID: ${config.COMPUTER_ID}`);
    logger.info(`Server URL: ${config.SERVER_URL}`);

    try {
      // 서버에 연결
      await this.socketClient.connect();
      logger.info('Connected to server');

      // 시스템 모니터링 시작
      this.systemMonitor.startMonitoring(
        this.socketClient.getSocket(),
        config.COMPUTER_ID,
        config.MONITORING_INTERVAL
      );

      // 명령 실행기 설정
      this.socketClient.onCommand((command) => {
        this.executeCommand(command);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start agent:', error);
      process.exit(1);
    }
  }

  private async executeCommand(command: any): Promise<void> {
    try {
      logger.info(`Executing command: ${command.type}`);
      const result = await this.commandExecutor.execute(command);

      this.socketClient.reportCommandExecution({
        ...command,
        status: 'completed',
        result,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Command execution failed: ${command.type}`, error);

      this.socketClient.reportCommandExecution({
        ...command,
        status: 'failed',
        error: String(error),
        executedAt: new Date().toISOString(),
      });
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down Agent...');
    this.systemMonitor.stopMonitoring();
    this.socketClient.disconnect();
    process.exit(0);
  }
}

// 에이전트 시작
const agent = new Agent();
agent.start().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
```

### 2. 명령 실행기 구현

```typescript
// agents/node-agent/src/command-executor.ts
import robot from 'robotjs';
import { execSync } from 'child_process';
import * as si from 'systeminformation';
import { logger } from './logger';
import type { Command } from '@/types/command';

export class CommandExecutor {
  async execute(command: Command): Promise<Record<string, any>> {
    switch (command.type) {
      case 'mouse-move':
        return this.executeMouseMove(command);
      case 'mouse-click':
        return this.executeMouseClick(command);
      case 'key-press':
        return this.executeKeyPress(command);
      case 'key-release':
        return this.executeKeyRelease(command);
      case 'text-input':
        return this.executeTextInput(command);
      case 'screenshot':
        return this.executeScreenshot(command);
      case 'system-info':
        return this.executeSystemInfo(command);
      case 'sleep':
        return this.executeSleep(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private executeMouseMove(command: Command): Record<string, any> {
    const { x, y } = command.payload as { x: number; y: number };
    robot.moveMouse(x, y);
    return { x, y, timestamp: Date.now() };
  }

  private executeMouseClick(command: Command): Record<string, any> {
    const {
      x,
      y,
      button = 'left',
      doubleClick = false,
    } = command.payload as any;

    if (x !== undefined && y !== undefined) {
      robot.moveMouse(x, y);
    }

    if (doubleClick) {
      robot.mouseClick(button, true);
    } else {
      robot.mouseClick(button);
    }

    return {
      button,
      doubleClick,
      timestamp: Date.now(),
    };
  }

  private executeKeyPress(command: Command): Record<string, any> {
    const { key } = command.payload as { key: string };
    robot.keyToggle(key, 'down');
    return { key, state: 'down' };
  }

  private executeKeyRelease(command: Command): Record<string, any> {
    const { key } = command.payload as { key: string };
    robot.keyToggle(key, 'up');
    return { key, state: 'up' };
  }

  private executeTextInput(command: Command): Record<string, any> {
    const { text } = command.payload as { text: string };
    robot.typeString(text);
    return { text, length: text.length };
  }

  private async executeScreenshot(command: Command): Promise<Record<string, any>> {
    // robotjs는 스크린샷이 제한적이므로 플랫폼별 처리 필요
    const { exec } = require('child_process');
    const path = require('path');
    const os = require('os');

    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(os.tmpdir(), filename);

    if (process.platform === 'darwin') {
      // macOS
      execSync(`screencapture "${filepath}"`);
    } else if (process.platform === 'win32') {
      // Windows (PowerShell)
      execSync(
        `powershell -Command "[ScreenCapture]::CaptureScreen() | % {$_.Save(\\"${filepath}\\")}"`
      );
    } else {
      // Linux
      execSync(`gnome-screenshot -f "${filepath}"`);
    }

    return {
      filename,
      path: filepath,
      timestamp,
    };
  }

  private async executeSystemInfo(command: Command): Promise<Record<string, any>> {
    const [cpu, mem, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
    ]);

    return {
      os: osInfo.platform,
      hostname: osInfo.hostname,
      uptime: Math.floor(process.uptime()),
      cpu: {
        usage: cpu.currentLoad,
        cores: cpu.cores,
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: (mem.used / mem.total) * 100,
      },
      timestamp: Date.now(),
    };
  }

  private executeSleep(command: Command): Promise<Record<string, any>> {
    const { duration } = command.payload as { duration: number };
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ duration, timestamp: Date.now() });
      }, duration);
    });
  }
}
```

---

## 프론트엔드 구현

### 1. 컴퓨터 목록 컴포넌트

```typescript
// src/features/computers/components/ComputerList.tsx
'use client';

import { useComputersQuery } from '../hooks/useComputersQuery';
import { ComputerCard } from './ComputerCard';
import { AddComputerDialog } from './AddComputerDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';

export function ComputerList() {
  const query = useComputersQuery();

  if (query.isPending) {
    return <LoadingSpinner />;
  }

  if (query.isError) {
    return <ErrorMessage error={query.error} />;
  }

  const computers = query.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">등록된 컴퓨터</h1>
        <AddComputerDialog />
      </div>

      {computers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-gray-500">등록된 컴퓨터가 없습니다.</p>
          <AddComputerDialog />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {computers.map((computer) => (
            <ComputerCard key={computer.id} computer={computer} />
          ))}
        </div>
      )}
    </div>
  );
}

// src/features/computers/hooks/useComputersQuery.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { computerKeys } from '../constants';
import type { Computer } from '@/types/computer';

export function useComputersQuery() {
  return useQuery({
    queryKey: computerKeys.all,
    queryFn: async () => {
      const response = await apiClient.get<{ computers: Computer[] }>(
        '/api/computers'
      );
      return response.data.computers;
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}
```

### 2. 원격 제어 컴포넌트

```typescript
// src/features/remote-control/components/ControlPanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MouseControl } from './MouseControl';
import { KeyboardControl } from './KeyboardControl';
import { SystemControl } from './SystemControl';
import type { Computer } from '@/types/computer';

interface ControlPanelProps {
  computer: Computer;
}

export function ControlPanel({ computer }: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'mouse' | 'keyboard' | 'system'>(
    'mouse'
  );

  if (computer.status !== 'online') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          컴퓨터가 오프라인입니다. 제어할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'mouse' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('mouse')}
          className="rounded-none"
        >
          마우스
        </Button>
        <Button
          variant={activeTab === 'keyboard' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('keyboard')}
          className="rounded-none"
        >
          키보드
        </Button>
        <Button
          variant={activeTab === 'system' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('system')}
          className="rounded-none"
        >
          시스템
        </Button>
      </div>

      <div className="mt-4">
        {activeTab === 'mouse' && <MouseControl computerId={computer.id} />}
        {activeTab === 'keyboard' && (
          <KeyboardControl computerId={computer.id} />
        )}
        {activeTab === 'system' && <SystemControl computerId={computer.id} />}
      </div>
    </div>
  );
}

// src/features/remote-control/components/MouseControl.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useSendCommand } from '../hooks/useSendCommand';

interface MouseControlProps {
  computerId: string;
}

export function MouseControl({ computerId }: MouseControlProps) {
  const { sendCommand, isPending } = useSendCommand(computerId);

  const handleMouseMove = (x: number, y: number) => {
    sendCommand({
      type: 'mouse-move',
      payload: { x, y },
    });
  };

  const handleClick = (button: 'left' | 'right' | 'center' = 'left') => {
    sendCommand({
      type: 'mouse-click',
      payload: { button },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => handleMouseMove(100, 100)} disabled={isPending}>
          ↖
        </Button>
        <Button onClick={() => handleMouseMove(0, -50)} disabled={isPending}>
          ↑
        </Button>
        <Button onClick={() => handleMouseMove(100, -100)} disabled={isPending}>
          ↗
        </Button>
        <Button onClick={() => handleMouseMove(-50, 0)} disabled={isPending}>
          ←
        </Button>
        <Button onClick={() => handleClick('left')} disabled={isPending}>
          클릭
        </Button>
        <Button onClick={() => handleMouseMove(50, 0)} disabled={isPending}>
          →
        </Button>
        <Button onClick={() => handleMouseMove(-100, 100)} disabled={isPending}>
          ↙
        </Button>
        <Button onClick={() => handleMouseMove(0, 50)} disabled={isPending}>
          ↓
        </Button>
        <Button onClick={() => handleMouseMove(100, 100)} disabled={isPending}>
          ↘
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handleClick('left')}
          disabled={isPending}
          className="flex-1"
        >
          좌클릭
        </Button>
        <Button
          variant="outline"
          onClick={() => handleClick('right')}
          disabled={isPending}
          className="flex-1"
        >
          우클릭
        </Button>
      </div>
    </div>
  );
}

// src/features/remote-control/hooks/useSendCommand.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { Command, CommandType } from '@/types/command';

interface SendCommandInput {
  type: CommandType;
  payload: Record<string, any>;
}

export function useSendCommand(computerId: string) {
  const mutation = useMutation({
    mutationFn: async (input: SendCommandInput) => {
      const response = await apiClient.post<Command>('/api/commands', {
        computerId,
        ...input,
      });
      return response.data;
    },
  });

  return {
    sendCommand: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

### 3. API 클라이언트 설정

```typescript
// src/lib/remote/api-client.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as Cookies from 'js-cookie';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  timeout: 10000,
});

// 요청 인터셉터: 토큰 추가
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.default.get('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료, 로그인 페이지로 리다이렉트
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
```

---

## 테스트 및 배포

### 1. 로컬 테스트

```bash
# 모든 의존성 설치
npm install

# 타입 체크
npm run typecheck

# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3000 접속
```

### 2. Agent 테스트

```bash
cd agents/node-agent

# 환경 변수 설정
cat > .env << 'EOF'
SERVER_URL=http://localhost:3000
AUTH_TOKEN=test-token-123
COMPUTER_ID=test-computer-001
COMPUTER_NAME=Test Machine
LOG_LEVEL=debug
EOF

# Agent 시작
npm run dev
```

### 3. 단위 테스트

```typescript
// src/features/computers/backend/__tests__/service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getComputers } from '../service';

describe('Computer Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: '1', name: 'PC-1', status: 'online' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };
  });

  it('should return computers for a user', async () => {
    const result = await getComputers(mockSupabase, 'user-123');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('PC-1');
    }
  });
});
```

### 4. E2E 테스트

```typescript
// e2e/remote-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Remote Control System', () => {
  test('should login and view computers', async ({ page }) => {
    await page.goto('/auth/login');

    // 로그인
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("로그인")');

    // 대시보드로 이동
    await expect(page).toHaveURL('/dashboard');

    // 컴퓨터 목록 확인
    await page.click('text=등록된 컴퓨터');
    await expect(page.locator('text=PC-1')).toBeVisible();
  });

  test('should send a command to a computer', async ({ page }) => {
    // 로그인 후 컴퓨터 제어 페이지로 이동
    await page.goto('/computers/computer-001/control');

    // 마우스 이동 버튼 클릭
    await page.click('button:has-text("→")');

    // 명령이 전송되었는지 확인
    await expect(page.locator('text=명령 전송됨')).toBeVisible();
  });
});
```

### 5. 배포 체크리스트

```markdown
# 배포 전 체크리스트

## 코드 품질
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료

## 보안
- [ ] 환경 변수 (.env)가 git에 포함되지 않음
- [ ] API 토큰이 클라이언트에 노출되지 않음
- [ ] HTTPS 설정 확인
- [ ] CORS 정책 검토

## 성능
- [ ] Lighthouse 점수 > 90
- [ ] 번들 크기 < 500KB
- [ ] 초기 로딩 시간 < 3초

## 배포
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 환경 변수 프로덕션에 설정
- [ ] 백업 계획 수립
- [ ] 모니터링 설정 완료
```

---

## 다음 단계

1. **프로덕션 배포**
   - Vercel에 웹앱 배포
   - 클라우드에 WebSocket 서버 배포
   - Agent를 각 컴퓨터에 설치

2. **기능 확장**
   - 파일 전송
   - 화면 공유
   - 사용자 권한 관리

3. **운영 최적화**
   - 모니터링 대시보드 구축
   - 로그 수집 및 분석
   - 성능 최적화

