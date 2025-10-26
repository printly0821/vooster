# T-014: 타입 및 검증 스키마 설계 - 구현 완료 요약

## 개요

T-014 "디스플레이 등록, 페어링 및 트리거 API" 구현을 위한 모든 타입 정의 및 Zod 검증 스키마 설계가 완료되었습니다.

**작업 일시**: 2025-10-25
**상태**: 설계 완료 (T-014 API 구현 대기)
**문서**: `/vooster-docs/T-014-TYPE-DESIGN.md`

---

## 생성된 파일 목록

### 1. 타입 정의 파일

#### `/server/src/types/`

| 파일 | 목적 | 타입 개수 | 라인 수 |
|------|------|---------|--------|
| `display.ts` | 디스플레이 관련 타입 | 6 | 108 |
| `pairing.ts` | 페어링 시스템 타입 | 9 | 147 |
| `trigger.ts` | 트리거 시스템 타입 | 4 | 129 |
| `error.ts` | 에러 및 검증 타입 | 10 | 246 |
| `auth.ts` | 인증 및 권한 타입 | 10 | 170 |

**합계**: 39개 타입 정의, 800 라인

---

### 2. Zod 검증 스키마 파일

#### `/server/src/schemas/`

| 파일 | 목적 | 스키마 개수 | 라인 수 |
|------|------|-----------|--------|
| `display.ts` | 디스플레이 검증 | 4 | 103 |
| `pairing.ts` | 페어링 검증 | 6 | 137 |
| `trigger.ts` | 트리거 검증 | 9 | 182 |
| `auth.ts` | 인증 검증 | 11 | 165 |
| `index.ts` | 통합 export | - | 47 |

**합계**: 30개 검증 스키마, 634 라인

---

## 설계된 타입 상세

### 1. 디스플레이 관련 타입 (6개)

```typescript
// 등록 요청
DisplayRegisterRequest {
  deviceId, name, purpose, orgId, lineId
}

// DB 모델
Display {
  deviceId, screenId, name, purpose, orgId, lineId,
  lastSeenAt, status, createdAt, updatedAt
}

// 등록 응답
DisplayRegisterResponse {
  ok: true, screenId, status
}

// 요약 정보
DisplaySummary {
  screenId, name, purpose, online, lastSeen
}

// 목록 응답
DisplayListResponse {
  ok: true, displays: DisplaySummary[]
}

// 조회 옵션
DisplayQueryOptions {
  lineId?, onlineOnly?, limit?
}
```

### 2. 페어링 시스템 타입 (9개)

```typescript
// DB 모델
PairingSession {
  sessionId, code, status, expiresAt, createdAt,
  token?, approvedBy?, approvedAt?, approverIp?
}

// QR 생성 응답
PairQRResponse {
  ok: true, sessionId, qrData, expiresIn, code
}

// QR 데이터
PairQRData {
  sessionId, code, wsUrl
}

// 폴링 응답 (Union Type)
PairPollResponse = PairPollSuccess | PairPollPending | PairPollFailed

// 승인 요청
PairApproveRequest {
  sessionId, code
}

// 승인 응답 (Union Type)
PairApproveResponse = PairApproveSuccess | PairApproveFailed
```

### 3. 트리거 시스템 타입 (4개)

```typescript
// 트리거 요청
TriggerRequest {
  screenId, jobNo, metadata?
}

// 트리거 응답 (Union Type)
TriggerResponse = TriggerSuccess | TriggerFailed

// 감시 로그
TriggerLog {
  id, userId, screenId, jobNo, txId, status,
  clientCount, ip, timestamp, statusCode, errorMessage?
}

// WebSocket 페이로드
TriggerPayload {
  type, txId, screenId, jobNo, url, ts, exp, metadata?
}
```

### 4. 에러 및 검증 타입 (10개)

