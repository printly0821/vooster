# T-014 통합 포인트 분석 - 요약

## 개요

T-014 "디스플레이 등록, 페어링 및 트리거 API" 구현 시 기존 시스템(T-012 Socket.IO, T-013 채널 관리)과의 통합 방식을 명확히 정리한 요약 문서입니다.

**핵심 결론**: T-014는 T-012/T-013의 기능을 REST API로 노출하고, Socket.IO 채널을 통해 메시지를 전송하는 통합 레이어입니다.

---

## 1. Socket.IO 통합 (가장 중요)

### 핵심: `emitToChannel()` 함수 직접 활용

```typescript
// T-013에서 구현된 함수 (channelManager.ts)
emitToChannel(io, screenId, eventType, payload): EmitResult
```

**T-014에서의 사용**:
```typescript
// 트리거 API 핸들러 내부
const emitResult = emitToChannel(io, screenId, 'navigate', {
  txId,
  screenId,
  jobNo,
  url: `${APP_URL}/orders/${jobNo}`,
  ts: Date.now(),
  exp: Date.now() + 60000,
});
```

**흐름**:
```
REST API (POST /api/trigger)
  ↓
emitToChannel() 호출
  ↓
/display 네임스페이스의 screenId 룸에 메시지 브로드캐스트
  ↓
브라우저 확장이 'navigate' 이벤트 수신
  ↓
ACK 전송 및 로깅
```

### 체크리스트
- [x] `io` 인스턴스를 라우터에 전달
- [x] `txId` (UUID) 생성하여 포함
- [x] 페이로드에 `exp` (만료 시간) 포함
- [x] `emitResult` 확인하여 로깅

---

## 2. 인증/권한 시스템 통합

### 핵심: JWT 토큰 두 가지 용도로 재사용

```typescript
// 기존 JWT (T-012)
interface DisplayAuthClaims {
  sub: string;              // 사용자 ID
  deviceId: string;         // 디바이스 ID
  screenId: string;         // 화면 ID
  scopes: string[];         // display:screenId
  iat: number;
  exp: number;
}
```

**T-014에서의 확장**:

#### 1. Socket.IO 인증 (기존)
```typescript
socket.auth = {
  token: displayToken,      // JWT
  deviceId: '...',
  screenId: '...',
};
```

#### 2. REST API 인증 (신규)
```typescript
Authorization: Bearer {displayToken}
```

**구현**:
```typescript
// 1. 환경변수: 같은 시크릿 사용
process.env.SOCKET_JWT_SECRET

// 2. Express 미들웨어 추가
app.use(bearerAuthMiddleware(process.env.SOCKET_JWT_SECRET));

// 3. 권한 확인
const hasPermission = context.scopes.includes(`display:${screenId}`);
if (!hasPermission) {
  throw new ForbiddenError('이 화면에 접근할 권한이 없습니다');
}
```

### 체크리스트
- [x] `SOCKET_JWT_SECRET` 환경변수 확인
- [x] REST API에 Bearer 토큰 검증 미들웨어 추가
- [x] JWT 클레임에서 `scopes` 추출
- [x] 모든 보호된 엔드포인트에서 권한 확인

---

## 3. 로깅 시스템 통합

### 핵심: Pino 로거 재사용 + 데이터베이스 기록

**두 단계 로깅**:

#### 1단계: Pino 로거 (즉시)
```typescript
logger.info('트리거 전송: userId=%s, screenId=%s, txId=%s',
  context.userId, screenId, txId);
```

#### 2단계: trigger_logs 테이블 (DB 저장)
```typescript
await logTrigger({
  userId,
  screenId,
  jobNo,
  txId,
  status: 'delivered' | 'missed',
  clientCount,
  ip,
  timestamp: new Date(),
  statusCode,
  errorMessage,
});
```

**테이블 설계**:
```sql
trigger_logs {
  id (UUID),
  user_id (VARCHAR),
  screen_id (VARCHAR),
  job_no (VARCHAR),
  tx_id (UUID),              -- 메시지 추적
  status (delivered|missed),
  client_count (INT),
  ip_address (INET),
  timestamp (TIMESTAMP),
  status_code (INT),
  error_message (TEXT),
}
```

**감시 포인트**:
- `ip_address`: 누가 요청했는가
- `status_code`: 성공/실패 여부
- `client_count`: 메시지 수신 디바이스 수
- `timestamp`: 언제 요청했는가

### 체크리스트
- [x] 모든 API 요청 로깅 (Pino)
- [x] 트리거 결과 기록 (trigger_logs 테이블)
- [x] 권한 위반 로깅
- [x] Rate limit 위반 로깅

