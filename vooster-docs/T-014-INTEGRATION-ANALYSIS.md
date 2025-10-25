# T-014: 기존 시스템과의 통합 분석

## 개요

T-014 "디스플레이 등록, 페어링 및 트리거 API" 구현 시 T-012 (Socket.IO 서버), T-013 (채널 관리)과의 통합 포인트를 분석합니다.

**분석 범위**:
- Socket.IO 통합 방식
- 인증/권한 시스템 통합
- 로깅 시스템 통합
- 데이터 저장소 통합
- 환경설정 통합
- 라우터 구조 통합
- 에러 처리 통합

**분석 일시**: 2025-10-25
**대상 버전**: T-012, T-013, T-014

---

## 1. Socket.IO 통합 방식

### 1.1 기존 구조 분석 (T-012, T-013)

#### 현재 아키텍처
```
Express 앱 (index.ts)
  ├── /health (기본 네임스페이스)
  ├── /status
  ├── /api/channels/:screenId
  └── Socket.IO 서버
      ├── 기본 네임스페이스 (모바일-모니터 연결)
      │   ├── registerClient
      │   ├── joinSession
      │   ├── scanOrder
      │   └── heartbeat
      └── /display 네임스페이스 (T-012에서 구현)
          ├── auth 이벤트
          └── ACK 처리
```

#### 채널 관리 (T-013)
```typescript
// channelManager.ts의 핵심 함수
emitToChannel(io, screenId, eventType, payload): EmitResult
├── 중복 검사 (txId 기반)
├── 클라이언트 확인
└── 메시지 브로드캐스트

// /display 네임스페이스의 screenId 룸에 브로드캐스트
displayNs.to(screenId).emit(eventType, payload)
```

### 1.2 T-014에서의 Socket.IO 활용

#### 통합점 1: 트리거 API → Socket.IO 메시지
```typescript
// T-014 트리거 엔드포인트
POST /api/trigger
  ↓
REST API 요청 검증 (screenId, jobNo, metadata)
  ↓
JWT 권한 확인 (Bearer 토큰)
  ↓
txId 생성 (UUID)
  ↓
emitToChannel(io, screenId, 'navigate', payload) 호출 ← T-013 재사용
  ↓
socket.io /display 네임스페이스로 메시지 전송
  ↓
브라우저 확장이 'navigate' 이벤트 수신
  ↓
trigger_logs 테이블에 기록
```

**코드 예시**:
```typescript
// server/src/routes/triggers.ts
import { emitToChannel } from '../services/channelManager';
import { triggerSchema } from '../schemas';

export async function handleTrigger(req: Request, context: AuthContext) {
  // 1. 입력 검증
  const parsed = triggerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationApiError(zodErrorToValidationErrors(parsed.error));
  }

  const { screenId, jobNo, metadata } = parsed.data;
  const txId = crypto.randomUUID();

  // 2. 권한 확인 (인증 미들웨어에서 완료)
  // context.scopes에서 display:screenId 확인

  // 3. Socket.IO로 메시지 전송
  const payload = {
    type: 'navigate',
    txId,
    screenId,
    jobNo,
    url: `${process.env.APP_URL}/orders/${jobNo}`,
    ts: Date.now(),
    exp: Date.now() + 60000, // 1분 유효
    metadata,
  };

  const emitResult = await emitToChannel(io, screenId, 'navigate', payload);

  // 4. 로깅
  await logTrigger({
    userId: context.userId,
    screenId,
    jobNo,
    txId,
    status: emitResult.ok ? 'delivered' : 'missed',
    clientCount: emitResult.clientCount || 0,
    ip: context.ip,
    timestamp: new Date(),
    statusCode: emitResult.ok ? 200 : 503,
  });

  // 5. 응답 반환
  return emitResult.ok
    ? {
        ok: true,
        txId,
        clientCount: emitResult.clientCount || 0,
        sentAt: Date.now(),
      }
    : {
        ok: false,
        txId,
        reason: 'no_clients',
      };
}
```

#### 통합점 2: 채널 상태 API 확장
```typescript
// 기존: 채널 상태 조회 (T-013)
GET /api/channels/:screenId
  ↓
getChannelStatus(io, screenId): ChannelStatus
  ↓
{ screenId, connected, online }

// T-014에서 추가: 디스플레이 상태 조회
GET /api/displays
  ↓
displayService.listOnline(lineId?)
  ↓
DB에서 조회하되, Socket.IO 채널 상태도 포함
  ↓
{ displays: [{ screenId, name, online, lastSeen, clientCount }] }
```

### 1.3 브라우저 확장 측 메시지 수신

```typescript
// 브라우저 확장 (client side)
socket.on('navigate', (payload) => {
  // payload = {
  //   type: 'navigate',
  //   txId: '...',
  //   screenId: '...',
  //   jobNo: '...',
  //   url: '...',
  //   ts: ...,
  //   exp: ...
  // }

  // 1. 만료 확인
  if (Date.now() > payload.exp) {
    socket.emit('ack', { txId, result: 'timeout' });
    return;
  }

  // 2. 페이지 이동
  window.location.href = payload.url;

  // 3. ACK 전송
  socket.emit('ack', {
    txId: payload.txId,
    result: 'success',
    tabId: 'tab-id',
  });
});
```

### 1.4 핵심 통합 체크리스트

| 항목 | 기존 코드 | T-014에서의 활용 | 주의사항 |
|------|---------|-----------------|---------|
| `emitToChannel()` | channelManager.ts | 트리거 API에서 직접 호출 | txId, eventType, payload 검증 필수 |
| `/display 네임스페이스` | displayHandlers.ts | 메시지 전송 대상 | Socket.IO io 인스턴스 필수 |
| 채널 룸 (screenId) | subscribeToChannel() | 트리거 메시지 수신 | 메시지는 roomId (screenId)로 전송 |
| ACK 처리 | logAck() | 성공/실패 로깅 | trigger_logs 테이블과 연계 |

---

