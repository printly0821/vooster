# T-014: 디스플레이 등록, 페어링 및 트리거 API - 타입 및 검증 스키마 설계

## 개요

T-014는 브라우저 확장의 원격 디스플레이 등록, 페어링, 트리거 기능을 위한 REST API를 구현합니다. 이 문서는 T-014에서 필요한 모든 타입 정의와 Zod 검증 스키마를 상세히 설계합니다.

**문서 기준**:
- T-012: Socket.IO 서버 기본 설정 및 JWT 인증
- T-013: 채널 관리 및 메시지 라우팅
- 기존 타입: `/server/src/types/index.ts` (DisplayAuthClaims, DisplaySocketData 등)

---

## 1. 기존 타입 시스템 분석

### 1.1 현재 정의된 핵심 타입

```typescript
// JWT 토큰 페이로드 (T-012에서 정의)
export interface DisplayAuthClaims {
  sub: string;                  // 사용자 ID
  deviceId: string;              // 디바이스 고유 ID
  screenId: string;              // 화면 ID (screen:orgId:lineId)
  scopes: string[];              // 권한 배열 (예: 'display:screen-1')
  iat: number;                   // 발급 시간 (Unix 타임스탐프)
  exp: number;                   // 만료 시간 (Unix 타임스탐프)
}

// Socket 데이터 (T-012에서 정의)
export interface DisplaySocketData {
  deviceId: string;              // 디바이스 고유 ID
  screenId: string;              // 화면 ID
  authenticatedAt: number;       // 인증 완료 시간 (Unix 타임스탐프)
}

// 채널 메시지 (T-013에서 정의)
export interface ChannelMessage {
  txId: string;                  // 트랜잭션 ID (idempotency)
  eventType: 'navigate' | 'command' | 'update';
  payload: any;
  timestamp: number;
}

// 채널 상태 (T-013에서 정의)
export interface ChannelStatus {
  screenId: string;
  connected: number;
  online: boolean;
}

// 메시지 전송 결과 (T-013에서 정의)
export interface EmitResult {
  ok: boolean;
  txId?: string;
  clientCount?: number;
  reason?: 'duplicate' | 'no_clients' | 'error';
}
```

### 1.2 확장 필요 영역

T-014 구현 시 추가되어야 할 타입:
1. **디스플레이 등록/관리**: DisplayRegisterRequest, Display, DisplayListResponse
2. **페어링 시스템**: PairingSession, PairQRResponse, PairPollResponse, PairApproveRequest/Response
3. **트리거 시스템**: TriggerRequest, TriggerResponse, TriggerLog
4. **에러 응답**: ErrorResponse, ValidationError
5. **인증/권한**: AuthContext, RateLimitConfig

---

## 2. 타입 정의

### 2.1 디스플레이 관련 타입

#### 2.1.1 디스플레이 등록 요청

```typescript
/**
 * 디스플레이 등록 요청
 *
 * 브라우저 확장이 서버에 자신을 등록할 때 전송하는 페이로드
 * 30초마다 heartbeat로 호출되어 last_seen_at 업데이트
 */
export interface DisplayRegisterRequest {
  /** 디바이스 고유 ID (UUID 또는 기기 식별자) */
  deviceId: string;

  /** 디스플레이 이름 (UI에 표시할 사용자 친화적 이름) */
  name: string;

  /** 디스플레이 용도 (예: '제조 공정 모니터링', '품질 검사') */
  purpose: string;

  /** 조직 ID (권한 관리용) */
  orgId: string;

  /** 라인 ID (생산 라인 식별) */
  lineId: string;
}
```

#### 2.1.2 디스플레이 정보 (DB 모델)

```typescript
/**
 * 디스플레이 정보
 *
 * 데이터베이스에 저장되는 디스플레이의 상태 정보
 */
export interface Display {
  /** 디바이스 고유 ID */
  deviceId: string;

  /** 화면 ID (자동 생성, screen:orgId:lineId 형식) */
  screenId: string;

  /** 디스플레이 이름 */
  name: string;

  /** 디스플레이 용도 */
  purpose: string;

  /** 조직 ID */
  orgId: string;

  /** 라인 ID */
  lineId: string;

  /** 마지막 heartbeat 시간 (온라인 상태 판단에 사용) */
  lastSeenAt: Date;

  /** 온라인 상태 ('online' = 60초 이내 heartbeat, 'offline' = 미갱신) */
  status: 'online' | 'offline';

  /** 데이터 생성 시간 */
  createdAt: Date;

  /** 데이터 마지막 수정 시간 */
  updatedAt: Date;
}
```

#### 2.1.3 디스플레이 등록 응답