```typescript
// 에러 응답
ErrorResponse {
  ok: false, reason, message?, errors?, txId?
}

// 검증 에러
ValidationError {
  field, message, code, context?
}

// 커스텀 에러 클래스 (5개)
- ApiError (abstract base)
- ValidationApiError
- ForbiddenError
- NotFoundError
- RateLimitError
- UnauthorizedError
- InternalServerError
- ServiceUnavailableError

// 유틸리티 함수
- toErrorResponse(error, txId?)
- zodErrorToValidationErrors(error)
- isApiError(error)
```

### 5. 인증 관련 타입 (10개)

```typescript
// JWT 페이로드
DisplayJWTPayload {
  sub, deviceId, screenId, scopes, iat, exp, type
}

// 인증 컨텍스트
AuthContext {
  userId, role, scopes, ip, issuedAt, expiresAt
}

// Rate limiting
RateLimitConfig {
  endpoint, perSecondIp?, perMinuteUser?, burstSize?
}

RateLimitState {
  count, windowStart, lastRequestAt
}

// 권한 관리
UserDisplayPermission {
  userId, screenIds, level, grantedAt, expiresAt?
}

// 토큰 검증
TokenVerificationResult = TokenVerificationSuccess | TokenVerificationFailed

// 기타
JWTValidationRules { ... }
AuthConfig { ... }
```

---

## 설계된 Zod 검증 스키마

### 1. 디스플레이 스키마 (4개)

```typescript
// 등록 요청 검증
displayRegisterSchema
├─ deviceId: string (1-100, regex)
├─ name: string (1-100)
├─ purpose: string (1-255)
├─ orgId: string (1-50, regex)
└─ lineId: string (1-50, regex)

// 조회 필터 검증
displayQuerySchema
├─ lineId?: string (regex)
├─ onlineOnly?: boolean
└─ limit?: number (1-1000)

// 화면 ID 검증
screenIdSchema
└─ string (regex: ^screen:[a-z0-9\-]+:[a-z0-9\-]+$)

// 화면 ID 파싱
parseScreenIdSchema
└─ transform → { screenId, orgId, lineId }
```

### 2. 페어링 스키마 (6개)

```typescript
// 승인 요청 검증
pairApproveSchema
├─ sessionId: string (UUID)
└─ code: string (regex: ^\d{6}$)

// 세션 ID 검증
pairSessionIdSchema
└─ string (UUID)

// 확인 코드 검증
pairCodeSchema
└─ string (regex: ^\d{6}$)

// QR 데이터 검증
pairQRDataSchema
├─ sessionId: string (UUID)
├─ code: string (6자리)
└─ wsUrl: string (URL)

// QR 데이터 파싱
parsePairQRDataSchema
└─ transform + pipe pairQRDataSchema

// 폴링 간격 검증
pairPollIntervalSchema
└─ number (1000-60000ms)
```

### 3. 트리거 스키마 (9개)

```typescript
// 트리거 요청 검증
triggerSchema
├─ screenId: string (regex)
├─ jobNo: string (1-50)
└─ metadata?: record (max 10 fields)

// 화면 ID 검증
screenIdSchema
└─ string (regex)

// 주문 번호 검증
jobNoSchema
└─ string (1-50)

// 트랜잭션 ID 검증
txIdSchema
└─ string (UUID)

// 메타데이터 검증
triggerMetadataSchema
└─ record (max 10 fields)

// 트리거 페이로드 검증
triggerPayloadSchema
├─ type: 'navigate'
├─ txId, screenId, jobNo, url, ts, exp
└─ metadata?: record

// 응답 상태 검증
triggerResponseStatusSchema
└─ enum: 'delivered' | 'missed' | 'rate_limited' | 'error'

// 실패 이유 검증
triggerFailureReasonSchema
└─ enum: 'validation_error' | 'forbidden' | ...

// 클라이언트 수 검증
clientCountSchema
└─ number (>= 0)
```

### 4. 인증 스키마 (11개)