---

## 4. 데이터 저장소 통합

### 핵심: Repository 패턴 (저장소 추상화)

**왜 필요한가?**
- 처음에는 메모리만 사용 (개발)
- 나중에 SQLite (프로토타입)
- 최종적으로 PostgreSQL (프로덕션)
- **코드는 변경 없음** (인터페이스만 구현)

**구현 방식**:

```typescript
// 1. 인터페이스 정의 (types.ts)
export interface IDisplayRepository {
  register(data): Promise<Display>;
  findByScreenId(screenId): Promise<Display | null>;
  listOnline(lineId?): Promise<Display[]>;
  updateLastSeen(deviceId): Promise<void>;
}

// 2. 구현체 선택 (index.ts에서 초기화)
const dbType = process.env.DB_TYPE; // 'memory' | 'sqlite' | 'postgres'

if (dbType === 'postgres') {
  displayRepository = new PostgresDisplayRepository(pool);
} else {
  displayRepository = new MemoryDisplayRepository();
}

// 3. 라우터에서 사용 (저장소에 의존하지 않음)
const display = await displayRepository.register(data);
```

**단계별 도입**:

| Phase | DB | 특징 | 환경 |
|-------|----|----|------|
| 1 | Memory | 빠름, 데이터 휘발성 | 개발 |
| 2 | SQLite | 파일 저장, 경량 | 프로토타입 |
| 3 | PostgreSQL | 확장성, 멀티 스레드 | 프로덕션 |

### 체크리스트
- [x] Repository 인터페이스 정의
- [x] MemoryRepository 구현 (먼저 이것으로 개발)
- [x] 저장소 주입 메커니즘 (index.ts)
- [x] 환경변수로 저장소 선택 (DB_TYPE)

---

## 5. 환경설정 통합

### 필수 환경변수

**기존 (T-012)**:
```bash
SOCKET_JWT_SECRET=...       # JWT 시크릿 (필수)
CORS_ORIGINS=...            # CORS 원본
PORT=3000
NODE_ENV=development
```

**T-014 추가**:
```bash
# 데이터베이스
DB_TYPE=memory              # memory | sqlite | postgres

# Socket.IO/App URL
WS_URL=ws://localhost:3000              # 브라우저 확장 연결 URL
APP_URL=http://localhost:3000/orders    # 트리거 때 사용할 기본 URL

# Rate Limiting
RATE_LIMIT_IP_PER_SEC=10               # 초당 IP별 제한
RATE_LIMIT_USER_PER_MIN=100            # 분당 사용자별 제한
RATE_LIMIT_TRIGGER_PER_MIN=50          # 트리거 특별 제한

# 페어링
PAIRING_SESSION_TTL=300000             # 세션 유효 시간 (5분)
```

### 체크리스트
- [x] 모든 환경변수 검증 로직 추가
- [x] 기본값 설정
- [x] .env.example 파일 제공

---

## 6. 라우터 구조 통합

### 기본 레이아웃

```typescript
// server/src/index.ts 수정
const app = express();

// 1. 기존 미들웨어
app.use(helmet());
app.use(cors({ ... }));

// 2. *** T-014: 새로운 미들웨어 추가
app.use(requestLoggerMiddleware);           // 요청 로깅

// 3. *** T-014: 저장소 초기화
await initializeRepositories();

// 4. *** T-014: 라우터 등록
app.use('/api/displays', displayRoutes);
app.use('/api/pair', pairingRoutes);
app.use('/api/trigger', triggerRoutes);

// 5. *** T-014: 전역 에러 핸들러
app.use(errorHandlerMiddleware);

// 6. Socket.IO (기존)
const io = new SocketIOServer(server, { ... });
```

### 엔드포인트 목록

```
POST   /api/displays/register          공개 (디스플레이 등록/heartbeat)
GET    /api/displays                   보호 (JWT 필요, 온라인 디스플레이 목록)

POST   /api/pair/qr                    공개 (QR 생성)
GET    /api/pair/poll/:sessionId       공개 (폴링)
POST   /api/pair/approve               보호 (페어링 승인)

POST   /api/trigger                    보호 (트리거 전송)
GET    /api/trigger/logs               보호 (로그 조회, 선택)
```

### 체크리스트
- [x] 각 라우터를 별도 파일로 분리 (routes/)
- [x] 공개 vs 보호 엔드포인트 구분
- [x] 미들웨어 적용 순서 확인
- [x] 전역 에러 핸들러 추가