```typescript
/**
 * 디스플레이 등록 응답
 *
 * POST /api/displays/register의 응답
 */
export interface DisplayRegisterResponse {
  /** 성공 여부 */
  ok: true;

  /** 자동 생성된 화면 ID (screen:orgId:lineId 형식) */
  screenId: string;

  /** 디스플레이 상태 */
  status: 'registered' | 'updated';
}
```

#### 2.1.4 디스플레이 조회 응답

```typescript
/**
 * 디스플레이 목록 조회 응답
 *
 * GET /api/displays의 응답
 * 스마트폰이 호출하여 특정 라인의 온라인 디스플레이 목록을 조회
 */
export interface DisplayListResponse {
  /** 성공 여부 */
  ok: true;

  /** 디스플레이 목록 */
  displays: DisplaySummary[];
}

/**
 * 디스플레이 요약 정보
 *
 * 목록 조회 시 반환되는 간단한 정보
 */
export interface DisplaySummary {
  /** 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 디스플레이 이름 */
  name: string;

  /** 디스플레이 용도 */
  purpose: string;

  /** 온라인 여부 (마지막 heartbeat이 60초 이내면 true) */
  online: boolean;

  /** 마지막 접속 시간 */
  lastSeen: Date;
}
```

---

### 2.2 페어링 시스템 타입

#### 2.2.1 페어링 세션 (DB 모델)

```typescript
/**
 * 페어링 세션
 *
 * 데이터베이스에 저장되는 페어링 프로세스의 상태
 * PC가 QR을 생성하면 세션을 만들고, 스마트폰이 승인하면 토큰 발급
 */
export interface PairingSession {
  /** 세션 고유 ID (UUID) */
  sessionId: string;

  /** 페어링 확인 코드 (6자리 숫자, 사용자가 입력) */
  code: string;

  /** 페어링 상태 */
  status: 'pending' | 'approved' | 'expired';

  /** 세션 만료 시간 (기본 5분) */
  expiresAt: Date;

  /** 세션 생성 시간 */
  createdAt: Date;

  /** JWT 토큰 (status가 'approved'일 때만 값 있음) */
  token?: string;

  /** 페어링 승인자의 사용자 ID */
  approvedBy?: string;

  /** 페어링 승인 시간 */
  approvedAt?: Date;

  /** 승인자의 IP 주소 */
  approverIp?: string;
}
```

#### 2.2.2 QR 생성 응답

```typescript
/**
 * QR 코드 생성 응답
 *
 * POST /api/pair/qr의 응답
 * PC에서 호출하여 스마트폰이 스캔할 QR 코드를 생성
 */
export interface PairQRResponse {
  /** 성공 여부 */
  ok: true;

  /** 페어링 세션 ID (폴링 시 사용) */
  sessionId: string;

  /** QR 코드 데이터 (JSON.stringify({ sessionId, code, wsUrl })) */
  qrData: string;

  /** 세션 만료까지 남은 시간 (초 단위, 기본 300초) */
  expiresIn: number;

  /** 페어링 확인 코드 (UI에 표시, 수동 입력용) */
  code: string;
}
```

#### 2.2.3 QR 데이터 구조

```typescript
/**
 * QR 코드에 인코딩되는 데이터
 *
 * QR 코드는 이 객체를 JSON.stringify한 문자열을 인코딩
 */
export interface PairQRData {
  /** 페어링 세션 ID */
  sessionId: string;

  /** 페어링 확인 코드 (6자리) */
  code: string;

  /** WebSocket 연결 URL (스마트폰이 승인 후 사용) */
  wsUrl: string;
}
```

#### 2.2.4 페어링 폴링 응답

```typescript
/**
 * 페어링 폴링 응답
 *
 * GET /api/pair/poll/:sessionId의 응답
 * PC가 장시간 폴링하여 스마트폰의 승인 확인 (Long Polling, 30초 타임아웃)
 */
export type PairPollResponse = PairPollSuccess | PairPollPending | PairPollFailed;

/**
 * 페어링 폴링 성공 (스마트폰이 승인함)
 */
export interface PairPollSuccess {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 (클라이언트 인증용) */
  token: string;

  /** 자동 생성된 화면 ID (screen:orgId:lineId) */
  screenId: string;
}

/**
 * 페어링 폴링 대기 중
 */
export interface PairPollPending {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'timeout';
}

/**
 * 페어링 폴링 실패
 */
export interface PairPollFailed {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'not_found' | 'expired';
}
```

#### 2.2.5 페어링 승인 요청

```typescript
/**
 * 페어링 승인 요청
 *
 * POST /api/pair/approve의 요청 본문
 * 스마트폰이 QR을 스캔하여 sessionId와 code를 확인한 후 서버로 전송
 * JWT 토큰이 필요함 (사용자 인증)
 */
export interface PairApproveRequest {
  /** 페어링 세션 ID (QR에서 추출) */
  sessionId: string;

  /** 페어링 확인 코드 (사용자가 입력하거나 QR에서 추출) */
  code: string;
}
```