## 2. 인증/권한 시스템 통합

### 2.1 기존 인증 시스템 (T-012)

#### Socket.IO 인증
```typescript
// T-012: displayHandlers.ts
handleDisplayAuth(io, socket, payload) {
  const { token, deviceId, screenId } = payload;

  // JWT 검증
  const claims = verifyDisplayToken(token, jwtSecret, screenId);

  // screenId 채널에 구독
  subscribeToChannel(socket, screenId);

  // socket.data 저장
  socket.data = {
    deviceId,
    screenId,
    authenticatedAt: Date.now(),
  };
}
```

#### 현재 JWT 구조 (DisplayAuthClaims)
```typescript
export interface DisplayAuthClaims {
  sub: string;              // 사용자 ID
  deviceId: string;         // 디바이스 고유 ID
  screenId: string;         // 화면 ID
  scopes: string[];         // 권한 배열 (display:screenId)
  iat: number;              // 발급 시간
  exp: number;              // 만료 시간
}
```

### 2.2 REST API 인증 통합 (T-014 추가)

#### 필요한 확장

**1. 환경변수 추가**
```bash
# 기존 (T-012)
SOCKET_JWT_SECRET=...

# T-014에서 추가
# 같은 시크릿 사용 가능, 또는 별도 사용 가능
REST_JWT_SECRET=${SOCKET_JWT_SECRET}  # 또는 별도 키

# 토큰 만료 시간
DISPLAY_TOKEN_EXPIRES=24h  # 브라우저 확장용
REST_TOKEN_EXPIRES=1h      # REST API 사용자용
```

**2. Express 미들웨어 추가**
```typescript
// server/src/middleware/expressAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthContext } from '../types';

/**
 * Express 요청에서 Bearer 토큰을 검증하는 미들웨어
 * 토큰이 유효하면 req.auth에 AuthContext 저장
 */
export function bearerAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Authorization 헤더 추출
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({
          ok: false,
          reason: 'unauthorized',
          message: '인증이 필요합니다',
        });
      }

      const token = auth.substring(7); // 'Bearer ' 제거

      // 2. JWT 검증
      const decoded = jwt.verify(token, jwtSecret) as DisplayAuthClaims;

      // 3. AuthContext 생성
      const authContext: AuthContext = {
        userId: decoded.sub,
        role: 'operator', // 향후 JWT에서 추출 가능
        scopes: decoded.scopes,
        ip: req.ip || 'unknown',
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
      };

      // 4. 요청에 첨부
      (req as any).auth = authContext;

      next();
    } catch (error) {
      return res.status(401).json({
        ok: false,
        reason: 'unauthorized',
        message: '토큰이 유효하지 않습니다',
      });
    }
  };
}
```

**3. 라우터에 미들웨어 적용**
```typescript
// server/src/routes/triggers.ts
import { bearerAuthMiddleware } from '../middleware/expressAuth';

router.post(
  '/trigger',
  bearerAuthMiddleware(process.env.SOCKET_JWT_SECRET!),
  async (req, res) => {
    const auth = (req as any).auth as AuthContext;

    // 권한 확인
    const { screenId, jobNo } = req.body;
    const requiredScope = `display:${screenId}`;

    if (!auth.scopes.includes(requiredScope)) {
      return res.status(403).json({
        ok: false,
        reason: 'forbidden',
        message: '이 화면에 접근할 권한이 없습니다',
      });
    }

    // ... 트리거 처리
  }
);
```

### 2.3 권한 검증 전략

#### Option 1: Single JWT (권장)
```
같은 SOCKET_JWT_SECRET을 Socket.IO와 REST API 모두에서 사용

장점:
- 설정 간단
- 토큰 발급 시스템 통일
- 기존 코드 변경 최소화

단점:
- REST API와 Socket.IO 토큰 구조 동일해야 함
- 별도의 토큰 종류 구분 어려움

구현 방법:
const secret = process.env.SOCKET_JWT_SECRET;
io.use(authMiddleware(secret));
app.use(bearerAuthMiddleware(secret));
```

#### Option 2: Dual JWT
```
Socket.IO 토큰과 REST API 토큰을 분리

장점:
- 각각 다른 유효 기간 설정 가능
- 토큰 종류별 세분화된 제어

단점:
- 별도의 JWT 발급 로직 필요
- 설정 증가

구현 방법:
export const JWT_CONFIG = {
  DISPLAY_TOKEN_SECRET: process.env.SOCKET_JWT_SECRET,
  REST_TOKEN_SECRET: process.env.REST_JWT_SECRET || process.env.SOCKET_JWT_SECRET,
  DISPLAY_TOKEN_EXPIRES: '24h',
  REST_TOKEN_EXPIRES: '1h',
};
```

**T-014 권장**: Option 1 (Single JWT) - 기존 시스템과의 호환성 최우선

### 2.4 토큰 발급 시점 분석

| 이벤트 | 발급 주체 | 용도 | 유효 기간 |
|--------|---------|------|---------|
| 페어링 승인 | `POST /api/pair/approve` | Socket.IO 연결 + REST API | 24시간 |
| (선택) 관리자 로그인 | (미정) | REST API만 | 1시간 |

**T-014 구현 범위**: 페어링 후 토큰 발급만 처리

### 2.5 권한 검증 흐름도

```
요청 (REST API)
  ├─ Authorization: Bearer {token} 존재?
  │  └─ No → 401 Unauthorized
  ├─ JWT 서명 검증
  │  └─ 실패 → 401 Unauthorized
  ├─ 만료 시간 확인
  │  └─ 만료됨 → 401 Unauthorized
  ├─ scopes 배열 추출
  ├─ 요청된 screenId에 대한 권한 확인
  │  ├─ display:screen:prod:line-1 등
  │  └─ 없음 → 403 Forbidden
  └─ 허용 (req.auth에 AuthContext 저장)
```

---

## 3. 로깅 시스템 통합

### 3.1 기존 로깅 (T-012, T-013)

