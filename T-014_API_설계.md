# T-014 "디스플레이 등록, 페어링 및 트리거 API" - 상세 설계 문서

## 📋 개요

본 문서는 T-014 태스크의 API 엔드포인트 및 데이터베이스 스키마를 상세하게 설계합니다.

**작성 대상:** 백엔드 개발자
**작성일:** 2025-10-25
**상태:** 설계 단계

---

## 목차
1. [API 엔드포인트 상세 설계](#1-api-엔드포인트-상세-설계)
2. [데이터베이스 스키마](#2-데이터베이스-스키마)
3. [인증 및 권한 설계](#3-인증-및-권한-설계)
4. [레이트 리미팅 전략](#4-레이트-리미팅-전략)
5. [에러 응답 표준화](#5-에러-응답-표준화)
6. [성능 및 확장성](#6-성능-및-확장성)
7. [보안 고려사항](#7-보안-고려사항)
8. [마이그레이션 전략](#8-마이그레이션-전략)

---

## 1. API 엔드포인트 상세 설계

### 1.1 디스플레이 등록 API

#### 엔드포인트
```
POST /api/displays/register
```

#### 설명
디스플레이 기기가 시스템에 자신을 등록합니다. 처음 등록시 새로운 screenId를 생성하고, 기존 디바이스의 재등록시 상태를 업데이트합니다.

#### 인증
선택적 (deviceId만으로도 등록 가능, 하지만 JWT 포함시 더 안전한 프로세스)

#### 요청 헤더
```http
Content-Type: application/json
Authorization: Bearer <JWT> (선택사항)
```

#### 요청 본문
```typescript
{
  // 필수
  deviceId: string;        // 디바이스 고유 ID (UUID 또는 MAC 주소)
  name: string;            // 화면 이름 (1-100자, 예: "Pack Line 1")
  purpose: string;         // 용도 (1-255자, 예: "work_instruction")

  // 선택사항 (JWT 포함시 무시될 수 있음)
  orgId?: string;          // 조직 ID (1-100자)
  lineId?: string;         // 라인 ID (1-100자)

  // 메타데이터
  userAgent?: string;      // 클라이언트 정보
  clientVersion?: string;  // 클라이언트 버전
}
```

#### 검증 규칙
```
- deviceId: UUID 형식 또는 MAC 주소 (UUID 권장)
- name: 1-100자, 특수문자 제한 (alphanumeric, 하이픈, 언더스코어 허용)
- purpose: 1-255자, 단어 또는 snake_case
- orgId: 1-100자, UUID 권장
- lineId: 1-100자, UUID 권장
```

#### 응답 200 OK
```typescript
{
  ok: true;
  screenId: string;        // "screen:<orgId>:<lineId>" 형식
  status: "registered" | "updated";  // 신규 등록 vs 업데이트
  message: string;         // "화면이 등록되었습니다" 등

  // 추가 정보
  expiresAt?: ISO 8601;    // heartbeat 타임스탬프
}
```

#### 응답 400 Bad Request
```typescript
{
  ok: false;
  reason: "validation_error";
  errors: [
    {
      field: "deviceId",
      message: "유효한 UUID가 아닙니다"
    },
    {
      field: "name",
      message: "1-100자여야 합니다"
    }
  ];
}
```

#### 응답 409 Conflict
```typescript
{
  ok: false;
  reason: "device_conflict";
  message: "이미 다른 조직/라인에 등록된 디바이스입니다",
  existingScreenId: string;
}
```

#### 응답 500 Internal Server Error
```typescript
{
  ok: false;
  reason: "server_error";
  message: "데이터베이스 오류가 발생했습니다";
}
```

#### 구현 예시 (TypeScript)
```typescript
// 요청 검증 (Zod)
const RegisterDisplaySchema = z.object({
  deviceId: z.string().uuid('유효한 UUID가 아닙니다'),
  name: z.string().min(1).max(100, '1-100자여야 합니다'),
  purpose: z.string().min(1).max(255),
  orgId: z.string().uuid().optional(),
  lineId: z.string().uuid().optional(),
});

// 비즈니스 로직
async function registerDisplay(req: Request, res: Response) {
  const { deviceId, name, purpose, orgId, lineId } = req.body;

  // 1. 기존 디바이스 확인
  const existing = await displays.findByDeviceId(deviceId);
  if (existing && existing.orgId !== orgId) {
    return res.status(409).json({
      ok: false,
      reason: 'device_conflict',
      existingScreenId: existing.screenId,
    });
  }

  // 2. screenId 생성 또는 기존값 사용
  const screenId = existing?.screenId || `screen:${orgId}:${lineId}`;

  // 3. 데이터베이스 저장 또는 업데이트
  await displays.upsert({
    deviceId,
    screenId,
    name,
    purpose,
    orgId,
    lineId,
    status: 'online',
    lastSeenAt: new Date(),
  });

  return res.json({
    ok: true,
    screenId,
    status: existing ? 'updated' : 'registered',
    message: existing ? '화면 정보가 업데이트되었습니다' : '화면이 등록되었습니다',
  });
}
```

---

### 1.2 디스플레이 목록 조회 API

#### 엔드포인트
```
GET /api/displays
```

#### 설명
인증된 사용자가 자신이 접근 가능한 디스플레이 목록을 조회합니다.

#### 인증
필수 (JWT Bearer 토큰)

#### 요청 헤더
```http
Authorization: Bearer <JWT>
```

#### 쿼리 파라미터
```
lineId?:string      # 특정 라인의 디스플레이만 필터링
onlineOnly?:boolean # true면 온라인 상태만 반환 (기본값: false)
limit?:number       # 반환할 최대 항목 수 (기본값: 100, 최대: 1000)
offset?:number      # 페이지네이션 오프셋 (기본값: 0)
```

#### 응답 200 OK
```typescript
{
  ok: true;
  displays: [
    {
      screenId: string;
      deviceId: string;
      name: string;
      purpose: string;
      online: boolean;
      lastSeen: ISO 8601;    // 마지막 heartbeat 시간
      status: "online" | "offline";
      uptime?: number;       // 초 단위
      version?: string;      // 클라이언트 버전
    }
  ];
  total: number;             // 전체 항목 수
  limit: number;
  offset: number;
}
```

#### 응답 401 Unauthorized
```typescript
{
  ok: false;
  reason: "unauthorized";
  message: "인증이 필요합니다";
}
```

#### 응답 403 Forbidden
```typescript
{
  ok: false;
  reason: "forbidden";
  message: "이 리소스에 접근할 권한이 없습니다";
}
```

#### 구현 예시
```typescript
async function getDisplays(req: Request, res: Response) {
  // 1. 권한 확인 (토큰에서 orgId 추출)
  const user = req.user; // 인증 미들웨어에서 설정
  const orgId = user.orgId;

  // 2. 쿼리 파라미터 검증
  const { lineId, onlineOnly, limit = 100, offset = 0 } = req.query;

  // 3. 데이터베이스 조회
  const query = displays.where({ orgId });

  if (lineId) {
    query.where({ lineId });
  }

  if (onlineOnly === 'true') {
    const onlineThreshold = new Date(Date.now() - 60000); // 60초 이내
    query.where({ lastSeenAt: { $gte: onlineThreshold } });
  }

  const total = await query.count();
  const records = await query
    .limit(Math.min(limit, 1000))
    .offset(offset)
    .orderBy('lastSeenAt', 'DESC')
    .all();

  // 4. 응답 생성
  const displayList = records.map(r => ({
    screenId: r.screenId,
    deviceId: r.deviceId,
    name: r.name,
    purpose: r.purpose,
    online: isOnline(r.lastSeenAt),
    lastSeen: r.lastSeenAt.toISOString(),
    status: isOnline(r.lastSeenAt) ? 'online' : 'offline',
  }));

  return res.json({
    ok: true,
    displays: displayList,
    total,
    limit: Math.min(limit, 1000),
    offset,
  });
}

// 헬퍼 함수
function isOnline(lastSeenAt: Date): boolean {
  return Date.now() - lastSeenAt.getTime() < 60000; // 60초 이내면 온라인
}
```

---

### 1.3 페어링 QR 생성 API

#### 엔드포인트
```
POST /api/pair/qr
```

#### 설명
모바일 앱에서 디스플레이와 페어링하기 위한 QR 코드 데이터를 생성합니다. 이 데이터는 QR 코드로 인코딩되어 디스플레이의 QR 판독기에 표시됩니다.

#### 인증
선택사항 (비인증 사용자도 페어링 세션 생성 가능)

#### 요청 본문
```json
{}
```

#### 응답 200 OK
```typescript
{
  ok: true;
  sessionId: string;        // UUID (페어링 세션 ID)
  qrData: string;           // JSON.stringify({ sessionId, code, wsUrl })
  expiresIn: number;        // 초 단위 (300 = 5분)

  // 추가 정보
  createdAt: ISO 8601;
  pollUrl: string;          // 클라이언트가 폴링할 URL
}
```

#### 응답 예시 (실제 QR 컨텐츠)
```typescript
// qrData 필드의 실제 내용
{
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  code: "123456",              // 6자리 숫자
  wsUrl: "wss://example.com/display",  // WebSocket 주소 (현재는 REST polling 사용)
  pollUrl: "/api/pair/poll/550e8400-e29b-41d4-a716-446655440000"
}

// 이를 JSON 문자열화하면 QR 코드로 인코딩
```

#### 응답 500 Server Error
```typescript
{
  ok: false;
  reason: "server_error";
  message: "세션 생성에 실패했습니다";
}
```

#### 구현 예시
```typescript
import { v4 as uuidv4 } from 'uuid';

async function createPairingQR(req: Request, res: Response) {
  // 1. 페어링 세션 생성
  const sessionId = uuidv4();
  const code = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0'); // 6자리 숫자

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분

  // 2. 데이터베이스에 저장
  await pairingSessions.create({
    sessionId,
    code,
    status: 'pending',
    expiresAt,
  });

  // 3. QR 데이터 생성
  const qrData = JSON.stringify({
    sessionId,
    code,
    wsUrl: process.env.WS_URL || 'wss://example.com/display',
    pollUrl: `/api/pair/poll/${sessionId}`,
  });

  // 4. 응답
  return res.json({
    ok: true,
    sessionId,
    qrData,
    expiresIn: 300,
    createdAt: new Date().toISOString(),
    pollUrl: `/api/pair/poll/${sessionId}`,
  });
}
```

---

### 1.4 페어링 폴링 API

#### 엔드포인트
```
GET /api/pair/poll/:sessionId
```

#### 설명
모바일 클라이언트가 페어링 승인 여부를 확인하기 위해 주기적으로 폴링합니다. Long Polling을 사용하여 30초 동안 대기한 후 응답합니다.

#### 인증
선택사항 (세션ID만으로 충분)

#### 경로 파라미터
```
sessionId: string  # UUID 형식의 페어링 세션 ID
```

#### 응답 200 OK (승인됨)
```typescript
{
  ok: true;
  token: string;            // JWT 토큰 (display scope 포함)
  screenId: string;         // "screen:orgId:lineId"
  expiresIn: number;        // 초 단위 (600 = 10분)

  // JWT 토큰 페이로드 예시:
  // {
  //   sub: "display:<screenId>",
  //   scopes: ["display:screen:<orgId>:<lineId>"],
  //   deviceId: "<deviceId>",
  //   exp: 1729858825,
  //   iat: 1729858225
  // }
}
```

#### 응답 200 OK (대기 중, 타임아웃)
```typescript
{
  ok: false;
  reason: "timeout";
  message: "30초 동안 응답이 없습니다. 다시 시도하세요";
}
```

#### 응답 404 Not Found
```typescript
{
  ok: false;
  reason: "not_found";
  message: "세션을 찾을 수 없습니다";
}
```

#### 응답 410 Gone (만료됨)
```typescript
{
  ok: false;
  reason: "expired";
  message: "세션이 만료되었습니다. 새 QR 코드를 생성하세요";
}
```

#### 구현 예시 (Long Polling)
```typescript
async function pollPairingStatus(req: Request, res: Response) {
  const { sessionId } = req.params;

  // 1. 세션 조회
  let session = await pairingSessions.findById(sessionId);

  if (!session) {
    return res.status(404).json({
      ok: false,
      reason: 'not_found',
    });
  }

  // 2. 만료 여부 확인
  if (new Date() > session.expiresAt) {
    return res.status(410).json({
      ok: false,
      reason: 'expired',
    });
  }

  // 3. 이미 승인됨 확인
  if (session.status === 'approved' && session.token) {
    return res.json({
      ok: true,
      token: session.token,
      screenId: session.screenId,
      expiresIn: 600,
    });
  }

  // 4. Long Polling (30초 대기)
  const startTime = Date.now();
  const pollInterval = 500; // 500ms마다 확인
  const maxWaitTime = 30000; // 30초

  while (Date.now() - startTime < maxWaitTime) {
    // 500ms 대기
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    // 다시 조회
    session = await pairingSessions.findById(sessionId);

    // 상태 확인
    if (session?.status === 'approved' && session.token) {
      return res.json({
        ok: true,
        token: session.token,
        screenId: session.screenId,
        expiresIn: 600,
      });
    }

    // 만료 확인
    if (new Date() > session!.expiresAt) {
      return res.status(410).json({
        ok: false,
        reason: 'expired',
      });
    }
  }

  // 5. 타임아웃
  return res.json({
    ok: false,
    reason: 'timeout',
  });
}
```

---

### 1.5 페어링 승인 API

#### 엔드포인트
```
POST /api/pair/approve
```

#### 설명
관리자 또는 인증된 사용자가 대기 중인 페어링 요청을 승인합니다. 이를 통해 디스플레이에 유효한 JWT 토큰을 발급합니다.

#### 인증
필수 (JWT Bearer 토큰, 사용자 식별 목적)

#### 요청 헤더
```http
Content-Type: application/json
Authorization: Bearer <JWT>
```

#### 요청 본문
```typescript
{
  sessionId: string;     // UUID 형식의 페어링 세션 ID
  code: string;          // 6자리 숫자 코드
  deviceId?: string;     // 추가 검증용 (선택사항)
}
```

#### 응답 200 OK
```typescript
{
  ok: true;
  token: string;         // 디스플레이용 JWT 토큰
  screenId: string;      // "screen:orgId:lineId"
  message: string;       // "디스플레이가 승인되었습니다"
}
```

#### 응답 400 Bad Request
```typescript
{
  ok: false;
  reason: "invalid_session" | "invalid_code" | "expired";
  message: string;  // 구체적인 오류 메시지
}
```

#### 응답 401 Unauthorized
```typescript
{
  ok: false;
  reason: "unauthorized";
  message: "인증이 필요합니다";
}
```

#### 구현 예시
```typescript
import jwt from 'jsonwebtoken';

async function approvePairing(req: Request, res: Response) {
  const { sessionId, code, deviceId } = req.body;
  const user = req.user; // 인증 미들웨어에서 설정

  // 1. 입력 검증
  if (!sessionId || !code) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_error',
      errors: [
        { field: 'sessionId', message: '필수 필드입니다' },
        { field: 'code', message: '필수 필드입니다' },
      ],
    });
  }

  // 2. 세션 조회
  const session = await pairingSessions.findById(sessionId);

  if (!session) {
    return res.status(400).json({
      ok: false,
      reason: 'invalid_session',
      message: '유효하지 않은 세션입니다',
    });
  }

  // 3. 만료 여부 확인
  if (new Date() > session.expiresAt) {
    return res.status(400).json({
      ok: false,
      reason: 'expired',
      message: '세션이 만료되었습니다',
    });
  }

  // 4. 코드 검증
  if (session.code !== code) {
    return res.status(400).json({
      ok: false,
      reason: 'invalid_code',
      message: '코드가 일치하지 않습니다',
    });
  }

  // 5. 토큰 생성
  const screenId = `screen:${session.orgId}:${session.lineId}`;
  const token = jwt.sign(
    {
      sub: `display:${screenId}`,
      scopes: [`display:${screenId}`],
      deviceId: session.deviceId,
      type: 'display',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );

  // 6. 세션 업데이트
  await pairingSessions.update(sessionId, {
    status: 'approved',
    token,
    approvedBy: user.id,
    updatedAt: new Date(),
  });

  // 7. 응답
  return res.json({
    ok: true,
    token,
    screenId,
    message: '디스플레이가 승인되었습니다',
  });
}
```

---

### 1.6 트리거 API

#### 엔드포인트
```
POST /api/trigger
```

#### 설명
시스템이 특정 디스플레이로 트리거 신호를 전송합니다. 이를 통해 실시간 지시사항, 주문 정보 등을 디스플레이에 전달합니다.

#### 인증
필수 (JWT Bearer 토큰, 사용자 또는 시스템)

#### 레이트 리미팅
- **IP 기반:** 초당 10회
- **사용자 기반:** 분당 100회
- **내부 API:** 제외 (특정 IP 범위)

#### 요청 헤더
```http
Content-Type: application/json
Authorization: Bearer <JWT>
X-Request-ID: <UUID> (선택사항, 중복 방지용)
```

#### 요청 본문
```typescript
{
  screenId: string;        // "screen:orgId:lineId"
  jobNo: string;           // 1-50자, 작업/주문 번호

  // 선택사항
  data?: Record<string, any>;  // 추가 데이터 (JSON)
  priority?: "high" | "normal" | "low";  // 기본값: "normal"
  timeout?: number;        // 밀리초 (기본값: 5000)
}
```

#### 응답 200 OK
```typescript
{
  ok: true;
  txId: string;            // UUID (거래 ID, 중복 방지)
  clientCount: number;     // 메시지를 받은 연결된 클라이언트 수
  message: string;         // "트리거가 전송되었습니다"

  // 추가 정보
  timestamp: ISO 8601;
  screenId: string;
}
```

#### 응답 400 Bad Request
```typescript
{
  ok: false;
  reason: "validation_error";
  errors: [
    {
      field: "screenId",
      message: "유효한 screenId가 아닙니다"
    },
    {
      field: "jobNo",
      message: "1-50자여야 합니다"
    }
  ];
}
```

#### 응답 403 Forbidden
```typescript
{
  ok: false;
  reason: "forbidden";
  message: "이 화면에 접근할 권한이 없습니다";
}
```

#### 응답 429 Too Many Requests
```typescript
{
  ok: false;
  reason: "rate_limit_exceeded";
  retryAfter: number;  // 초 단위
  message: "너무 많은 요청을 보냈습니다";
}
```

#### 응답 503 Service Unavailable
```typescript
{
  ok: false;
  reason: "no_clients";
  message: "연결된 클라이언트가 없습니다";
}
```

#### 구현 예시
```typescript
import { emitToChannel } from '../services/channelManager';
import { v4 as uuidv4 } from 'uuid';

async function sendTrigger(req: Request, res: Response) {
  const { screenId, jobNo, data, priority = 'normal' } = req.body;
  const user = req.user; // 인증 미들웨어에서 설정
  const txId = req.headers['x-request-id'] as string || uuidv4();

  // 1. 입력 검증
  const schema = z.object({
    screenId: z.string().regex(/^screen:[a-f0-9-]+:[a-f0-9-]+$/),
    jobNo: z.string().min(1).max(50),
    data: z.record(z.any()).optional(),
    priority: z.enum(['high', 'normal', 'low']).optional(),
  });

  const validation = schema.safeParse({ screenId, jobNo, data, priority });
  if (!validation.success) {
    return res.status(400).json({
      ok: false,
      reason: 'validation_error',
      errors: validation.error.errors.map(e => ({
        field: e.path[0],
        message: e.message,
      })),
    });
  }

  // 2. 권한 확인
  const hasPermission = user.scopes?.includes(`display:${screenId}`);
  if (!hasPermission && !isInternalAPI(req)) {
    return res.status(403).json({
      ok: false,
      reason: 'forbidden',
      message: '이 화면에 접근할 권한이 없습니다',
    });
  }

  // 3. 레이트 리미팅 체크 (미들웨어에서 먼저 확인되지만 추가 확인)
  const isRateLimited = await checkRateLimit(user.id, screenId);
  if (isRateLimited) {
    return res.status(429).json({
      ok: false,
      reason: 'rate_limit_exceeded',
      retryAfter: 60,
    });
  }

  // 4. Socket.IO로 메시지 전송
  try {
    const clientCount = await emitToChannel(screenId, 'trigger', {
      txId,
      jobNo,
      data,
      priority,
      timestamp: new Date().toISOString(),
    });

    // 연결된 클라이언트가 없으면 503
    if (clientCount === 0) {
      return res.status(503).json({
        ok: false,
        reason: 'no_clients',
        message: '연결된 클라이언트가 없습니다',
      });
    }

    // 5. 로그 기록
    await triggerLogs.create({
      userId: user.id,
      screenId,
      jobNo,
      txId,
      status: 'delivered',
      clientCount,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });

    // 6. 응답
    return res.json({
      ok: true,
      txId,
      clientCount,
      message: '트리거가 전송되었습니다',
      timestamp: new Date().toISOString(),
      screenId,
    });

  } catch (error) {
    logger.error('트리거 전송 실패', { screenId, jobNo, error });
    return res.status(500).json({
      ok: false,
      reason: 'server_error',
      message: '트리거 전송에 실패했습니다',
    });
  }
}
```

---

## 2. 데이터베이스 스키마

### 2.1 displays 테이블

#### 목적
시스템에 등록된 모든 디스플레이 기기의 정보를 저장합니다.

#### CREATE TABLE
```sql
CREATE TABLE displays (
  -- 기본키
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- 식별자
  device_id VARCHAR(100) NOT NULL UNIQUE COMMENT '디바이스 고유 ID',
  screen_id VARCHAR(100) NOT NULL UNIQUE COMMENT 'screen:orgId:lineId',

  -- 정보
  name VARCHAR(100) NOT NULL COMMENT '화면 이름',
  purpose VARCHAR(255) COMMENT '용도',

  -- 조직 정보
  org_id VARCHAR(100) NOT NULL COMMENT '조직 ID',
  line_id VARCHAR(100) NOT NULL COMMENT '라인 ID',

  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'online' COMMENT 'online | offline',
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 heartbeat',

  -- 메타데이터
  user_agent TEXT COMMENT '클라이언트 정보',
  client_version VARCHAR(50) COMMENT '클라이언트 버전',

  -- 타임스탐프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  KEY idx_device_id (device_id),
  KEY idx_screen_id (screen_id),
  KEY idx_line_id (line_id),
  KEY idx_status (status),
  KEY idx_last_seen_at (last_seen_at DESC),
  KEY idx_org_line (org_id, line_id),

  CONSTRAINT check_status CHECK (status IN ('online', 'offline'))
);
```

#### 인덱스 전략
```
1. device_id (UNIQUE)
   - 디바이스 재등록 시 빠른 조회
   - 중복 등록 방지

2. screen_id (UNIQUE)
   - 트리거 API에서 빠른 조회
   - 각 screenId는 유일함을 보장

3. line_id (일반 인덱스)
   - GET /api/displays?lineId=... 필터링
   - 라인별 조회 성능 향상

4. status (일반 인덱스)
   - GET /api/displays?onlineOnly=true 필터링
   - online 상태만 빠르게 조회

5. last_seen_at (내림차순)
   - offline 처리 로직에서 사용
   - 60초 이상 미갱신 디스플레이 검색
   - 정기 정리(cron)에서 활용

6. (org_id, line_id) 복합 인덱스
   - screenId 생성 시 중복 검사
   - 조직+라인별 디스플레이 조회
```

#### 쿼리 예시
```sql
-- 1. 디바이스 조회 (등록/재등록)
SELECT * FROM displays WHERE device_id = 'uuid-xxx';

-- 2. screenId로 조회 (트리거)
SELECT * FROM displays WHERE screen_id = 'screen:org-id:line-id';

-- 3. 라인별 온라인 디스플레이
SELECT * FROM displays
WHERE org_id = 'org-id'
  AND line_id = 'line-id'
  AND status = 'online'
  AND last_seen_at > DATE_SUB(NOW(), INTERVAL 60 SECOND);

-- 4. 온라인 상태 일괄 변경 (30분+ offline)
UPDATE displays
SET status = 'offline'
WHERE last_seen_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE);

-- 5. 오래된 데이터 삭제 (90일+)
DELETE FROM displays
WHERE status = 'offline'
  AND updated_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

### 2.2 pair_sessions 테이블

#### 목적
페어링 프로세스 중의 임시 세션 정보를 저장합니다. 5분 후 자동 만료됩니다.

#### CREATE TABLE
```sql
CREATE TABLE pair_sessions (
  -- 기본키
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- 세션 식별자
  session_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID',
  code VARCHAR(6) NOT NULL COMMENT '6자리 숫자 인증 코드',

  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending | approved | expired',

  -- 디바이스 정보 (승인 전 null)
  device_id VARCHAR(100) COMMENT '디바이스 ID',
  org_id VARCHAR(100) COMMENT '조직 ID',
  line_id VARCHAR(100) COMMENT '라인 ID',

  -- 토큰 (승인 후)
  token LONGTEXT COMMENT 'JWT 토큰',

  -- 승인 정보
  approved_by VARCHAR(100) COMMENT '승인한 사용자 ID',
  approved_at TIMESTAMP NULL COMMENT '승인 시간',

  -- TTL
  expires_at TIMESTAMP NOT NULL COMMENT '만료 시간 (생성 후 5분)',

  -- 타임스탐프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  KEY idx_session_id (session_id),
  KEY idx_status (status),
  KEY idx_expires_at (expires_at DESC),
  KEY idx_code (code),

  CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'expired'))
);
```

#### 인덱스 전략
```
1. session_id (UNIQUE)
   - 폴링 API에서 빠른 조회
   - 각 세션은 유일함을 보장

2. status (일반 인덱스)
   - pending 상태만 필터링 (폴링)
   - approved 상태 확인 (빠른 응답)

3. expires_at (내림차순)
   - 만료된 세션 정리(cron)에서 사용
   - "WHERE expires_at < NOW()"로 정기 삭제

4. code (일반 인덱스)
   - 승인 시 코드 검증 (선택사항)
   - 6자리 숫자이므로 중복 가능성 낮음
```

#### 정기 정리 쿼리
```sql
-- 매 5분마다 실행 (cron job)
DELETE FROM pair_sessions
WHERE expires_at < NOW();

-- 또는 5분 이상 pending 상태
DELETE FROM pair_sessions
WHERE status = 'pending'
  AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
```

---

### 2.3 trigger_logs 테이블

#### 목적
모든 트리거 호출을 기록하여 감시, 감사, 성능 분석에 사용합니다.

#### CREATE TABLE
```sql
CREATE TABLE trigger_logs (
  -- 기본키
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- 거래 정보
  tx_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID (중복 방지)',

  -- 사용자/권한
  user_id VARCHAR(100) NOT NULL COMMENT '호출한 사용자 ID',

  -- 대상
  screen_id VARCHAR(100) NOT NULL COMMENT 'screen:orgId:lineId',
  job_no VARCHAR(50) NOT NULL COMMENT '작업/주문 번호',

  -- 결과
  status VARCHAR(20) NOT NULL COMMENT 'delivered | missed | timeout',
  client_count INT DEFAULT 0 COMMENT '메시지를 받은 클라이언트 수',

  -- 요청 정보
  ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6',
  user_agent TEXT COMMENT 'HTTP User-Agent',

  -- 타임스탐프
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 인덱스
  KEY idx_tx_id (tx_id),
  KEY idx_user_id (user_id),
  KEY idx_screen_id (screen_id),
  KEY idx_status (status),
  KEY idx_timestamp (timestamp DESC),
  KEY idx_user_screen (user_id, screen_id),

  CONSTRAINT check_status CHECK (status IN ('delivered', 'missed', 'timeout'))
);
```

#### 인덱스 전략
```
1. tx_id (UNIQUE)
   - 중복 메시지 필터링
   - 특정 거래 추적

2. user_id (일반 인덱스)
   - 사용자별 호출 히스토리
   - 감사(audit) 로그 조회

3. screen_id (일반 인덱스)
   - 디스플레이별 트리거 히스토리
   - 화면 성능 분석

4. status (일반 인덱스)
   - 실패한 트리거 조회 (status != 'delivered')
   - 문제 분석

5. timestamp (내림차순)
   - 최근 기록부터 빠르게 조회
   - 로그 윈도우 쿼리 (마지막 1시간 등)

6. (user_id, screen_id) 복합 인덱스
   - 특정 사용자의 특정 화면에 대한 호출 조회
   - 권한 감사 및 사용 패턴 분석
```

#### 쿼리 예시
```sql
-- 1. 중복 메시지 확인
SELECT COUNT(*) FROM trigger_logs WHERE tx_id = 'uuid-xxx';

-- 2. 사용자별 호출 통계
SELECT user_id, COUNT(*) as calls,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered
FROM trigger_logs
WHERE timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY user_id;

-- 3. 실패한 트리거 조회
SELECT * FROM trigger_logs
WHERE status != 'delivered'
  AND timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY timestamp DESC;

-- 4. 화면별 트리거 통계
SELECT screen_id, COUNT(*) as total, AVG(client_count) as avg_clients
FROM trigger_logs
WHERE timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY screen_id;

-- 5. 레이트 리미팅 검증 (분당 100회)
SELECT COUNT(*) as calls_per_minute
FROM trigger_logs
WHERE user_id = 'user-id'
  AND timestamp > DATE_SUB(NOW(), INTERVAL 1 MINUTE);

-- 6. 오래된 로그 삭제 (90일+)
DELETE FROM trigger_logs
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

### 2.4 관계도 및 제약사항

#### 테이블 간 관계
```
displays (1:N) <- pair_sessions
  - displays.device_id = pair_sessions.device_id
  - pair_sessions는 임시 데이터 (5분 TTL)

displays (1:N) <- trigger_logs
  - displays.screen_id = trigger_logs.screen_id
  - trigger_logs는 영구 저장 (감사용)
```

#### 제약사항
```
1. displays.device_id 유니크
   - 같은 디바이스는 한 번에 하나의 screenId만 가질 수 있음

2. displays.screen_id 유니크
   - 각 screenId는 유일함을 보장

3. pair_sessions.session_id 유니크
   - 각 페어링 세션은 유일함을 보장

4. trigger_logs.tx_id 유니크
   - 중복 메시지 방지

5. displays.status CHECK (online | offline)
   - 유효한 상태만 저장

6. pair_sessions.status CHECK (pending | approved | expired)
   - 유효한 상태만 저장

7. trigger_logs.status CHECK (delivered | missed | timeout)
   - 유효한 상태만 저장
```

---

### 2.5 데이터베이스 선택 및 마이그레이션

#### 옵션별 비교

| 특성 | 인메모리 Map | SQLite | PostgreSQL |
|-----|-----------|--------|-----------|
| **설정** | 즉시 | 파일 기반 | 서버 필요 |
| **동시성** | 낮음 | 낮음 | 높음 |
| **확장성** | 낮음 | 낮음 | 높음 |
| **영속성** | 없음 | 있음 | 있음 |
| **트랜잭션** | 없음 | 제한적 | 완전 지원 |
| **용도** | 개발/테스트 | 프로토타입 | 프로덕션 |

#### 마이그레이션 전략

**Phase 1: 인메모리 (개발 단계)**
```typescript
// server/src/stores/memoryStore.ts
class MemoryStore {
  private displays = new Map<string, Display>();
  private pairingSessions = new Map<string, PairingSession>();
  private triggerLogs: TriggerLog[] = [];

  async registerDisplay(display: Display) { /* ... */ }
  async getPairingSession(sessionId: string) { /* ... */ }
  async logTrigger(log: TriggerLog) { /* ... */ }
}
```

**Phase 2: SQLite (프로토타입/테스트)**
```bash
npm install better-sqlite3
```

```typescript
// server/src/stores/sqliteStore.ts
import Database from 'better-sqlite3';

class SqliteStore {
  private db: Database.Database;

  constructor(filename: string = ':memory:') {
    this.db = new Database(filename);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS displays (
        id INTEGER PRIMARY KEY,
        device_id TEXT UNIQUE,
        screen_id TEXT UNIQUE,
        ...
      );
    `);
  }

  async registerDisplay(display: Display) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO displays
      (device_id, screen_id, name, ...)
      VALUES (?, ?, ?, ...)
    `);
    stmt.run(display.deviceId, display.screenId, ...);
  }
}
```

**Phase 3: PostgreSQL (프로덕션)**
```bash
npm install pg
```

```typescript
// server/src/stores/postgresStore.ts
import { Pool } from 'pg';

class PostgresStore {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
  }

  async registerDisplay(display: Display) {
    const query = `
      INSERT INTO displays
      (device_id, screen_id, name, ...)
      VALUES ($1, $2, $3, ...)
      ON CONFLICT (device_id) DO UPDATE
      SET name = $3, updated_at = NOW()
      RETURNING *;
    `;
    const result = await this.pool.query(query, [
      display.deviceId,
      display.screenId,
      display.name,
      // ...
    ]);
    return result.rows[0];
  }
}
```

#### 마이그레이션 무결성 보장
```typescript
// 각 Store는 동일한 인터페이스 구현
interface IDataStore {
  registerDisplay(display: Display): Promise<Display>;
  getDisplayByScreenId(screenId: string): Promise<Display | null>;
  getAllDisplays(filters?: DisplayFilter): Promise<Display[]>;

  createPairingSession(session: PairingSession): Promise<void>;
  getPairingSession(sessionId: string): Promise<PairingSession | null>;
  updatePairingSession(sessionId: string, updates: Partial<PairingSession>): Promise<void>;

  logTrigger(log: TriggerLog): Promise<void>;
  getTriggerLogs(filters?: LogFilter): Promise<TriggerLog[]>;
}

// 런타임에 Store 선택
const store: IDataStore =
  process.env.DB_TYPE === 'postgres' ? new PostgresStore() :
  process.env.DB_TYPE === 'sqlite' ? new SqliteStore() :
  new MemoryStore();
```

---

## 3. 인증 및 권한 설계

### 3.1 JWT 토큰 구조

#### 디스플레이 토큰 (페어링 승인 후)
```typescript
{
  // 기본 정보
  sub: "display:screen:org-id:line-id",
  type: "display",

  // 권한 스코프
  scopes: [
    "display:screen:org-id:line-id"
  ],

  // 디바이스 정보
  deviceId: "uuid-xxx",

  // 타임스탐프
  iat: 1729858225,
  exp: 1729858825,  // 10분

  // 추가 정보 (선택사항)
  orgId: "org-id",
  lineId: "line-id",
}
```

#### 사용자 토큰 (기존)
```typescript
{
  sub: "user-id",
  role: "admin" | "manager" | "operator",
  scopes: [
    "display:screen:org-id:line-id",
    "trigger:*"
  ],

  iat: 1729858225,
  exp: 1729862425,  // 1시간
}
```

#### 토큰 발급 위치
```
- 디스플레이 토큰: /api/pair/approve 응답
- 사용자 토큰: /login (기존)
- 갱신: /api/auth/refresh (구현 필요 시)
```

### 3.2 권한 검증 전략

#### REST API 미들웨어
```typescript
// server/src/middleware/authMiddleware.ts

export interface AuthContext {
  userId: string;
  type: 'display' | 'user';
  scopes: string[];
  deviceId?: string;
  orgId?: string;
  lineId?: string;
}

export function authMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Authorization 헤더 추출
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        reason: 'unauthorized',
      });
    }

    const token = authHeader.substring(7);

    // 2. JWT 검증
    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthContext;

      // 3. 요청 객체에 첨부
      req.user = decoded;
      next();

    } catch (error) {
      return res.status(401).json({
        ok: false,
        reason: 'invalid_token',
      });
    }
  };
}
```

#### 스코프 검증 함수
```typescript
// server/src/services/authService.ts

export function hasScope(
  scopes: string[],
  requiredScope: string
): boolean {
  // 와일드카드 지원
  // "trigger:*" -> 모든 트리거 권한
  // "display:screen:*:*" -> 모든 화면 권한

  return scopes.some(scope => {
    if (scope === requiredScope) return true;

    // 와일드카드 매칭
    const pattern = scope.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requiredScope);
  });
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasScope(req.user?.scopes || [], scope)) {
      return res.status(403).json({
        ok: false,
        reason: 'forbidden',
        message: `${scope} 권한이 필요합니다`,
      });
    }
    next();
  };
}
```

---

## 4. 레이트 리미팅 전략

### 4.1 레이트 리미팅 규칙

#### /api/trigger
```
IP 기반:      초당 10회
사용자 기반:  분당 100회
내부 API:     제외 (10.0.0.0/8, 172.16.0.0/12 등)
```

#### /api/displays/register
```
IP 기반:      분당 60회 (heartbeat용)
사용자 기반:  분당 100회
```

#### /api/pair/*
```
IP 기반:      분당 20회
사용자 기반:  분당 10회
```

#### /api/displays (GET)
```
IP 기반:      분당 300회
사용자 기반:  분당 600회
```

### 4.2 구현 예시

```typescript
// server/src/middleware/rateLimitMiddleware.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

// Redis 클라이언트 (프로덕션용)
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// 메모리 스토어 (개발용)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// IP 기반 레이트 리미터
export const triggerIPLimiter = rateLimit({
  store: process.env.REDIS_URL
    ? new RedisStore({
        client: redisClient,
        prefix: 'rate-limit:trigger:ip:',
      })
    : undefined,

  keyGenerator: (req) => req.ip!, // IP 주소 기반
  windowMs: 1000,        // 1초
  max: 10,               // 10개 요청
  message: 'IP당 초당 10회 요청 제한',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isInternalIP(req.ip!), // 내부 IP 제외
});

// 사용자 기반 레이트 리미터
export const triggerUserLimiter = rateLimit({
  store: process.env.REDIS_URL
    ? new RedisStore({
        client: redisClient,
        prefix: 'rate-limit:trigger:user:',
      })
    : undefined,

  keyGenerator: (req) => req.user?.userId || req.ip!, // 사용자 ID 또는 IP
  windowMs: 60000,       // 1분
  max: 100,              // 100개 요청
  message: '사용자당 분당 100회 요청 제한',
  standardHeaders: true,
  legacyHeaders: false,
});

// 디스플레이 등록 레이트 리미터
export const registerDisplayIPLimiter = rateLimit({
  keyGenerator: (req) => req.ip!,
  windowMs: 60000,
  max: 60,
  message: 'IP당 분당 60회 요청 제한',
});

// 유틸리티
function isInternalIP(ip: string): boolean {
  const internalRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
  ];

  return internalRanges.some(pattern => pattern.test(ip));
}
```

### 4.3 레이트 리미팅 응답
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729858885

{
  "ok": false,
  "reason": "rate_limit_exceeded",
  "message": "너무 많은 요청을 보냈습니다",
  "retryAfter": 60
}
```

---

## 5. 에러 응답 표준화

### 5.1 에러 응답 형식

#### 기본 형식
```typescript
{
  ok: false;
  reason: string;      // 머신 리드 가능 (snake_case)
  message: string;     // 사람 리드 가능 (한글)
  errors?: Array<{     // 검증 에러 (선택사항)
    field: string;
    message: string;
  }>;
}
```

### 5.2 HTTP 상태 코드 맵

| 상태코드 | reason | 의미 |
|---------|--------|------|
| 400 | validation_error | 입력 검증 실패 |
| 400 | invalid_session | 유효하지 않은 세션 |
| 400 | invalid_code | 잘못된 인증 코드 |
| 400 | invalid_token | 토큰 검증 실패 |
| 401 | unauthorized | 인증 필요 |
| 403 | forbidden | 권한 부족 |
| 404 | not_found | 리소스 없음 |
| 409 | device_conflict | 디바이스 충돌 |
| 410 | expired | 세션/토큰 만료 |
| 429 | rate_limit_exceeded | 요청 제한 초과 |
| 500 | server_error | 서버 에러 |
| 503 | no_clients | 연결된 클라이언트 없음 |

### 5.3 에러 응답 예시

```typescript
// 검증 에러
{
  ok: false,
  reason: 'validation_error',
  message: '입력 검증에 실패했습니다',
  errors: [
    { field: 'deviceId', message: '유효한 UUID가 아닙니다' },
    { field: 'name', message: '1-100자여야 합니다' }
  ]
}

// 권한 에러
{
  ok: false,
  reason: 'forbidden',
  message: '이 화면에 접근할 권한이 없습니다'
}

// 레이트 리미팅
{
  ok: false,
  reason: 'rate_limit_exceeded',
  message: '너무 많은 요청을 보냈습니다',
  retryAfter: 60
}
```

---

## 6. 성능 및 확장성

### 6.1 성능 목표

| 메트릭 | 목표 | 방법 |
|--------|------|------|
| **응답시간 p95** | <100ms | 인덱스 최적화, 캐싱 |
| **동시 연결** | 1000+ | Redis 스토어, 수평 확장 |
| **트리거 전송** | 50ms (클라이언트 응답 제외) | 비동기 메시지 큐 |
| **DB 쿼리** | <10ms | 인덱스 전략 |

### 6.2 캐싱 전략

```typescript
// 디스플레이 목록 캐싱 (10초)
const displayCache = new Map<string, {
  data: Display[];
  expiresAt: number;
}>();

async function getDisplaysCached(filters: DisplayFilter) {
  const cacheKey = JSON.stringify(filters);
  const cached = displayCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await store.getAllDisplays(filters);
  displayCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + 10000, // 10초
  });

  return data;
}

// 캐시 무효화
function invalidateDisplayCache() {
  displayCache.clear();
}
```

### 6.3 연결 풀링

```typescript
// PostgreSQL 연결 풀
const pool = new Pool({
  max: 20,              // 최대 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 사용 후 반환
const client = await pool.connect();
try {
  await client.query('SELECT ...');
} finally {
  client.release();
}
```

### 6.4 비동기 처리

```typescript
// 트리거 로그 비동기 저장 (즉시 응답, 나중에 저장)
async function sendTrigger(req: Request, res: Response) {
  const txId = uuidv4();

  // 메시지 전송 (동기)
  const clientCount = await emitToChannel(screenId, 'trigger', {
    txId,
    jobNo,
    timestamp: new Date().toISOString(),
  });

  // 응답 (동기)
  res.json({
    ok: true,
    txId,
    clientCount,
  });

  // 로그 저장 (비동기, fire-and-forget)
  triggerLogs.create({
    txId,
    userId: user.id,
    screenId,
    jobNo,
    status: 'delivered',
    clientCount,
    timestamp: new Date(),
  }).catch(error => {
    logger.error('트리거 로그 저장 실패', { txId, error });
  });
}
```

---

## 7. 보안 고려사항

### 7.1 입력 검증

```typescript
// Zod를 사용한 검증
const displaySchema = z.object({
  deviceId: z.string()
    .uuid('유효한 UUID가 아닙니다')
    .or(z.string().regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i, 'MAC 주소 형식')),

  name: z.string()
    .min(1, '필수')
    .max(100, '최대 100자')
    .regex(/^[a-zA-Z0-9\-_\s]+$/, '허용된 문자만 사용'),

  purpose: z.string()
    .min(1)
    .max(255)
    .regex(/^[a-z_]+$/i, 'snake_case만 허용'),

  jobNo: z.string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\-_]+$/, '특수문자 제한'),
});
```

### 7.2 SQL 인젝션 방지

```typescript
// 나쁜 예
const query = `SELECT * FROM displays WHERE screenId = '${screenId}'`;

// 좋은 예 (파라미터화된 쿼리)
const query = 'SELECT * FROM displays WHERE screen_id = $1';
const result = await pool.query(query, [screenId]);
```

### 7.3 XSS 방지

```typescript
// 사용자 입력 이스케이핑
import { escapeHtml } from 'escape-html';

const safeName = escapeHtml(req.body.name);
```

### 7.4 CSRF 방지

```typescript
// CSRF 토큰 (웹 폼용)
app.use(csrf());

// API는 CORS + 정확한 Content-Type 검증
app.use((req, res, next) => {
  if (req.method !== 'GET' && !req.is('application/json')) {
    return res.status(400).json({
      ok: false,
      reason: 'invalid_content_type',
    });
  }
  next();
});
```

### 7.5 권한 최소화 (Least Privilege)

```typescript
// 트리거: display:screen:* 스코프만
{
  scopes: ["display:screen:org-id:line-id"]
}

// 관리자: trigger:* 스코프
{
  scopes: ["trigger:*", "display:*"]
}
```

---

## 8. 마이그레이션 전략

### 8.1 데이터베이스 마이그레이션 (SQLite → PostgreSQL)

#### Step 1: 스키마 마이그레이션
```sql
-- PostgreSQL에서 실행
CREATE TABLE displays (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL UNIQUE,
  screen_id VARCHAR(100) NOT NULL UNIQUE,
  -- ... (동일한 스키마)
);

CREATE TABLE pair_sessions (
  -- ...
);

CREATE TABLE trigger_logs (
  -- ...
);
```

#### Step 2: 데이터 마이그레이션
```typescript
// SQLite에서 읽기
const sqliteDb = new Database('app.db');
const displayRecords = sqliteDb.prepare('SELECT * FROM displays').all();

// PostgreSQL에 쓰기
const pool = new Pool({ /* ... */ });
for (const record of displayRecords) {
  await pool.query(
    'INSERT INTO displays (...) VALUES (...)',
    [/* values */]
  );
}
```

#### Step 3: 검증
```typescript
// 데이터 일관성 확인
const sqliteCount = sqliteDb.prepare('SELECT COUNT(*) FROM displays')
  .get() as { count: number };

const pgResult = await pool.query('SELECT COUNT(*) FROM displays');
const pgCount = parseInt(pgResult.rows[0].count);

if (sqliteCount.count !== pgCount) {
  throw new Error('데이터 불일치!');
}
```

#### Step 4: 롤백 계획
```typescript
// 마이그레이션 실패 시 이전 SQLite로 복구
async function rollback() {
  // PostgreSQL 데이터 삭제
  await pool.query('TRUNCATE TABLE displays CASCADE');

  // 이전 SQLite 복구
  // (백업본에서 복원)
}
```

### 8.2 애플리케이션 무중단 마이그레이션

```typescript
// 1. 읽기: PostgreSQL (기본), SQLite (폴백)
// 2. 쓰기: 양쪽 모두 (이중 쓰기 기간)
// 3. 검증: 일치성 확인
// 4. 전환: PostgreSQL로 완전 이동

interface DataStore {
  async registerDisplay(display: Display) {
    try {
      // PostgreSQL 쓰기
      const result = await pgStore.registerDisplay(display);

      // SQLite에도 쓰기 (폴백)
      await sqliteStore.registerDisplay(display);

      return result;
    } catch (error) {
      // 모두 실패하면 롤백
      throw error;
    }
  }
}
```

---

## 9. 구현 체크리스트

### Phase 1: 기본 구조 (1일)
- [ ] Express 라우터 파일 분리 (displays, pairing, triggers)
- [ ] `expressAuthMiddleware` 구현
- [ ] Zod 검증 스키마 정의
- [ ] 에러 응답 표준화
- [ ] 로깅 설정

### Phase 2: API 구현 (2일)
- [ ] POST /api/displays/register
- [ ] GET /api/displays
- [ ] POST /api/pair/qr
- [ ] GET /api/pair/poll/:sessionId
- [ ] POST /api/pair/approve
- [ ] POST /api/trigger

### Phase 3: 데이터 저장소 (1일)
- [ ] 인메모리 구현 (IDataStore)
- [ ] 테스트 완료
- [ ] SQLite 마이그레이션 (선택사항)

### Phase 4: 레이트 리미팅 & 보안 (0.5일)
- [ ] 엔드포인트별 레이트 리미팅 설정
- [ ] 입력 검증 강화
- [ ] SQL 인젝션 방지
- [ ] CORS 설정

### Phase 5: 테스트 (1.5일)
- [ ] 단위 테스트
- [ ] 통합 테스트 (API + Socket.IO)
- [ ] 성능 테스트
- [ ] 보안 테스트

---

## 10. 참고자료

- [Express.js 공식 문서](https://expressjs.com/)
- [Zod 검증 라이브러리](https://zod.dev/)
- [JWT 토큰 표준](https://datatracker.ietf.org/doc/html/rfc7519)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Socket.IO 실시간 통신](https://socket.io/)

---

**작성 완료:** 2025-10-25
**버전:** 1.0
**상태:** 설계 단계 → 구현 준비