#### 2.2.6 페어링 승인 응답

```typescript
/**
 * 페어링 승인 응답
 *
 * POST /api/pair/approve의 응답
 */
export type PairApproveResponse = PairApproveSuccess | PairApproveFailed;

/**
 * 페어링 승인 성공
 */
export interface PairApproveSuccess {
  /** 성공 여부 */
  ok: true;

  /** JWT 토큰 (브라우저 확장이 Socket.IO 연결 시 사용) */
  token: string;

  /** 자동 생성된 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 토큰 만료 시간 (Unix 타임스탐프) */
  expiresAt: number;
}

/**
 * 페어링 승인 실패
 */
export interface PairApproveFailed {
  /** 성공 여부 */
  ok: false;

  /** 실패 이유 */
  reason: 'invalid_session' | 'expired' | 'invalid_code' | 'validation_error';

  /** 검증 에러 상세 (reason='validation_error'일 때) */
  errors?: ValidationError[];
}
```

---

### 2.3 트리거 시스템 타입

#### 2.3.1 트리거 요청

```typescript
/**
 * 트리거 요청
 *
 * POST /api/trigger의 요청 본문
 * 스마트폰이 바코드를 스캔한 후 해당 주문을 원격 디스플레이에 표시하도록 요청
 * JWT Bearer 토큰이 필수 (사용자 인증)
 */
export interface TriggerRequest {
  /** 화면 ID (screen:orgId:lineId 형식) */
  screenId: string;

  /** 주문 번호 */
  jobNo: string;

  /** 선택적: 커스텀 데이터 (향후 확장용) */
  metadata?: Record<string, any>;
}
```

#### 2.3.2 트리거 응답

```typescript
/**
 * 트리거 응답
 *
 * POST /api/trigger의 응답
 */
export type TriggerResponse = TriggerSuccess | TriggerFailed;

/**
 * 트리거 성공 (메시지가 클라이언트로 전송됨)
 */
export interface TriggerSuccess {
  /** 성공 여부 */
  ok: true;

  /** 트랜잭션 ID (메시지 추적용, 중복 방지) */
  txId: string;

  /** 메시지를 받은 클라이언트 수 */
  clientCount: number;

  /** 메시지 전송 시간 */
  sentAt: number;
}

/**
 * 트리거 실패
 */
export interface TriggerFailed {
  /** 성공 여부 */
  ok: false;

  /** 트랜잭션 ID (부분 실패 시에도 생성) */
  txId: string;

  /** 실패 이유 */
  reason:
    | 'validation_error'    // 입력 검증 실패
    | 'forbidden'           // 권한 부족
    | 'not_found'           // 디스플레이를 찾을 수 없음
    | 'no_clients'          // 해당 디스플레이에 연결된 클라이언트 없음
    | 'rate_limit'          // Rate limit 초과
    | 'error';              // 기타 에러

  /** 검증 에러 상세 (reason='validation_error'일 때) */
  errors?: ValidationError[];

  /** 에러 메시지 (reason='error'일 때) */
  message?: string;
}
```

#### 2.3.3 트리거 로그 (감시/감사용)

```typescript
/**
 * 트리거 로그
 *
 * 모든 트리거 API 호출을 기록하여 감시, 감사, 분석에 사용
 */
export interface TriggerLog {
  /** 로그 ID */
  id: string;

  /** 트리거를 요청한 사용자 ID */
  userId: string;

  /** 대상 화면 ID */
  screenId: string;

  /** 주문 번호 */
  jobNo: string;

  /** 트랜잭션 ID (메시지 추적용) */
  txId: string;

  /** 전송 상태 */
  status: 'delivered' | 'missed';

  /** 메시지를 받은 클라이언트 수 (delivered면 >= 1, missed면 0) */
  clientCount: number;

  /** 요청자 IP 주소 */
  ip: string;

  /** 요청 시간 */
  timestamp: Date;

  /** 응답 코드 (HTTP status) */
  statusCode: number;

  /** 에러 메시지 (실패 시) */
  errorMessage?: string;
}
```

---

### 2.4 에러 및 검증 타입

#### 2.4.1 에러 응답

```typescript
/**
 * 통일된 에러 응답
 *
 * 모든 에러는 이 형식으로 반환
 */
export interface ErrorResponse {
  /** 성공 여부 (항상 false) */
  ok: false;

  /** 에러 분류 (프로그래밍 방식으로 처리 가능) */
  reason: string;

  /** 사용자 친화적 에러 메시지 (한글) */
  message?: string;

  /** 검증 에러 목록 (validation_error일 때만) */
  errors?: ValidationError[];

  /** 트랜잭션 ID (추적 가능하게) */
  txId?: string;
}
```