#### Pino 로거 설정
```typescript
// utils/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
```

#### 현재 로깅 위치
```
- displayHandlers.ts: 인증 성공/실패, 연결/해제
- channelManager.ts: 메시지 브로드캐스트, ACK
- 기존 이벤트 핸들러들: 세션 관리, 하트비트
```

### 3.2 T-014에서의 추가 로깅

#### 1. API 요청 로깅 (미들웨어)
```typescript
// middleware/requestLogger.ts
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: (req as any).auth?.userId || 'anonymous',
      ip: req.ip,
    });
  });

  next();
}
```

#### 2. 트리거 API 로깅
```typescript
// routes/triggers.ts
logger.info('트리거 요청: userId=%s, screenId=%s, jobNo=%s, txId=%s',
  context.userId, screenId, jobNo, txId);

logger.info('트리거 전송 완료: txId=%s, clientCount=%d, status=%s',
  txId, emitResult.clientCount, emitResult.ok ? 'delivered' : 'missed');

if (!emitResult.ok) {
  logger.warn('트리거 전송 실패: txId=%s, reason=%s, userId=%s, ip=%s',
    txId, emitResult.reason, context.userId, context.ip);
}
```

#### 3. 페어링 API 로깅
```typescript
// routes/pairing.ts
logger.info('QR 생성 요청: sessionId=%s, code=%s', sessionId, code);

logger.info('페어링 승인: sessionId=%s, userId=%s, ip=%s',
  sessionId, context.userId, context.ip);

if (!approved) {
  logger.warn('페어링 승인 실패: sessionId=%s, reason=%s, ip=%s',
    sessionId, reason, context.ip);
}
```

### 3.3 trigger_logs 테이블 설계

```sql
-- 모든 트리거 API 호출 기록
CREATE TABLE trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,        -- JWT sub
  screen_id VARCHAR(100) NOT NULL,      -- screen:orgId:lineId
  job_no VARCHAR(50) NOT NULL,          -- 주문 번호
  tx_id UUID NOT NULL,                  -- 메시지 추적 ID
  status VARCHAR(20) NOT NULL,          -- 'delivered' | 'missed' | 'rate_limited' | 'error'
  client_count INT NOT NULL DEFAULT 0,  -- 메시지 수신 클라이언트 수
  ip_address INET NOT NULL,             -- 요청자 IP
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status_code INT NOT NULL,             -- HTTP 상태 코드 (200, 429, 503 등)
  error_message TEXT,                   -- 실패 메시지
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tx_id (tx_id),
  INDEX idx_user_id (user_id),
  INDEX idx_screen_id (screen_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status),
  PARTITION BY RANGE (YEAR(timestamp)) -- 연도별 파티셔닝
);
```

### 3.4 로깅 유틸리티 함수

```typescript
// services/loggingService.ts
import { TriggerLog } from '../types';

export async function logTrigger(log: Omit<TriggerLog, 'id' | 'createdAt'>) {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date();

    // DB 저장
    await db.insert('trigger_logs', {
      id,
      user_id: log.userId,
      screen_id: log.screenId,
      job_no: log.jobNo,
      tx_id: log.txId,
      status: log.status,
      client_count: log.clientCount,
      ip_address: log.ip,
      timestamp: log.timestamp,
      status_code: log.statusCode,
      error_message: log.errorMessage,
      created_at: createdAt,
    });

    // Pino 로깅도 동시에
    logger.info('트리거 로그 저장: txId=%s, userId=%s, status=%s',
      log.txId, log.userId, log.status);

    return { id, createdAt };
  } catch (error) {
    logger.error('트리거 로그 저장 실패: error=%s', (error as Error).message);
    // 로깅 실패가 API 응답을 막지 않도록 에러 억제
    throw error; // 또는 조용히 무시
  }
}
```

### 3.5 로깅 통합 체크리스트

| 로그 타입 | 위치 | 필드 | 용도 |
|----------|------|------|------|
| API 요청 | 미들웨어 | method, path, statusCode, duration | 성능 모니터링 |
| 인증 실패 | middleware/expressAuth.ts | userId, ip, reason | 보안 감시 |
| 트리거 전송 | routes/triggers.ts | txId, screenId, clientCount | 기능 검증 |
| 트리거 실패 | trigger_logs 테이블 | txId, reason, ip | 문제 추적 |
| 페어링 | routes/pairing.ts | sessionId, userId, ip | 감사 추적 |

---

## 4. 데이터 저장소 통합

### 4.1 저장소 추상화 계층 (Repository Pattern)

#### 인터페이스 정의
```typescript
// server/src/repositories/types.ts
export interface IDisplayRepository {
  // 디스플레이 등록 또는 업데이트
  register(data: DisplayRegisterRequest): Promise<Display>;

  // 디바이스 ID로 조회
  findByDeviceId(deviceId: string): Promise<Display | null>;

  // 화면 ID로 조회
  findByScreenId(screenId: string): Promise<Display | null>;

  // 라인의 모든 온라인 디스플레이 조회
  listOnline(lineId?: string): Promise<Display[]>;

  // 마지막 본 시간 업데이트 (heartbeat)
  updateLastSeen(deviceId: string): Promise<void>;

  // 디스플레이 상태 업데이트
  updateStatus(screenId: string, status: 'online' | 'offline'): Promise<void>;

  // 삭제
  delete(deviceId: string): Promise<void>;
}

export interface IPairingRepository {
  // 세션 생성
  create(data: Omit<PairingSession, 'createdAt'>): Promise<PairingSession>;

  // 세션 조회
  findById(sessionId: string): Promise<PairingSession | null>;

  // 세션 상태 업데이트
  updateStatus(sessionId: string, status: PairingSession['status']): Promise<void>;

  // 승인 정보 저장
  approve(
    sessionId: string,
    token: string,
    userId: string,
    ip: string
  ): Promise<void>;

  // 만료된 세션 정리
  cleanupExpired(): Promise<number>;
}

export interface ITriggerLogRepository {
  // 로그 저장
  log(data: Omit<TriggerLog, 'id' | 'createdAt'>): Promise<TriggerLog>;

  // 조회
  findById(id: string): Promise<TriggerLog | null>;

  // 목록 조회 (필터 포함)
  list(filter: {
    userId?: string;
    screenId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<TriggerLog[]>;

  // 통계
  getStats(userId: string, period: 'day' | 'week' | 'month'): Promise<{
    total: number;
    delivered: number;
    missed: number;
  }>;
}
```