```typescript
// JWT 클레임 검증
jwtClaimsSchema
├─ sub, deviceId, screenId, scopes, iat, exp, type?

// 권한 검증
scopeSchema
└─ string (regex: ^display:screen:[a-z0-9\-]+:[a-z0-9\-]+$)

// 권한 배열 검증
scopesSchema
└─ array of Scope (1-100 items)

// Bearer 토큰 추출
bearerTokenSchema
└─ string → transform token

// 사용자 ID 검증
userIdSchema
└─ string (1-100)

// 사용자 역할 검증
userRoleSchema
└─ enum: 'admin' | 'operator' | 'viewer'

// IP 주소 검증
ipAddressSchema
└─ string (IPv4 or IPv6)

// 인증 컨텍스트 검증
authContextSchema
├─ userId, role, scopes, ip, issuedAt, expiresAt

// Rate limit 설정 검증
rateLimitConfigSchema
├─ endpoint, perSecondIp?, perMinuteUser?, burstSize?

// Rate limit 상태 검증
rateLimitStateSchema
├─ count, windowStart, lastRequestAt

// 토큰 만료 시간 검증
tokenExpirationSchema
└─ number (positive integer)
```

---

## 기존 타입과의 호환성

### 기존 타입 재사용 현황

| 기존 타입 (T-012, T-013) | T-014에서의 활용 | 상태 |
|-------------------------|-----------------|------|
| `DisplayAuthClaims` | JWT 검증 기준 | 그대로 사용 |
| `DisplaySocketData` | Socket 데이터 | 그대로 사용 |
| `ChannelMessage` | 메시지 전송 기준 | 그대로 사용 |
| `ChannelStatus` | 채널 상태 조회 | 그대로 사용 |
| `EmitResult` | 트리거 응답 기준 | 그대로 사용 |

**결론**: 완벽한 하위 호환성 유지. 기존 코드 변경 불필요.

---

## TypeScript 타입 안전성 검증 체크리스트

### 타입 설계 단계
- [x] 모든 공개 인터페이스에 JSDoc 주석 작성
- [x] Union types 사용으로 명확한 상태 표현
- [x] Generic 활용은 최소화 (복잡도 관리)
- [x] 어떤 `any` 타입도 사용하지 않음
- [x] Discriminated union으로 타입 안전성 강화

### Zod 스키마 설계 단계
- [x] 모든 필수 필드에 명시적 검증 규칙
- [x] 정규식으로 형식 검증 (screenId, code 등)
- [x] 숫자 범위 검증 (limit, count 등)
- [x] 문자열 길이 제한
- [x] transform으로 값 정규화

### API 구현 준비
- [x] 요청 검증 스키마 정의
- [x] 응답 타입 정의
- [x] 에러 타입 정의
- [x] 인증/권한 타입 정의
- [x] Rate limiting 타입 정의

---

## T-014 API 구현 가이드

### 사용 예시 1: 디스플레이 등록 엔드포인트

```typescript
// src/features/api/displays/route.ts
import { displayRegisterSchema } from '@/schemas';
import { DisplayRegisterResponse, ErrorResponse } from '@/types';
import { ValidationApiError, UnauthorizedError } from '@/types';

export async function POST(req: Request) {
  try {
    // 1. 인증 확인
    const auth = req.headers.get('authorization');
    if (!auth) throw new UnauthorizedError();

    // 2. 요청 검증
    const body = await req.json();
    const parsed = displayRegisterSchema.safeParse(body);
    if (!parsed.success) {
      const errors = zodErrorToValidationErrors(parsed.error);
      throw new ValidationApiError(errors);
    }

    // 3. 비즈니스 로직
    const { deviceId, name, purpose, orgId, lineId } = parsed.data;
    const screenId = `screen:${orgId}:${lineId}`;

    // DB에 저장
    await db.upsert('displays', {
      device_id: deviceId,
      screen_id: screenId,
      name,
      purpose,
      last_seen_at: new Date(),
      status: 'online',
    });

    // 4. 성공 응답
    const response: DisplayRegisterResponse = {
      ok: true,
      screenId,
      status: 'registered',
    };
    return Response.json(response);

  } catch (error) {
    // 5. 에러 처리
    if (isApiError(error)) {
      return Response.json(
        toErrorResponse(error),
        { status: error.statusCode }
      );
    }
    return Response.json(
      { ok: false, reason: 'internal_error' },
      { status: 500 }
    );
  }
}
```