#### 2.4.2 검증 에러

```typescript
/**
 * Zod 검증 에러 정보
 *
 * Zod의 ZodError를 정규화하여 클라이언트로 반환
 */
export interface ValidationError {
  /** 에러가 발생한 필드 경로 (예: 'screenId', 'metadata.key') */
  field: string;

  /** 에러 메시지 (예: 'Invalid email format') */
  message: string;

  /** 에러 타입 (예: 'regex', 'too_small', 'invalid_type') */
  code: string;

  /** 에러 관련 추가 데이터 (예: { minimum: 1, received: 0 }) */
  context?: Record<string, any>;
}
```

#### 2.4.3 인증 컨텍스트

```typescript
/**
 * 인증된 요청의 사용자 컨텍스트
 *
 * 미들웨어에서 JWT를 검증한 후 요청 객체에 첨부
 */
export interface AuthContext {
  /** 사용자 ID */
  userId: string;

  /** 사용자 역할 (향후 확장용) */
  role: string;

  /** JWT 클레임에서 추출한 scopes (예: ['display:screen-1', 'display:screen-2']) */
  scopes: string[];

  /** 요청자 IP 주소 */
  ip: string;

  /** 토큰 발급 시간 */
  issuedAt: number;

  /** 토큰 만료 시간 */
  expiresAt: number;
}
```

---

### 2.5 Rate Limiting 타입

```typescript
/**
 * Rate Limiting 설정
 *
 * API별로 다른 제한을 적용하기 위한 설정
 */
export interface RateLimitConfig {
  /** API 엔드포인트 (예: '/api/trigger') */
  endpoint: string;

  /** IP 기반 제한 (초당 요청 수) */
  perSecondIp?: number;

  /** 사용자 기반 제한 (분당 요청 수) */
  perMinuteUser?: number;

  /** 토큰 버킷 용량 */
  burstSize?: number;
}

/**
 * Rate Limit 상태
 *
 * Redis에 저장되어 추적되는 현재 상태
 */
export interface RateLimitState {
  /** 요청 개수 */
  count: number;

  /** 창 시작 시간 (Unix 타임스탐프) */
  windowStart: number;

  /** 마지막 요청 시간 */
  lastRequestAt: number;
}
```

---

## 3. Zod 검증 스키마

### 3.1 디스플레이 관련 스키마

```typescript
import { z } from 'zod';

/**
 * 디스플레이 등록 요청 검증 스키마
 *
 * deviceId는 브라우저 확장이 생성한 UUID 또는 기기 식별자
 * orgId, lineId는 하이픈을 포함한 소문자 문자열 (예: prod-line-1)
 */
export const displayRegisterSchema = z.object({
  deviceId: z
    .string()
    .min(1, '디바이스 ID는 필수입니다')
    .max(100, '디바이스 ID는 100자 이내여야 합니다')
    .regex(/^[a-zA-Z0-9\-_]+$/, '디바이스 ID는 영문, 숫자, 하이픈, 언더스코어만 사용 가능'),

  name: z
    .string()
    .min(1, '디스플레이 이름은 필수입니다')
    .max(100, '디스플레이 이름은 100자 이내여야 합니다'),

  purpose: z
    .string()
    .min(1, '용도는 필수입니다')
    .max(255, '용도는 255자 이내여야 합니다'),

  orgId: z
    .string()
    .min(1, '조직 ID는 필수입니다')
    .regex(/^[a-z0-9\-]+$/, '조직 ID는 소문자, 숫자, 하이픈만 사용 가능')
    .max(50, '조직 ID는 50자 이내여야 합니다'),

  lineId: z
    .string()
    .min(1, '라인 ID는 필수입니다')
    .regex(/^[a-z0-9\-]+$/, '라인 ID는 소문자, 숫자, 하이픈만 사용 가능')
    .max(50, '라인 ID는 50자 이내여야 합니다'),
});

export type DisplayRegisterInput = z.infer<typeof displayRegisterSchema>;
```

### 3.2 페어링 관련 스키마

```typescript
/**
 * 페어링 승인 요청 검증 스키마
 *
 * sessionId는 POST /api/pair/qr에서 반환받은 UUID
 * code는 QR에 포함된 6자리 숫자
 */
export const pairApproveSchema = z.object({
  sessionId: z
    .string()
    .uuid('세션 ID는 유효한 UUID여야 합니다'),

  code: z
    .string()
    .regex(/^\d{6}$/, '확인 코드는 6자리 숫자여야 합니다'),
});

export type PairApproveInput = z.infer<typeof pairApproveSchema>;

/**
 * 페어링 세션 ID 검증 스키마 (URL 파라미터)
 */
export const pairSessionIdSchema = z
  .string()
  .uuid('세션 ID는 유효한 UUID여야 합니다');

export type PairSessionId = z.infer<typeof pairSessionIdSchema>;
```