---

## 7. 에러 처리 통합

### 통일된 응답 형식

```typescript
// 성공
{
  ok: true,
  txId: "...",
  clientCount: 2,
  sentAt: 1234567890
}

// 검증 실패 (400)
{
  ok: false,
  reason: "validation_error",
  message: "입력 데이터가 유효하지 않습니다",
  errors: [
    { field: "screenId", message: "형식이 잘못되었습니다", code: "regex" }
  ]
}

// 권한 부족 (403)
{
  ok: false,
  reason: "forbidden",
  message: "이 작업을 수행할 권한이 없습니다"
}

// 클라이언트 없음 (503)
{
  ok: false,
  reason: "no_clients",
  message: "해당 디스플레이에 연결된 클라이언트가 없습니다"
}

// Rate limit (429)
{
  ok: false,
  reason: "rate_limit",
  message: "요청이 너무 많습니다"
}
```

**HTTP 상태 코드**:
- 200 OK: 성공
- 400 Bad Request: 검증 실패
- 401 Unauthorized: 인증 필요
- 403 Forbidden: 권한 부족
- 404 Not Found: 리소스 없음
- 429 Too Many Requests: Rate limit
- 503 Service Unavailable: 디바이스 연결 안 됨
- 500 Internal Server Error: 서버 에러

### 체크리스트
- [x] 모든 에러를 JSON 형식으로 변환
- [x] `reason` 필드로 프로그래밍 방식 처리 가능
- [x] `message` 필드로 사용자 친화적 메시지 제공
- [x] 검증 실패 시 `errors` 배열 포함
- [x] txId로 메시지 추적 가능

---

## 8. 구현 순서 (우선순위)

### Priority 1 (필수)
1. **Express 미들웨어**
   - `expressAuth.ts`: Bearer 토큰 검증
   - `errorHandler.ts`: 전역 에러 처리
   - `requestLogger.ts`: 요청 로깅

2. **Repository 패턴**
   - 인터페이스 정의
   - MemoryRepository 구현
   - 저장소 주입 (index.ts)

3. **트리거 API** (가장 중요한 기능)
   - POST /api/trigger
   - emitToChannel() 호출
   - trigger_logs 기록

### Priority 2 (중요)
4. **페어링 API**
   - POST /api/pair/qr
   - GET /api/pair/poll/:sessionId
   - POST /api/pair/approve

5. **디스플레이 API**
   - POST /api/displays/register
   - GET /api/displays

### Priority 3 (확장)
6. **Rate limiting 미들웨어**
7. **데이터베이스 마이그레이션**
8. **테스트 작성**

---

## 9. 실제 구현 예시

### 예시 1: 트리거 API 핵심 구현

```typescript
// routes/triggers.ts
router.post(
  '/',
  bearerAuthMiddleware(JWT_SECRET),
  rateLimitMiddleware('trigger'),
  async (req, res) => {
    try {
      const context = (req as any).auth as AuthContext;
      const txId = crypto.randomUUID();

      // 1. 입력 검증
      const parsed = triggerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationApiError(zodErrorToValidationErrors(parsed.error));
      }

      const { screenId, jobNo } = parsed.data;

      // 2. 권한 확인
      if (!context.scopes.includes(`display:${screenId}`)) {
        throw new ForbiddenError('이 화면에 접근할 권한이 없습니다');
      }

      // 3. Socket.IO로 메시지 전송 *** 핵심
      const emitResult = emitToChannel(io, screenId, 'navigate', {
        type: 'navigate',
        txId,
        screenId,
        jobNo,
        url: `${APP_URL}/orders/${jobNo}`,
        ts: Date.now(),
        exp: Date.now() + 60000,
      });

      // 4. 로깅 (DB)
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

      // 5. 응답
      if (emitResult.ok) {
        res.json({
          ok: true,
          txId,
          clientCount: emitResult.clientCount,
          sentAt: Date.now(),
        });
      } else {
        res.status(503).json({
          ok: false,
          txId,
          reason: emitResult.reason,
        });
      }
    } catch (error) {
      // 에러 핸들러에서 처리
      next(error);
    }
  }
);
```

### 예시 2: 페어링 API (QR 생성)