### 4.2 구현 전략 (단계적 마이그레이션)

#### Phase 1: In-Memory (개발/테스트)
```typescript
// server/src/repositories/memory/displayRepository.ts
export class MemoryDisplayRepository implements IDisplayRepository {
  private displays = new Map<string, Display>();

  async register(data: DisplayRegisterRequest): Promise<Display> {
    const screenId = `screen:${data.orgId}:${data.lineId}`;
    const display: Display = {
      deviceId: data.deviceId,
      screenId,
      name: data.name,
      purpose: data.purpose,
      orgId: data.orgId,
      lineId: data.lineId,
      lastSeenAt: new Date(),
      status: 'online',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.displays.set(data.deviceId, display);
    return display;
  }

  async findByDeviceId(deviceId: string): Promise<Display | null> {
    return this.displays.get(deviceId) || null;
  }

  // 기타 메서드...
}
```

#### Phase 2: SQLite (프로토타입)
```typescript
// server/src/repositories/sqlite/displayRepository.ts
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';

export class SqliteDisplayRepository implements IDisplayRepository {
  constructor(private db: Database) {}

  async register(data: DisplayRegisterRequest): Promise<Display> {
    const screenId = `screen:${data.orgId}:${data.lineId}`;
    const now = new Date();

    await this.db.run(
      `INSERT OR REPLACE INTO displays
       (device_id, screen_id, name, purpose, org_id, line_id, last_seen_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.deviceId,
        screenId,
        data.name,
        data.purpose,
        data.orgId,
        data.lineId,
        now.toISOString(),
        'online',
        now.toISOString(),
        now.toISOString(),
      ]
    );

    return {
      deviceId: data.deviceId,
      screenId,
      name: data.name,
      purpose: data.purpose,
      orgId: data.orgId,
      lineId: data.lineId,
      lastSeenAt: now,
      status: 'online',
      createdAt: now,
      updatedAt: now,
    };
  }

  // 기타 메서드...
}
```

#### Phase 3: PostgreSQL (프로덕션)
```typescript
// server/src/repositories/postgres/displayRepository.ts
import { Pool } from 'pg';

export class PostgresDisplayRepository implements IDisplayRepository {
  constructor(private pool: Pool) {}