### 3.3 트리거 관련 스키마

```typescript
/**
 * 트리거 요청 검증 스키마
 *
 * screenId 형식: screen:orgId:lineId (예: screen:prod:line-1)
 * jobNo 형식: 사용자 정의, 1-50자
 */
export const triggerSchema = z.object({
  screenId: z
    .string()
    .regex(
      /^screen:[a-z0-9\-]+:[a-z0-9\-]+$/,
      '화면 ID 형식이 잘못되었습니다 (예: screen:prod:line-1)',
    )
    .max(100, '화면 ID는 100자 이내여야 합니다'),

  jobNo: z
    .string()
    .min(1, '주문 번호는 필수입니다')
    .max(50, '주문 번호는 50자 이내여야 합니다'),

  // 선택적 필드
  metadata: z
    .record(z.any())
    .optional()
    .refine(
      (val) => !val || Object.keys(val).length <= 10,
      '메타데이터는 최대 10개의 필드를 가질 수 있습니다',
    ),
});

export type TriggerInput = z.infer<typeof triggerSchema>;

/**
 * 트리거 스크린 ID 검증 (URL 파라미터)
 */
export const screenIdSchema = z
  .string()
  .regex(/^screen:[a-z0-9\-]+:[a-z0-9\-]+$/, '화면 ID 형식이 잘못되었습니다');

export type ScreenId = z.infer<typeof screenIdSchema>;
```

### 3.4 조합 스키마 (여러 필드 검증)

```typescript
/**
 * screenId 파싱 스키마
 *
 * screen:orgId:lineId 형식을 분해하여 orgId와 lineId 추출
 */
export const parseScreenIdSchema = z
  .string()
  .regex(/^screen:([a-z0-9\-]+):([a-z0-9\-]+)$/, '화면 ID 형식이 잘못되었습니다')
  .transform((screenId) => {
    const parts = screenId.split(':');
    return {
      screenId,
      orgId: parts[1],
      lineId: parts[2],
    };
  });

export type ParsedScreenId = z.infer<typeof parseScreenIdSchema>;

/**
 * JWT 클레임 검증 스키마
 *
 * JWT 토큰에서 추출한 데이터 검증
 */
export const jwtClaimsSchema = z.object({
  sub: z.string().min(1, '사용자 ID는 필수'),
  deviceId: z.string().min(1, '디바이스 ID는 필수'),
  screenId: z.string().regex(/^screen:[a-z0-9\-]+:[a-z0-9\-]+$/, '화면 ID 형식 오류'),
  scopes: z.array(z.string()).min(1, '권한은 최소 1개 이상'),
  iat: z.number().int().positive('발급 시간은 양수'),
  exp: z.number().int().positive('만료 시간은 양수'),
});

export type JWTClaimsInput = z.infer<typeof jwtClaimsSchema>;
```

---

## 4. 에러 타입 및 예외 처리

### 4.1 커스텀 에러 클래스

```typescript
/**
 * API 에러의 기본 클래스
 *
 * 모든 예상되는 에러는 이 클래스를 상속
 */
export abstract class ApiError extends Error {
  /** HTTP 상태 코드 */
  abstract statusCode: number;

  /** 에러 분류 (프로그래밍 방식 처리용) */
  abstract reason: string;

  /** 사용자 메시지 (한글) */
  abstract userMessage: string;

  /** 추가 데이터 (선택적) */
  abstract context?: Record<string, any>;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON(): ErrorResponse {
    return {
      ok: false,
      reason: this.reason,
      message: this.userMessage,
    };
  }
}

/**
 * 검증 에러
 */
export class ValidationError extends ApiError {
  statusCode = 400;
  reason = 'validation_error';
  userMessage = '입력 데이터가 유효하지 않습니다';
  errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
  }

  toJSON(): ErrorResponse {
    return {
      ok: false,
      reason: this.reason,
      message: this.userMessage,
      errors: this.errors,
    };
  }
}

/**
 * 권한 에러
 */
export class ForbiddenError extends ApiError {
  statusCode = 403;
  reason = 'forbidden';
  userMessage = '이 작업을 수행할 권한이 없습니다';

  constructor(message?: string) {
    super(message || 'Forbidden');
  }
}

/**
 * 찾을 수 없음 에러
 */
export class NotFoundError extends ApiError {
  statusCode = 404;
  reason = 'not_found';
  userMessage = '요청한 리소스를 찾을 수 없습니다';

  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

/**
 * Rate limit 에러
 */
export class RateLimitError extends ApiError {
  statusCode = 429;
  reason = 'rate_limit';
  userMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요';
  context: Record<string, any>;

  constructor(retryAfter: number) {
    super(`Rate limited, retry after ${retryAfter}s`);
    this.context = { retryAfter };
  }
}

/**
 * 인증 에러
 */
export class UnauthorizedError extends ApiError {
  statusCode = 401;
  reason = 'unauthorized';
  userMessage = '인증이 필요합니다';

  constructor(message?: string) {
    super(message || 'Unauthorized');
  }
}

/**
 * 서버 에러
 */
export class InternalServerError extends ApiError {
  statusCode = 500;
  reason = 'internal_error';
  userMessage = '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요';

  constructor(message?: string) {
    super(message || 'Internal server error');
  }
}
```