### 사용 예시 2: 트리거 엔드포인트

```typescript
// src/features/api/trigger/route.ts
import { triggerSchema } from '@/schemas';
import { TriggerResponse } from '@/types';
import { ForbiddenError } from '@/types';

export async function POST(req: Request, context: AuthContext) {
  try {
    const body = await req.json();
    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationApiError(zodErrorToValidationErrors(parsed.error));
    }

    const { screenId, jobNo } = parsed.data;
    const txId = crypto.randomUUID();

    // 권한 확인
    const hasPermission = context.scopes.includes(`display:${screenId}`);
    if (!hasPermission) {
      throw new ForbiddenError('이 화면에 접근할 권한이 없습니다');
    }

    // Socket.IO로 메시지 전송
    const emitResult = await emitToChannel(screenId, 'navigate', {
      txId,
      screenId,
      jobNo,
      url: `${process.env.APP_URL}/orders/${jobNo}`,
      ts: Date.now(),
      exp: Date.now() + 60000,
    });

    // 로깅
    await logTrigger({
      userId: context.userId,
      screenId,
      jobNo,
      txId,
      status: emitResult.ok ? 'delivered' : 'missed',
      clientCount: emitResult.clientCount || 0,
      ip: context.ip,
    });

    // 응답
    const response: TriggerResponse = emitResult.ok
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

    return Response.json(response, {
      status: emitResult.ok ? 200 : 503,
    });
  } catch (error) {
    // 에러 처리...
  }
}
```

---

## 파일 위치 및 import 경로

### 타입 import

```typescript
// 디스플레이
import {
  DisplayRegisterRequest,
  Display,
  DisplayRegisterResponse,
  DisplaySummary,
  DisplayListResponse,
  DisplayQueryOptions,
} from '@/types/display';

// 페어링
import {
  PairingSession,
  PairQRResponse,
  PairPollResponse,
  PairApproveRequest,
  PairApproveResponse,
} from '@/types/pairing';

// 트리거
import {
  TriggerRequest,
  TriggerResponse,
  TriggerLog,
  TriggerPayload,
} from '@/types/trigger';

// 에러
import {
  ErrorResponse,
  ValidationError,
  ApiError,
  ValidationApiError,
  ForbiddenError,
  toErrorResponse,
  zodErrorToValidationErrors,
  isApiError,
} from '@/types/error';

// 인증
import {
  DisplayJWTPayload,
  AuthContext,
  RateLimitConfig,
  RateLimitState,
} from '@/types/auth';
```

### 스키마 import

```typescript
// 모든 스키마를 한 번에
import {
  displayRegisterSchema,
  pairApproveSchema,
  triggerSchema,
  jwtClaimsSchema,
  // ... 기타 스키마
} from '@/schemas';

// 또는 필요한 것만
import { triggerSchema, type TriggerInput } from '@/schemas/trigger';
```

---

## 다음 단계 (T-014 구현)

### Phase 1: API 엔드포인트 구현
1. POST /api/displays/register - 디스플레이 등록
2. GET /api/displays - 디스플레이 목록 조회
3. POST /api/pair/qr - QR 생성
4. GET /api/pair/poll/:sessionId - 폴링
5. POST /api/pair/approve - 페어링 승인
6. POST /api/trigger - 트리거

### Phase 2: 미들웨어 구현
1. JWT 인증 미들웨어
2. Rate limiting 미들웨어
3. 에러 처리 미들웨어
4. 로깅 미들웨어

### Phase 3: 서비스 레이어
1. DisplayService
2. PairingService
3. TriggerService
4. LoggingService

### Phase 4: 데이터베이스 마이그레이션
1. displays 테이블
2. pair_sessions 테이블
3. trigger_logs 테이블
4. 인덱스 생성

### Phase 5: 테스트
1. 단위 테스트 (Vitest)
2. 통합 테스트
3. E2E 테스트 (Playwright)

---

## 문제 해결 가이드