```typescript
// routes/pairing.ts
router.post('/qr', async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    const code = generateCode(6); // '123456' 형식

    // QR 데이터
    const qrData = {
      sessionId,
      code,
      wsUrl: process.env.WS_URL,
    };

    // 세션 저장
    await pairingRepository.create({
      sessionId,
      code,
      status: 'pending',
      expiresAt: new Date(Date.now() + PAIRING_SESSION_TTL),
    });

    res.json({
      ok: true,
      sessionId,
      qrData: JSON.stringify(qrData),
      code,
      expiresIn: Math.ceil(PAIRING_SESSION_TTL / 1000),
    });
  } catch (error) {
    next(error);
  }
});
```

### 예시 3: Express 미들웨어

```typescript
// middleware/expressAuth.ts
export function bearerAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({
          ok: false,
          reason: 'unauthorized',
          message: '인증이 필요합니다',
        });
      }

      const token = auth.substring(7);
      const decoded = jwt.verify(token, jwtSecret) as DisplayAuthClaims;

      (req as any).auth = {
        userId: decoded.sub,
        scopes: decoded.scopes,
        ip: req.ip,
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
      };

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

---

## 10. 통합 검증 체크리스트

### 구현 전 확인 사항
- [ ] T-012 (Socket.IO) 코드 이해
- [ ] T-013 (채널 관리) 코드 이해
- [ ] `emitToChannel()` 함수 사용 방법 파악
- [ ] JWT 토큰 구조 이해

### 구현 중 확인 사항
- [ ] 모든 API에 Zod safeParse 적용
- [ ] 모든 검증 실패 시 400 반환
- [ ] 모든 에러가 ErrorResponse 형식
- [ ] JWT 검증 미들웨어 적용
- [ ] 권한 확인 (scopes)
- [ ] txId 생성 및 로깅
- [ ] 트리거 로그 DB 저장
- [ ] Rate limiting 적용

### 테스트 체크리스트
- [ ] 유효한 요청 → 성공 응답
- [ ] 검증 실패 → 400 + 에러 상세
- [ ] 권한 없음 → 403 Forbidden
- [ ] 토큰 없음 → 401 Unauthorized
- [ ] 클라이언트 없음 → 503 Service Unavailable
- [ ] Rate limit 초과 → 429 Too Many Requests
- [ ] emitToChannel() 호출 확인
- [ ] trigger_logs 테이블에 기록됨

---

## 11. 자주 묻는 질문 (FAQ)

**Q: Socket.IO와 REST API에 다른 JWT 시크릿을 써도 되나?**
A: 가능하지만, 같은 시크릿을 사용하는 것이 간단합니다. 나중에 필요하면 분리할 수 있습니다.

**Q: 트리거 메시지가 클라이언트로 안 가면?**
A: `emitResult.ok === false`를 확인하세요. `no_clients` 이유면 디바이스가 연결되지 않은 것입니다.

**Q: trigger_logs 테이블에 저장하지 않으면?**
A: API는 동작하지만, 감시 및 감사가 불가능합니다. 반드시 로깅하세요.

**Q: Rate limit를 비활성화하려면?**
A: 개발 중에는 무한정으로 설정할 수 있습니다. 프로덕션에서는 반드시 활성화하세요.

**Q: 페어링 없이 직접 트리거를 보낼 수 있나?**
A: 아니요. JWT 토큰이 필요하고, 페어링 승인 시에만 토큰이 발급됩니다.

---

## 12. 다음 단계

1. **이 문서 정독**: T-014-INTEGRATION-ANALYSIS.md (상세 버전)
2. **코드 구현**:
   - Express 미들웨어부터 시작
   - Repository 패턴 구현
   - 트리거 API 완성
3. **테스트**: 각 엔드포인트별 단위/통합 테스트
4. **배포**: 환경변수 설정 후 배포

---

## 참고 자료

| 문서 | 내용 | 위치 |
|------|------|------|
| T-014-TYPE-DESIGN.md | 타입 및 검증 스키마 | vooster-docs/ |
| T-014-TYPE-IMPLEMENTATION-SUMMARY.md | 타입 구현 가이드 | vooster-docs/ |
| T-014-INTEGRATION-ANALYSIS.md | 상세 통합 분석 | vooster-docs/ |
| displayHandlers.ts | Socket.IO 인증 | server/src/events/ |
| channelManager.ts | 채널 메시지 라우팅 | server/src/services/ |
| auth.ts | JWT 검증 | server/src/middleware/ |

---

**작성일**: 2025-10-25
**버전**: 1.0
**상태**: 분석 완료

핵심 메시지:
> T-014는 REST API로 트리거를 요청받아 Socket.IO의 `emitToChannel()`로 브라우저 확장에 메시지를 전송하고,
> 모든 과정을 JWT 인증과 데이터베이스 로깅으로 관리하는 통합 레이어입니다.