  async register(data: DisplayRegisterRequest): Promise<Display> {
    const screenId = `screen:${data.orgId}:${data.lineId}`;
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO displays
       (device_id, screen_id, name, purpose, org_id, line_id, last_seen_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (device_id) DO UPDATE SET
         last_seen_at = $7, updated_at = $10
       RETURNING *`,
      [
        data.deviceId,
        screenId,
        data.name,
        data.purpose,
        data.orgId,
        data.lineId,
        now.toISOString(),
        'online',
        now.toISOString(),
        now.toISOString(),
      ]
    );

    const row = result.rows[0];
    return {
      deviceId: row.device_id,
      screenId: row.screen_id,
      name: row.name,
      purpose: row.purpose,
      orgId: row.org_id,
      lineId: row.line_id,
      lastSeenAt: new Date(row.last_seen_at),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // 기타 메서드...
}
```

### 4.3 저장소 주입 (Dependency Injection)

```typescript
// server/src/repositories/index.ts
import { IDisplayRepository, IPairingRepository, ITriggerLogRepository } from './types';

export let displayRepository: IDisplayRepository;
export let pairingRepository: IPairingRepository;
export let triggerLogRepository: ITriggerLogRepository;

/**
 * 저장소 초기화 (서버 시작 시)
 */
export async function initializeRepositories() {
  const dbType = process.env.DB_TYPE || 'memory';

  switch (dbType) {
    case 'sqlite':
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      const db = await open({
        filename: process.env.DATABASE_PATH || ':memory:',
        driver: sqlite3.Database,
      });
      displayRepository = new SqliteDisplayRepository(db);
      pairingRepository = new SqlitePairingRepository(db);
      triggerLogRepository = new SqliteTriggerLogRepository(db);
      break;

    case 'postgres':
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      displayRepository = new PostgresDisplayRepository(pool);
      pairingRepository = new PostgresPairingRepository(pool);
      triggerLogRepository = new PostgresTriggerLogRepository(pool);
      break;

    case 'memory':
    default:
      displayRepository = new MemoryDisplayRepository();
      pairingRepository = new MemoryPairingRepository();
      triggerLogRepository = new MemoryTriggerLogRepository();
      break;
  }

  logger.info('저장소 초기화 완료: DB_TYPE=%s', dbType);
}
```

### 4.4 서버 부팅 시퀀스 (index.ts 수정)

```typescript
// server/src/index.ts
async function startServer() {
  try {
    // ... 기존 설정 로드

    // *** 저장소 초기화 추가 (T-014)
    await initializeRepositories();

    // ... 나머지 설정

    // Socket.IO 서버 설정
    const io = new SocketIOServer(server, { ... });

    // *** Express 라우터 추가 (T-014)
    app.use('/api/displays', displayRoutes(io));
    app.use('/api/pair', pairingRoutes(io));
    app.use('/api/trigger', triggerRoutes(io));

    server.listen(config.port, () => {
      logger.info('✓ 서버가 포트 %d에서 실행 중입니다', config.port);
    });
  } catch (error) {
    logger.error('서버 시작 실패: %s', (error as Error).message);
    process.exit(1);
  }
}
```

---

## 5. 환경설정 통합

### 5.1 필요한 환경변수

#### 기존 (T-012)
```bash
# Socket.IO JWT
SOCKET_JWT_SECRET=your-secret-key

# CORS
CORS_ORIGINS=http://localhost:3000,https://app.example.com

# 서버
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

#### T-014 추가
```bash
# 데이터베이스
DB_TYPE=memory|sqlite|postgres         # 기본: memory
DATABASE_URL=postgresql://...          # PostgreSQL 연결 문자열
DATABASE_PATH=/path/to/db.sqlite       # SQLite 파일 경로

# WebSocket/App URL
WS_URL=ws://localhost:3000             # QR에 포함될 WebSocket URL
APP_URL=http://localhost:3000/orders   # 트리거 때 사용할 기본 URL

# Rate Limiting
RATE_LIMIT_IP_PER_SEC=10              # IP 당 초당 요청 제한
RATE_LIMIT_USER_PER_MIN=100           # 사용자 당 분당 요청 제한
RATE_LIMIT_TRIGGER_PER_MIN=50         # 트리거 엔드포인트 특별 제한

# 페어링
PAIRING_SESSION_TTL=300000            # 페어링 세션 유효 시간 (ms, 기본 5분)
PAIRING_CODE_LENGTH=6                 # 확인 코드 자리수

# 로깅
LOG_LEVEL=info                        # 로그 레벨
LOG_FORMAT=json|pretty                # 로그 형식
```

### 5.2 설정 검증 로직 (utils/config.ts 확장)

```typescript
// server/src/utils/config.ts
import { z } from 'zod';

const configSchema = z.object({
  // 기존
  port: z.number().min(1).max(65535).default(3000),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  jwtSecret: z.string().min(32),
  corsOrigins: z.array(z.string()),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // T-014 추가
  dbType: z.enum(['memory', 'sqlite', 'postgres']).default('memory'),
  databaseUrl: z.string().url().optional(),
  databasePath: z.string().optional(),
  wsUrl: z.string().url(),
  appUrl: z.string().url(),
  rateLimitIpPerSec: z.number().min(1).default(10),
  rateLimitUserPerMin: z.number().min(1).default(100),
  rateLimitTriggerPerMin: z.number().min(1).default(50),
  pairingSessionTTL: z.number().min(60000).default(300000), // 1분~
  pairingCodeLength: z.number().min(4).max(8).default(6),
});

export function loadConfig() {
  const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV,
    jwtSecret: process.env.SOCKET_JWT_SECRET,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    logLevel: process.env.LOG_LEVEL,

    // T-014
    dbType: process.env.DB_TYPE,
    databaseUrl: process.env.DATABASE_URL,
    databasePath: process.env.DATABASE_PATH,
    wsUrl: process.env.WS_URL,
    appUrl: process.env.APP_URL,
    rateLimitIpPerSec: parseInt(process.env.RATE_LIMIT_IP_PER_SEC || '10', 10),
    rateLimitUserPerMin: parseInt(process.env.RATE_LIMIT_USER_PER_MIN || '100', 10),
    rateLimitTriggerPerMin: parseInt(process.env.RATE_LIMIT_TRIGGER_PER_MIN || '50', 10),
    pairingSessionTTL: parseInt(process.env.PAIRING_SESSION_TTL || '300000', 10),
    pairingCodeLength: parseInt(process.env.PAIRING_CODE_LENGTH || '6', 10),
  };

  // 검증
  const result = configSchema.safeParse(config);
  if (!result.success) {
    logger.error('설정 검증 실패: %O', result.error.errors);
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export function validateConfig(config: ReturnType<typeof loadConfig>) {
  // 데이터베이스 경로 검증
  if (config.dbType === 'postgres' && !config.databaseUrl) {
    throw new Error('DATABASE_URL이 필수입니다 (DB_TYPE=postgres)');
  }

  if (config.dbType === 'sqlite' && !config.databasePath) {
    logger.warn('DATABASE_PATH가 설정되지 않아 메모리 DB를 사용합니다');
  }

  // URL 검증
  if (!config.wsUrl.startsWith('ws')) {
    throw new Error('WS_URL은 ws:// 또는 wss://로 시작해야 합니다');
  }

  logger.info('설정 검증 완료: %O', {
    dbType: config.dbType,
    wsUrl: config.wsUrl,
    rateLimits: {
      ipPerSec: config.rateLimitIpPerSec,
      userPerMin: config.rateLimitUserPerMin,
    },
  });
}
```

### 5.3 .env 예제 파일

```bash
# .env.example

# === 기존 (T-012) ===
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# JWT 시크릿 (최소 32자)
SOCKET_JWT_SECRET=your-super-secret-key-minimum-32-characters-long!

# CORS 원본 (쉼표로 구분)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://app.example.com

# === T-014 추가 ===

# 데이터베이스 선택: memory (개발) | sqlite (프로토) | postgres (프로덕션)
DB_TYPE=memory

# PostgreSQL 연결 (DB_TYPE=postgres일 때만)
# DATABASE_URL=postgresql://user:password@localhost:5432/vooster

# SQLite 파일 경로 (DB_TYPE=sqlite일 때만)
# DATABASE_PATH=./data/vooster.db

# WebSocket URL (브라우저 확장이 연결할 주소)
WS_URL=ws://localhost:3000

# 앱 URL (트리거 때 사용할 기본 주소)
APP_URL=http://localhost:3000/orders

# Rate Limiting 설정
RATE_LIMIT_IP_PER_SEC=10
RATE_LIMIT_USER_PER_MIN=100
RATE_LIMIT_TRIGGER_PER_MIN=50

# 페어링 설정
PAIRING_SESSION_TTL=300000  # 5분 (ms)
PAIRING_CODE_LENGTH=6       # 6자리 확인 코드

# 로깅
LOG_FORMAT=pretty           # pretty | json
```

---

## 6. 라우터 구조 통합

### 6.1 현재 구조 분석

```
server/src/
├── index.ts                    # 메인 Express 앱, Socket.IO 설정
├── middleware/
│   ├── auth.ts                # Socket.IO JWT 검증
│   └── (어떤 Express 미들웨어 없음)
├── services/
│   ├── channelManager.ts       # Socket.IO 메시지 라우팅
│   ├── sessionService.ts       # 세션 관리
│   └── sessionPairingService.ts # 페어링 로직
├── events/
│   ├── handlers.ts             # Socket.IO 기본 네임스페이스 이벤트
│   └── displayHandlers.ts      # /display 네임스페이스 이벤트
└── types/
    └── index.ts                # 타입 정의
```

### 6.2 T-014 구조 추가

```
server/src/
├── index.ts                    # *** 수정: Express 라우터 등록 추가
├── middleware/
│   ├── auth.ts                 # (기존) Socket.IO JWT 검증
│   ├── expressAuth.ts          # *** NEW: Express Bearer 토큰 검증
│   ├── requestLogger.ts        # *** NEW: API 요청 로깅
│   └── errorHandler.ts         # *** NEW: Express 전역 에러 핸들러
├── routes/                     # *** NEW: API 엔드포인트
│   ├── displays.ts
│   ├── pairing.ts
│   └── triggers.ts
├── services/
│   ├── channelManager.ts       # (기존)
│   ├── displayService.ts       # *** NEW: 디스플레이 비즈니스 로직
│   ├── pairingService.ts       # *** NEW: 페어링 비즈니스 로직
│   ├── triggerService.ts       # *** NEW: 트리거 비즈니스 로직
│   └── loggingService.ts       # *** NEW: 로깅 유틸리티
├── repositories/               # *** NEW: 데이터 접근 계층
│   ├── types.ts
│   ├── index.ts
│   ├── memory/
│   │   ├── displayRepository.ts
│   │   ├── pairingRepository.ts
│   │   └── triggerLogRepository.ts
│   ├── sqlite/
│   │   └── ...
│   └── postgres/
│       └── ...
├── types/
│   ├── index.ts                # (기존) Socket.IO 타입
│   ├── display.ts              # *** NEW
│   ├── pairing.ts              # *** NEW
│   ├── trigger.ts              # *** NEW
│   ├── error.ts                # *** NEW
│   └── auth.ts                 # *** NEW
├── schemas/                    # *** NEW: Zod 검증
│   ├── index.ts
│   ├── display.ts
│   ├── pairing.ts
│   ├── trigger.ts
│   └── auth.ts
└── utils/
    ├── config.ts               # (수정) 환경변수 확장
    └── logger.ts               # (기존)
```

### 6.3 Express 라우터 레이아웃

#### 디스플레이 라우터 (routes/displays.ts)
```typescript
import express from 'express';
import { displayRegisterSchema, displayQuerySchema } from '../schemas';
import { bearerAuthMiddleware } from '../middleware/expressAuth';

const router = express.Router();

// 공개 엔드포인트: 디스플레이 등록 (heartbeat 포함)
router.post('/register', async (req, res) => {
  // 검증
  const parsed = displayRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, reason: 'validation_error', ... });
  }

  // DB 저장
  const display = await displayService.register(parsed.data);

  return res.json({
    ok: true,
    screenId: display.screenId,
    status: 'registered',
  });
});

// 보호된 엔드포인트: 디스플레이 목록 조회
router.get(
  '/',
  bearerAuthMiddleware(process.env.SOCKET_JWT_SECRET!),
  async (req, res) => {
    // 권한 확인 및 목록 조회
    // ...
  }
);

export default router;
```

#### 페어링 라우터 (routes/pairing.ts)
```typescript
const router = express.Router();

// 공개: QR 생성
router.post('/qr', async (req, res) => {
  // QR 생성 로직
});

// 공개: 폴링 (long polling)
router.get('/poll/:sessionId', async (req, res) => {
  // 폴링 로직
});

// 보호: 페어링 승인
router.post(
  '/approve',
  bearerAuthMiddleware(...),
  async (req, res) => {
    // 승인 로직
  }
);

export default router;
```

#### 트리거 라우터 (routes/triggers.ts)
```typescript
const router = express.Router();

// 보호: 트리거 전송
router.post(
  '/',
  bearerAuthMiddleware(...),
  rateLimitMiddleware(...),
  async (req, res) => {
    // 트리거 로직
  }
);

// 보호: 트리거 로그 조회
router.get(
  '/logs',
  bearerAuthMiddleware(...),
  async (req, res) => {
    // 로그 조회
  }
);

export default router;
```

### 6.4 Express 앱 초기화 (index.ts 수정)

```typescript
// server/src/index.ts
async function startServer() {
  try {
    // ... 기존 설정

    // *** T-014: 저장소 초기화
    await initializeRepositories();

    // ... Socket.IO 설정

    // *** T-014: 미들웨어 추가
    app.use(requestLoggerMiddleware);

    // *** T-014: 라우터 등록
    const displayRoutes = require('./routes/displays').default;
    const pairingRoutes = require('./routes/pairing').default;
    const triggerRoutes = require('./routes/triggers').default;

    app.use('/api/displays', displayRoutes);
    app.use('/api/pair', pairingRoutes);
    app.use('/api/trigger', triggerRoutes);

    // *** T-014: 전역 에러 핸들러
    app.use(errorHandlerMiddleware);

    // ... 서버 시작
  } catch (error) {
    logger.error('서버 시작 실패: %s', (error as Error).message);
    process.exit(1);
  }
}
```

### 6.5 미들웨어 적용 순서

```
요청
  ↓
요청 로깅 (requestLoggerMiddleware)
  ↓
Helmet 보안
  ↓
CORS
  ↓
요청 본문 파싱 (JSON)
  ↓
라우터별 처리
  ├─ public 경로 (인증 없음)
  │  └─ /api/displays/register
  │  └─ /api/pair/qr
  │  └─ /api/pair/poll/:sessionId
  └─ protected 경로 (인증 필요)
     └─ bearerAuthMiddleware
     └─ rateLimitMiddleware (필요시)
     └─ 핸들러
  ↓
에러 핸들러 (errorHandlerMiddleware)
  ↓
응답
```

---

## 7. 에러 처리 통합

### 7.1 Socket.IO 에러 (기존, T-012/T-013)

```typescript
// socket에서 에러 발생 시
socket.emit('error', { code: 'UNAUTHORIZED', message: '...' });
socket.disconnect(true);

// 서버에서 로깅
logger.error('Socket 에러: socketId=%s, code=%s', socket.id, error.code);
```

### 7.2 REST API 에러 (T-014 추가)

#### 통일된 에러 응답 형식
```typescript
// 모든 에러는 이 형식으로 반환
interface ErrorResponse {
  ok: false;
  reason: string;              // 프로그래밍 방식 처리용
  message?: string;            // 사용자 메시지 (한글)
  errors?: ValidationError[];  // 검증 에러 상세
  txId?: string;               // 메시지 추적용
}
```

#### HTTP 상태 코드 매핑
```
400 Bad Request (검증 실패)
  ├─ reason: 'validation_error'
  └─ errors: [{ field, message, code }]

401 Unauthorized (인증 실패)
  ├─ reason: 'unauthorized'
  └─ message: '인증이 필요합니다'

403 Forbidden (권한 부족)
  ├─ reason: 'forbidden'
  └─ message: '이 작업을 수행할 권한이 없습니다'

404 Not Found
  ├─ reason: 'not_found'
  └─ message: '요청한 리소스를 찾을 수 없습니다'

429 Too Many Requests (Rate Limit)
  ├─ reason: 'rate_limit'
  ├─ message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요'
  └─ (응답 헤더) Retry-After: 60

503 Service Unavailable (디스플레이 연결 안 됨)
  ├─ reason: 'no_clients'
  └─ message: '해당 디스플레이에 연결된 클라이언트가 없습니다'

500 Internal Server Error
  ├─ reason: 'internal_error'
  └─ message: '서버에 문제가 발생했습니다'
```

### 7.3 에러 처리 미들웨어

```typescript
// middleware/errorHandler.ts
export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const txId = (req as any).txId || crypto.randomUUID();