### Q: API 응답에서 "Invalid email format" 같은 Zod 에러 메시지가 너무 영어로 나온다
**A**: Zod 스키마 정의 시 모든 에러 메시지를 한글로 작성했습니다. Zod의 기본 메시지가 출력되면 스키마 정의를 확인하세요.

### Q: screenId 형식 검증에서 실패하는데?
**A**: screenId는 정확히 `screen:orgId:lineId` 형식이어야 합니다:
- 예: `screen:prod:line-1` (O)
- 예: `screen:prod-env:line-001` (O)
- 예: `screen:PROD:LINE-1` (X - 대문자 불가)

### Q: JWT 클레임에서 `type: 'display'`가 필수인가?
**A**: `type`은 선택적 필드입니다. 향후 다양한 토큰 타입이 생길 때를 대비하기 위해 정의했습니다.

### Q: 토큰 만료 시간을 초 단위가 아닌 밀리초로 하고 싶은데?
**A**: JWT 표준은 Unix 타임스탐프 (초 단위)를 사용합니다. 코드 내에서 필요시 변환하세요:
```typescript
const exp = Math.floor(Date.now() / 1000) + 3600; // 1시간
```

---

## 참고 자료

- **설계 문서**: `/vooster-docs/T-014-TYPE-DESIGN.md`
- **T-012 (Socket.IO 서버)**: `/vooster-docs/.vooster/tasks/T-012.txt`
- **T-013 (채널 관리)**: `/vooster-docs/.vooster/tasks/T-013.txt`
- **T-014 (이 API)**: `/vooster-docs/.vooster/tasks/T-014.txt`

---

## 최종 확인 사항

### 구현 전 필독사항
- [ ] 이 문서 전체 읽기
- [ ] T-014-TYPE-DESIGN.md의 "타입 안전성 체크리스트" 확인
- [ ] 각 API 엔드포인트별 요청/응답 타입 매칭 확인
- [ ] 기존 T-012, T-013 코드와의 인터페이스 확인

### 구현 중 체크리스트
- [ ] 모든 API 요청에 Zod safeParse 적용
- [ ] 검증 실패 시 ValidationApiError 던지기
- [ ] 모든 에러를 ErrorResponse로 변환
- [ ] 모든 API 호출 로깅 (TriggerLog 등)
- [ ] 인증 필요한 엔드포인트에 JWT 검증 추가
- [ ] Rate limiting 적용 (/api/trigger 우선)

### 테스트 체크리스트
- [ ] 유효한 입력값으로 성공 케이스 검증
- [ ] 각 필드 별 경계값 테스트
- [ ] 권한 없는 사용자 접근 테스트
- [ ] Rate limit 초과 테스트
- [ ] 파라미터 누락 시 명확한 에러 메시지 확인

---

**작성자**: TypeScript Development Specialist
**작성일**: 2025-10-25
**상태**: 설계 완료, T-014 구현 준비 완료

---

## 빠른 참조 (Quick Reference)

### 주요 타입
```typescript
DisplayRegisterRequest → POST /api/displays/register
DisplayListResponse   → GET /api/displays
PairQRResponse        → POST /api/pair/qr
PairApproveRequest    → POST /api/pair/approve
TriggerRequest        → POST /api/trigger
ErrorResponse         → 모든 에러 응답
```

### 주요 스키마
```typescript
displayRegisterSchema → DisplayRegisterInput
triggerSchema         → TriggerInput
pairApproveSchema     → PairApproveInput
jwtClaimsSchema       → JWTClaims
```

### 주요 에러 클래스
```typescript
ValidationApiError    → 400 Bad Request
UnauthorizedError     → 401 Unauthorized
ForbiddenError        → 403 Forbidden
NotFoundError         → 404 Not Found
RateLimitError        → 429 Too Many Requests
InternalServerError   → 500 Internal Server Error
ServiceUnavailableError → 503 Service Unavailable
```

### 주요 유틸리티
```typescript
toErrorResponse(error, txId?)           → ErrorResponse 변환
zodErrorToValidationErrors(error)       → Zod 에러 정규화
isApiError(error)                       → ApiError 타입 가드
```