### 4.2 에러 응답 변환 유틸리티

```typescript
/**
 * ApiError를 ErrorResponse로 변환
 *
 * API 핸들러에서 catch한 에러를 표준화된 응답으로 변환
 */
export function toErrorResponse(error: ApiError): ErrorResponse {
  return {
    ok: false,
    reason: error.reason,
    message: error.userMessage,
    errors: error.context?.errors,
  };
}

/**
 * Zod ZodError를 ValidationError 배열로 변환
 */
export function zodErrorToValidationErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    context: err,
  }));
}
```

---

## 5. 기존 타입 시스템과의 호환성

### 5.1 기존 타입 재사용

| 기존 타입 | 위치 | T-014 활용 | 확장 필요 |
|-----------|------|-----------|----------|
| `DisplayAuthClaims` | T-012 | JWT 토큰 검증 | 불필요 |
| `DisplaySocketData` | T-012 | Socket 인증 데이터 | 불필요 |
| `ChannelMessage` | T-013 | 트리거 페이로드 | 불필요 |
| `ChannelStatus` | T-013 | 채널 상태 조회 | 불필요 |
| `EmitResult` | T-013 | 트리거 응답 | 약간의 확장 |

### 5.2 새 타입 추가 계획

| 타입 | 목적 | 의존성 |
|------|------|--------|
| `DisplayRegisterRequest` | 디스플레이 등록 요청 | 없음 |
| `Display`, `DisplaySummary` | DB 모델 및 응답 | 없음 |
| `PairingSession` | 페어링 세션 DB 모델 | 없음 |
| `PairQRResponse` | QR 생성 응답 | 없음 |
| `PairApproveRequest`, `PairApproveResponse` | 페어링 승인 | `AuthContext` |
| `TriggerRequest`, `TriggerResponse` | 트리거 요청/응답 | `AuthContext`, `EmitResult` |
| `TriggerLog` | 감시 로그 | 없음 |
| `ErrorResponse`, `ValidationError` | 에러 처리 | Zod |
| `AuthContext` | 인증 컨텍스트 | JWT |

### 5.3 타입 확장 검토

#### EmitResult 확장 검토

기존 `EmitResult` (T-013):
```typescript
export interface EmitResult {
  ok: boolean;
  txId?: string;
  clientCount?: number;
  reason?: 'duplicate' | 'no_clients' | 'error';
}
```

T-014에서 필요한 추가 정보:
- `sentAt`: 메시지 전송 시간
- `reason`에 'not_found' 추가 (displayId가 존재하지 않음)

**결론**: 기존 `EmitResult`는 그대로 사용하고, `TriggerSuccess`와 `TriggerFailed`에서 필요한 추가 필드 정의

---

## 6. JWT 클레임 구조

### 6.1 디스플레이용 JWT (Socket.IO 인증)

```typescript
/**
 * 브라우저 확장이 Socket.IO 연결 시 사용하는 JWT
 *
 * 페어링 승인 후 발급되며, Socket.IO /display 네임스페이스 연결 시 사용
 */
export interface DisplayJWTPayload {
  /** 사용자 ID */
  sub: string;

  /** 디바이스 고유 ID */
  deviceId: string;

  /** 화면 ID (screen:orgId:lineId) */
  screenId: string;

  /** 권한 배열 (예: 'display:screen-prod-line1') */
  scopes: string[];

  /** 발급 시간 (Unix 타임스탐프) */
  iat: number;

  /** 만료 시간 (Unix 타임스탐프) */
  exp: number;

  /** 토큰 타입 (향후 다른 토큰과 구분용) */
  type: 'display';
}
```

### 6.2 JWT 검증 규칙