  // ApiError 클래스
  if (isApiError(err)) {
    logger.warn('API 에러: txId=%s, reason=%s, userId=%s, ip=%s',
      txId, err.reason, (req as any).auth?.userId || 'anonymous', req.ip);

    return res.status(err.statusCode).json({
      ok: false,
      reason: err.reason,
      message: err.userMessage,
      errors: err.context?.errors,
      txId,
    });
  }

  // Zod 검증 에러
  if (err instanceof z.ZodError) {
    const errors = zodErrorToValidationErrors(err);
    logger.warn('검증 에러: txId=%s, fields=%s',
      txId, errors.map(e => e.field).join(', '));

    return res.status(400).json({
      ok: false,
      reason: 'validation_error',
      message: '입력 데이터가 유효하지 않습니다',
      errors,
      txId,
    });
  }

  // 예상치 못한 에러
  logger.error('예상치 못한 에러: txId=%s, error=%s, stack=%s',
    txId, err.message, err.stack);

  return res.status(500).json({
    ok: false,
    reason: 'internal_error',
    message: '서버에 문제가 발생했습니다',
    txId,
  });
}
```

### 7.4 에러 로깅 전략

```typescript
// 레벨별 로깅
logger.debug('요청 처리 중: txId=%s', txId);      // 개발용
logger.info('트리거 전송: txId=%s', txId);        // 정상 작동
logger.warn('재시도 필요: txId=%s', txId);        // 경고
logger.error('처리 실패: txId=%s, error=%s', txId, err); // 에러

// 구조화된 로그 (JSON)
logger.info({
  action: 'trigger_sent',
  txId,
  screenId,
  jobNo,
  userId: auth.userId,
  status: 'delivered',
  clientCount: 2,
  duration: 45, // ms
  timestamp: new Date().toISOString(),
});
```

---

## 8. 마이그레이션 체크리스트

### Phase 1: 타입 및 스키마 (완료)
- [x] T-014-TYPE-DESIGN.md 작성
- [x] 타입 정의 (display, pairing, trigger, error, auth)
- [x] Zod 검증 스키마 작성

### Phase 2: 저장소 계층 (구현 예정)
- [ ] Repository 인터페이스 정의 (types.ts)
- [ ] MemoryRepository 구현
- [ ] SqliteRepository 구현
- [ ] PostgresRepository 구현
- [ ] 저장소 주입 메커니즘 (index.ts)

### Phase 3: 미들웨어 및 유틸리티 (구현 예정)
- [ ] expressAuth.ts (Bearer 토큰 검증)
- [ ] requestLogger.ts (API 요청 로깅)
- [ ] errorHandler.ts (전역 에러 처리)
- [ ] rateLimiter.ts (Rate limiting)

### Phase 4: 서비스 계층 (구현 예정)
- [ ] displayService.ts (디스플레이 관리)
- [ ] pairingService.ts (페어링 로직)
- [ ] triggerService.ts (트리거 실행)
- [ ] loggingService.ts (로깅 유틸리티)

### Phase 5: API 엔드포인트 (구현 예정)
- [ ] routes/displays.ts
  - [ ] POST /api/displays/register
  - [ ] GET /api/displays
- [ ] routes/pairing.ts
  - [ ] POST /api/pair/qr
  - [ ] GET /api/pair/poll/:sessionId
  - [ ] POST /api/pair/approve
- [ ] routes/triggers.ts
  - [ ] POST /api/trigger
  - [ ] GET /api/trigger/logs (선택)

### Phase 6: 데이터베이스 (구현 예정)
- [ ] displays 테이블 마이그레이션
- [ ] pair_sessions 테이블 마이그레이션
- [ ] trigger_logs 테이블 마이그레이션
- [ ] 인덱스 생성

### Phase 7: 테스트 (구현 예정)
- [ ] 단위 테스트 (Vitest)
- [ ] 통합 테스트
- [ ] E2E 테스트

### Phase 8: 배포 (구현 예정)
- [ ] Docker 이미지 빌드
- [ ] 환경변수 설정
- [ ] 데이터베이스 마이그레이션 실행

---

## 9. 통합 테스트 시나리오

### 시나리오 1: 전체 페어링 및 트리거 플로우

```typescript
describe('T-014 디스플레이 등록, 페어링, 트리거 전체 플로우', () => {
  it('디스플레이 등록 → 페어링 승인 → 트리거 전송 → ACK 수신', async () => {
    // 1. 디스플레이 등록
    const registerRes = await POST('/api/displays/register', {
      deviceId: 'device-001',
      name: '제1라인 모니터',
      purpose: '제조 공정 모니터링',
      orgId: 'prod',
      lineId: 'line-1',
    });
    assert(registerRes.ok === true);
    assert(registerRes.screenId === 'screen:prod:line-1');

    // 2. QR 생성
    const qrRes = await POST('/api/pair/qr');
    assert(qrRes.ok === true);
    const sessionId = qrRes.sessionId;

    // 3. 페어링 승인 (스마트폰 → 서버)
    const approveRes = await POST(
      '/api/pair/approve',
      { sessionId, code: qrRes.code },
      { headers: { Authorization: `Bearer ${mobileUserToken}` } }
    );
    assert(approveRes.ok === true);
    const displayToken = approveRes.token;

    // 4. 브라우저 확장이 Socket.IO로 연결
    const socket = io('ws://localhost:3000/display', {
      auth: {
        token: displayToken,
        deviceId: 'device-001',
        screenId: 'screen:prod:line-1',
      },
    });

    // Socket.IO 인증
    await new Promise(resolve => {
      socket.on('auth_success', resolve);
    });

    // 5. 트리거 전송 (스마트폰 → 서버)
    const triggerRes = await POST(
      '/api/trigger',
      { screenId: 'screen:prod:line-1', jobNo: 'JOB-001' },
      { headers: { Authorization: `Bearer ${mobileUserToken}` } }
    );
    assert(triggerRes.ok === true);
    assert(triggerRes.clientCount === 1);

    // 6. 브라우저 확장이 'navigate' 이벤트 수신
    const navigateEvent = await new Promise(resolve => {
      socket.once('navigate', resolve);
    });
    assert(navigateEvent.url.includes('JOB-001'));

    // 7. 브라우저 확장이 ACK 전송
    socket.emit('ack', {
      txId: navigateEvent.txId,
      result: 'success',
    });

    // 8. 트리거 로그 확인
    const logs = await GET(
      '/api/trigger/logs',
      { headers: { Authorization: `Bearer ${mobileUserToken}` } }
    );
    assert(logs.length > 0);
    assert(logs[0].status === 'delivered');
    assert(logs[0].txId === navigateEvent.txId);

    socket.disconnect();
  });
});
```

---

## 10. 주요 통합점 요약

| 통합점 | T-012/T-013 | T-014 | 연결 방식 |
|--------|-----------|-------|---------|
| Socket.IO 메시지 | emitToChannel() | 트리거 API | 직접 호출 |
| JWT 검증 | verifyDisplayToken() | REST API + Socket.IO | 같은 시크릿 |
| 채널 구독 | subscribeToChannel() | 페어링 후 자동 | Socket 기반 |
| ACK 로깅 | logAck() | trigger_logs 테이블 | 데이터베이스 |
| 환경설정 | SOCKET_JWT_SECRET | 확장 변수 추가 | .env 통합 |
| 저장소 | 인메모리 세션 | DB 추상화 계층 | Repository 패턴 |
| 에러 처리 | Socket 에러 이벤트 | HTTP 상태 코드 | 미들웨어 통합 |
| 로깅 | Pino logger | 구조화된 로그 | 동일 로거 재사용 |

---

## 11. 구현 우선순위

### High Priority
1. Express 미들웨어 (auth, error handler)
2. Repository 패턴 기본 구현 (MemoryRepository)
3. 트리거 API (가장 중요한 기능)
4. 페어링 API

### Medium Priority
5. 디스플레이 등록 API
6. Rate limiting 미들웨어
7. 데이터베이스 마이그레이션

### Low Priority
8. SQLite/PostgreSQL Repository
9. 트리거 로그 조회 API
10. 모니터링 대시보드

---

## 12. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Socket.IO와 REST API 토큰 불일치 | 높음 | 단일 JWT_SECRET 사용 |
| 트리거 메시지 손실 | 높음 | emitToChannel() 결과 확인 + 로깅 |
| 데이터베이스 마이그레이션 실패 | 높음 | 저장소 추상화 + 단계적 도입 |
| Rate limit 우회 | 중간 | IP + 사용자 이중 제한 |
| 권한 검증 누락 | 높음 | 모든 보호된 엔드포인트에 미들웨어 필수 |

---

## 결론

T-014의 성공적인 통합은 다음 요소에 달려 있습니다:

1. **Socket.IO 재사용**: `emitToChannel()` 함수를 그대로 활용하여 메시지 전송
2. **JWT 통일**: 같은 시크릿으로 Socket.IO와 REST API 모두 인증
3. **저장소 추상화**: 처음부터 Repository 패턴으로 설계하여 DB 독립성 확보
4. **점진적 도입**: 인메모리 → SQLite → PostgreSQL 순서로 마이그레이션
5. **일관된 에러 처리**: 모든 에러를 표준화된 JSON 응답으로 변환
6. **포괄적 로깅**: 모든 API 호출과 중요 이벤트를 기록하여 디버깅 및 감시 가능

**다음 단계**: T-014 구현 시작 시 이 문서의 각 섹션을 참고하여 단계적으로 통합하세요.

---

**작성일**: 2025-10-25
**버전**: 1.0
**상태**: 분석 완료, T-014 구현 대기