```typescript
/**
 * JWT 검증 규칙
 *
 * - 서명 검증: HMAC-SHA256
 * - 만료 확인: exp > current_time
 * - 클레임 검증: sub, deviceId, screenId, scopes 필수
 * - 권한 확인: 요청된 screenId가 scopes에 포함되어야 함
 */
export interface JWTValidationRules {
  /** 필수 클레임 목록 */
  requiredClaims: string[];

  /** 토큰 만료 시간 (초 단위, 기본 24시간) */
  expirationSeconds: number;

  /** 최소 권한 개수 */
  minScopes: number;

  /** 권한 형식 규칙 (정규식) */
  scopePattern: RegExp;
}
```

---

## 7. 타입 파일 구조

### 7.1 파일 배치 계획

T-014 구현 시 타입 파일은 다음과 같이 구성:

```
server/src/
├── types/
│   ├── index.ts                    # 기존 Socket.IO 타입
│   ├── display.ts (NEW)            # 디스플레이 관련 타입
│   ├── pairing.ts (NEW)            # 페어링 관련 타입
│   ├── trigger.ts (NEW)            # 트리거 관련 타입
│   ├── error.ts (NEW)              # 에러 및 검증 타입
│   └── auth.ts (NEW)               # 인증 관련 타입
├── schemas/
│   ├── display.ts (NEW)            # 디스플레이 Zod 스키마
│   ├── pairing.ts (NEW)            # 페어링 Zod 스키마
│   ├── trigger.ts (NEW)            # 트리거 Zod 스키마
│   └── index.ts (NEW)              # 스키마 통합 export
└── features/
    └── api/
        ├── displays/               # 디스플레이 API
        ├── pair/                   # 페어링 API
        └── trigger/                # 트리거 API
```

### 7.2 기존 index.ts 확장 계획

기존 `server/src/types/index.ts`는 Socket.IO 타입 전담:

```typescript
// index.ts - Socket.IO 타입만 유지
export interface DisplayAuthClaims { ... }
export interface DisplaySocketData { ... }
export interface ChannelMessage { ... }
// ... 기타 Socket.IO 타입

// 신규 타입은 별도 파일에서 export
// display.ts, pairing.ts, trigger.ts 등
```

**이유**:
- 단일 책임 원칙 (Socket.IO 타입 vs REST API 타입 분리)
- 파일 크기 관리
- 향후 유지보수 용이

---

## 8. 타입 안전성 체크리스트

T-014 구현 시 다음을 확인:

### 8.1 입력 검증
- [ ] 모든 REST API 요청에 Zod 스키마 검증 적용
- [ ] 검증 실패 시 400 Bad Request + ValidationError 배열 반환
- [ ] screenId 형식 검증 (screen:orgId:lineId)
- [ ] code 형식 검증 (정확히 6자리 숫자)

### 8.2 권한 검증
- [ ] 모든 인증 요청에 JWT Bearer 토큰 필수
- [ ] JWT 클레임에서 scopes 추출 및 검증
- [ ] 사용자가 접근하려는 screenId가 scopes에 포함되는지 확인
- [ ] 권한 부족 시 403 Forbidden 반환

### 8.3 타입 안전성
- [ ] TS strict mode 활성화
- [ ] 모든 공개 함수에 JSDoc 주석 + 타입 명시
- [ ] 타입 추론 활용 (as 키워드 최소화)
- [ ] type vs interface 일관성 유지

### 8.4 에러 처리
- [ ] 모든 에러가 ErrorResponse 형식으로 변환
- [ ] txId가 모든 응답(성공/실패)에 포함
- [ ] 스택 트레이스 노출 방지 (프로덕션)

### 8.5 감시 및 감사
- [ ] 모든 API 호출 로깅 (사용자 ID, IP, 타임스탐프)
- [ ] TriggerLog 테이블 기록
- [ ] Rate limit 위반 로깅

---

## 9. 마이그레이션 가이드

### 9.1 기존 코드 영향도

T-014 타입 도입 후 영향받는 코드:

| 파일/기능 | 영향 | 대응 |
|-----------|------|------|
| T-012 Socket.IO | 없음 | `DisplayAuthClaims` 그대로 사용 |
| T-013 채널 관리 | 없음 | `EmitResult` 그대로 사용 |
| JWT 발급 로직 | 약간 | `DisplayJWTPayload` 추가 정보 포함 |
| 로깅 시스템 | 있음 | `TriggerLog` 스키마 추가 |

### 9.2 점진적 도입

1. **Phase 1**: 모든 타입 정의 및 스키마 생성 (이 문서)
2. **Phase 2**: 디스플레이 관련 API 구현 (POST /api/displays/register, GET /api/displays)
3. **Phase 3**: 페어링 API 구현 (POST /api/pair/qr, GET /api/pair/poll/:sessionId, POST /api/pair/approve)
4. **Phase 4**: 트리거 API 구현 (POST /api/trigger)
5. **Phase 5**: 통합 테스트 및 E2E 테스트

---

## 10. 예제: 타입 사용 시나리오

### 10.1 디스플레이 등록 플로우

```typescript
// 1. 요청 검증
const input = displayRegisterSchema.safeParse(req.body);
if (!input.success) {
  return res.status(400).json({
    ok: false,
    reason: 'validation_error',
    errors: zodErrorToValidationErrors(input.error),
  });
}

// 2. DB에 저장
const display: Display = {
  deviceId: input.data.deviceId,
  screenId: `screen:${input.data.orgId}:${input.data.lineId}`,
  name: input.data.name,
  purpose: input.data.purpose,
  orgId: input.data.orgId,
  lineId: input.data.lineId,
  lastSeenAt: new Date(),
  status: 'online',
  createdAt: new Date(),
  updatedAt: new Date(),
};

await db.insert('displays', display);

// 3. 응답
const response: DisplayRegisterResponse = {
  ok: true,
  screenId: display.screenId,
  status: 'registered',
};

return res.json(response);
```

### 10.2 트리거 API 플로우

```typescript
// 1. 인증 및 권한 확인
const auth = req.headers.authorization?.split(' ')[1];
if (!auth) throw new UnauthorizedError();

const claims = await verifyJWT(auth);
const authContext: AuthContext = {
  userId: claims.sub,
  role: 'user',
  scopes: claims.scopes,
  ip: req.ip,
  issuedAt: claims.iat,
  expiresAt: claims.exp,
};

// 2. 입력 검증
const parsed = triggerSchema.safeParse(req.body);
if (!parsed.success) {
  throw new ValidationError(zodErrorToValidationErrors(parsed.error));
}

// 3. 권한 확인
const hasPermission = authContext.scopes.some(
  (s) => s === `display:${parsed.data.screenId}`,
);
if (!hasPermission) {
  throw new ForbiddenError('이 화면에 접근할 권한이 없습니다');
}

// 4. 트리거 실행
const txId = crypto.randomUUID();
const emitResult = await emitToChannel(parsed.data.screenId, 'navigate', {
  txId,
  screenId: parsed.data.screenId,
  jobNo: parsed.data.jobNo,
  url: `${process.env.APP_URL}/orders/${parsed.data.jobNo}`,
  ts: Date.now(),
});

// 5. 로깅
const log: TriggerLog = {
  id: crypto.randomUUID(),
  userId: authContext.userId,
  screenId: parsed.data.screenId,
  jobNo: parsed.data.jobNo,
  txId,
  status: emitResult.ok ? 'delivered' : 'missed',
  clientCount: emitResult.clientCount || 0,
  ip: authContext.ip,
  timestamp: new Date(),
  statusCode: emitResult.ok ? 200 : 503,
};

await db.insert('trigger_logs', log);

// 6. 응답
if (emitResult.ok) {
  const response: TriggerSuccess = {
    ok: true,
    txId,
    clientCount: emitResult.clientCount || 0,
    sentAt: Date.now(),
  };
  return res.json(response);
} else {
  const response: TriggerFailed = {
    ok: false,
    txId,
    reason: emitResult.reason as any,
  };
  return res.status(503).json(response);
}
```

---

## 11. 요약 및 다음 단계

### 11.1 설계 범위 완료 항목

이 문서에서 다음을 설계했습니다:

1. **기존 타입 분석**: T-012, T-013의 타입 재사용 확인
2. **신규 타입 정의**:
   - 디스플레이 (5개 타입)
   - 페어링 (7개 타입)
   - 트리거 (4개 타입)
   - 에러 (5개 타입)
   - 인증 (1개 타입)
3. **Zod 스키마**: 6개의 검증 스키마 설계
4. **에러 처리**: 커스텀 에러 클래스 및 변환 유틸리티
5. **호환성**: 기존 코드와의 통합 전략

### 11.2 구현 시 주의사항

1. **타입 파일 분리**: `display.ts`, `pairing.ts`, `trigger.ts` 등으로 분리 관리
2. **Zod 스키마 통합**: 모든 API 핸들러에 `safeParse` 적용
3. **에러 응답 표준화**: 모든 에러가 `ErrorResponse` 형식으로 반환되도록 미들웨어 구성
4. **로깅 일관성**: 모든 API 호출에 사용자 ID, IP, 타임스탐프 기록
5. **Rate limiting**: IP/사용자별 제한 적용

### 11.3 다음 단계

1. 이 문서의 타입과 스키마를 코드로 구현 (T-014 구현 시작)
2. API 핸들러 구현 시 JSDoc 주석으로 타입 설명 추가
3. 통합 테스트에서 모든 에러 응답 형식 검증
4. E2E 테스트에서 전체 플로우 (등록 → 페어링 → 트리거) 검증

---

**문서 작성일**: 2025-10-25
**버전**: 1.0
**상태**: 설계 완료 (구현 대기)
