# 21ZV 프로젝트 T-004~T-007 통합 검증 보고서

**검증일시**: 2025-10-22
**검증자**: Claude Code (Next.js Developer)
**프로젝트**: 바코드 주문 조회 웹앱 (21ZV)
**대상 태스크**: T-004 (Socket.IO 서버), T-005 (타입 시스템), T-006 (세컨드 모니터), T-007 (제작의뢰서 연동)

---

## 1. 통합 아키텍처 검증

### 1.1 전체 시스템 구조

**현재 아키텍처:**
```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15 (App Router)                   │
│                 /scan, /monitor, /docs 등                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    [React Query]  [Zustand]   [Socket.IO Client]
         │             │             │
    (서버상태)    (로컬상태)   (실시간통신)
         │             │             │
         └─────────────┼─────────────┘
                       ▼
         ┌─────────────────────────────┐
         │   Hono.js API Routes        │
         │  /api/[[...hono]]/route.ts  │
         └──────────┬──────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   [Supabase]  [JWT Auth]  [세션관리]
   (PostgreSQL)  (인증)    (룸관리)
        │           │           │
        └───────────┼───────────┘
                    ▼
        ┌─────────────────────────────┐
        │   Express + Socket.IO       │
        │   server/src/index.ts       │
        └─────────────────────────────┘
```

**분석 결과:**
✓ **긍정평가**:
  - 명확한 계층 분리 (프론트/백엔드)
  - Socket.IO 서버와 Next.js 앱 분리 (배포 유연성)
  - Feature-based 아키텍처 일관성 유지
  - 인증/인가 미들웨어 체계화

✗ **개선 필요**:
  - Socket.IO 서버와 Next.js 앱 간 환경변수 동기화 부재
  - 타입 공유 메커니즘 미흡 (server/src/types와 src/features의 중복)
  - 에러 핸들링 표준화 부족

---

### 1.2 클라이언트-서버 통신 흐름 검증

#### A. Socket.IO 연결 흐름

**현재 구현:**

```typescript
// 클라이언트 측 (T-006, T-007)
socket = io(serverUrl, {
  auth: { token: jwtToken },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
})

// 서버 측 (T-004)
io.use(authMiddleware(jwtSecret))
io.on('connection', socket => {
  socket.on('registerClient', handleRegisterClient(io, socket))
  socket.on('scanOrder', handleScanOrder(io, socket))
  socket.on('session:create', handleSessionCreate(io, socket))
})
```

**평가:**

✓ **강점**:
  - JWT 토큰 기반 인증 구현
  - 자동 재연결 설정 (5회 시도)
  - ACK 기반의 신뢰성 있는 이벤트 전송
  - 타임아웃 처리 (2000ms)

✗ **위험요소**:
  - 토큰 만료 시 자동 갱신 로직 부재
  - 연결 끊김 시 로컬 스토리지 대기열 메커니즘 미흡
  - 클라이언트 토큰 발급 로직이 명확하지 않음
  - 세션 상태 동기화 검증 로직 누락

#### B. 상태 동기화 메커니즘

**현재 구현:**

```typescript
// scanOrder 이벤트 전송
socket.timeout(timeout).emit('scanOrder', scanPayload, (err, ack) => {
  if (ack?.received) {
    console.log('[scanOrder] 전송 성공')
  }
})

// 재시도 큐 (scanOrderRetryQueue)
class ScanOrderRetryQueue {
  add(payload, maxRetries, timeout)
  processQueue() // 자동 처리
}
```

**평가:**

✓ **강점**:
  - nonce 기반의 중복 전송 방지
  - 재시도 로직 구현 (최대 3회)
  - 타임스탬프 기반의 순서 보장

✗ **약점**:
  - 로컬 Queue에 저장되지 않아 새로고침 시 손실
  - 모니터 측 상태 동기화 검증 부재
  - 네트워크 복구 후 상태 일관성 검증 로직 없음

---

### 1.3 환경변수 관리 검증

**현재 상태:**

| 항목 | 프론트엔드 | 백엔드 | 상태 |
|------|----------|-------|------|
| **NEXT_PUBLIC_SOCKET_IO_URL** | src/constants/env.ts | - | ✓ 정의 |
| **NEXT_PUBLIC_SOCKET_IO_TOKEN** | src/features/monitor | - | ✓ 정의 (테스트용) |
| **NEXT_PUBLIC_SESSION_ID** | useScanOrderSocket | - | ✓ 정의 (테스트용) |
| **NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE** | /monitor/page.tsx | - | ✓ 정의 |
| **SOCKET_JWT_SECRET** | - | server/utils/config | ✓ 정의 |
| **PORT** | - | server/utils/config | ✓ 정의 (기본: 3000) |
| **CORS_ORIGINS** | - | server/utils/config | ✓ 정의 |

**평가:**

✓ **강점**:
  - NEXT_PUBLIC_* 프리픽스로 브라우저 노출 환경변수 명확히 구분
  - .env.example 문서화 완료
  - TypeScript Zod 스키마로 런타임 검증

✗ **문제점**:
  - **테스트 토큰이 프로덕션 코드에 하드코딩됨**:
    - `NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token`
    - `NEXT_PUBLIC_SESSION_ID=test-session-id`
  - 프로덕션 환경에서의 토큰 획득 메커니즘 불명확
  - 서버 환경변수 Zod 검증 부재 (server/src/utils/config.ts 에서)
  - Vercel 배포 환경의 환경변수 주입 방법 문서화 부재

**권장사항:**
```typescript
// .env.local (테스트용)
NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token

// .env.production (프로덕션)
# 빌드 타임에 주입되어야 함
NEXT_PUBLIC_SOCKET_IO_TOKEN=${SOCKET_IO_TOKEN}
```

---

### 1.4 파일 구조 평가

**현재 구조:**

```
src/
├── features/
│   ├── camera/          ✓ T-005 (카메라 타입 시스템)
│   │   ├── types.ts
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── components/
│   ├── monitor/         ✓ T-006 (세컨드 모니터)
│   │   ├── components/MonitorController
│   │   ├── lib/
│   │   │   ├── socket-client.ts
│   │   │   ├── socket-event-client.ts
│   │   │   ├── window-manager.ts
│   │   │   └── qr-generator.ts
│   │   └── types.ts
│   └── ...
├── app/
│   ├── scan/            ✓ T-006, T-007
│   │   ├── _hooks/useScanOrderSocket.ts
│   │   └── page.tsx
│   └── monitor/         ✓ T-006 (세컨드 모니터 페이지)
│       └── page.tsx
└── constants/
    └── env.ts           ✓ 환경변수 관리

server/
├── src/
│   ├── middleware/auth.ts           ✓ T-004 JWT 인증
│   ├── events/handlers.ts           ✓ T-004 이벤트 처리
│   ├── services/
│   │   ├── sessionService.ts        ✓ T-004 세션 관리
│   │   └── sessionPairingService.ts ✓ T-004 페어링 로직
│   └── utils/
│       ├── config.ts                ✓ 환경변수
│       └── logger.ts                ✓ 로깅
└── README.md (잘 문서화됨)
```

**평가:**

✓ **강점**:
  - Feature-based 모듈화 원칙 준수
  - 관심사의 명확한 분리
  - 파일명 컨벤션 일관성 (camelCase, PascalCase 구분)

✗ **개선 필요**:
  - `src/features/monitor/` vs `src/app/monitor/` 역할 모호
  - 공유 타입 정의 위치 미분류:
    - `server/src/types/` (Socket.IO)
    - `src/features/monitor/types.ts` (React 컴포넌트)
  - API 응답 DTO 스키마 위치 불명확
  - Error 타입 정의 분산 (server/src/services/sessionPairingService.ts 내부)

---

## 2. TypeScript 컴파일 에러 분석 및 해결

### 2.1 현재 에러

```
server/src/services/sessionPairingService.ts:19:24
Type error: Object is possibly 'undefined'.

    result += alphabet[bytes[Math.floor(i / 8) % bytes.length] % alphabet.length];
                              ^
```

### 2.2 원인 분석

**코드:**
```typescript
function generateSessionId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(6);  // Buffer로 undefined가 될 수 없음
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += alphabet[bytes[Math.floor(i / 8) % bytes.length] % alphabet.length];
    //                  ↑
    //                  bytes가 undefined일 수 있다고 타입스크립트가 판단
  }
  return result;
}
```

**근본 원인:**
- `randomBytes(6)`은 항상 6바이트 Buffer를 반환
- 하지만 TypeScript의 strict mode에서 `bytes[index]`는 `number | undefined`로 인식
- Array 접근 시 bounds checking이 없음으로 인한 잠재적 위험

### 2.3 해결 방안

**옵션 A: 타입 좁히기 (권장)**
```typescript
function generateSessionId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(6);
  let result = '';
  for (let i = 0; i < 8; i++) {
    const byteIndex = Math.floor(i / 8) % bytes.length;
    const byte = bytes[byteIndex];
    if (byte !== undefined) {
      result += alphabet[byte % alphabet.length];
    }
  }
  return result;
}
```

**옵션 B: 더 간단한 구현**
```typescript
function generateSessionId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(5);
  let result = '';
  bytes.forEach(byte => {
    result += alphabet[byte % alphabet.length];
  });
  return result;
}
```

**옵션 C: nanoid 라이브러리 사용 (최고 권장)**
```typescript
// 이미 package.json에 nanoid@^5.1.6이 설치되어 있음
import { nanoid } from 'nanoid';

function generateSessionId(): string {
  // nanoid(8) = 8자 ID 생성, A-Za-z0-9_- 문자 사용
  return nanoid(8).toUpperCase();
}
```

### 2.4 테스트 케이스 검증 에러

**파일**: `server/src/services/__tests__/sessionPairingService.test.ts:229`

테스트 코드의 같은 에러 발생. 위 해결안 적용 시 자동 해결됨.

---

## 3. 보안 검증

### 3.1 토큰 관리

| 항목 | 현재 상태 | 평가 | 권장사항 |
|------|---------|------|---------|
| **JWT 비밀키** | env에서 관리 | ✓ 적절 | 프로덕션: 32+ 자 권장 |
| **토큰 만료** | 10분 설정 | ✓ 적절 | - |
| **토큰 저장** | 로컬메모리 (socketRef) | ⚠️ 새로고침 손실 | sessionStorage 검토 필요 |
| **브라우저 노출** | NEXT_PUBLIC_SOCKET_IO_TOKEN | ⚠️ 위험 | 런타임 토큰 발급 필요 |

**문제점:**

1. **테스트 토큰이 프로덕션 코드에 남아있음**
   ```typescript
   const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token';
   ```
   → 실제 배포 시 'test-token'으로 실행될 위험

2. **토큰 획득 로직 부재**
   - 현재: 정적 토큰 사용
   - 필요: 사용자 인증 후 동적 토큰 발급
   ```typescript
   // 예시 구현
   async function getSocketToken(): Promise<string> {
     const response = await fetch('/api/socket/token');
     const { token } = await response.json();
     return token;
   }
   ```

3. **CORS 오리진 검증**
   ✓ 서버에서 CORS_ORIGINS로 제한
   ✓ Socket.IO에서 cors.origin 설정
   → 문제 없음

### 3.2 인증/인가

| 항목 | 구현 | 평가 |
|------|------|------|
| **JWT 검증** | authMiddleware | ✓ 구현됨 |
| **역할 기반 접근** | roleMiddleware | ✓ 구현됨 |
| **세션 격리** | 룸 기반 격리 | ✓ 구현됨 |
| **토큰 갱신** | - | ✗ 미구현 |

**권장 개선:**
```typescript
// 토큰 갱신 엔드포인트 추가
app.post('/api/socket/token', async (c) => {
  const user = await getCurrentUser(c);
  const token = jwt.sign({ sub: user.id, role: user.role }, jwtSecret, {
    expiresIn: '1h'
  });
  return c.json({ token });
});
```

### 3.3 XSS/CSRF 방어

| 항목 | 현재 상태 | 평가 |
|------|---------|------|
| **Content-Security-Policy** | Helmet 적용 | ✓ |
| **CSRF 토큰** | Socket.IO 사용 (요청-응답) | ✓ |
| **입력 검증** | Zod 스키마 | ✓ |
| **HTML Escaping** | React 자동 처리 | ✓ |
| **민감 정보 로깅** | - | ✗ 검토 필요 |

**위험 영역:**
```typescript
// server/src/index.ts 로그
logger.info('클라이언트 연결: %s', socket.id);  // ✓ OK
logger.debug('%s %s', req.method, req.path);    // ✓ OK (개발 로그)

// 하지만 프로덕션에서는 민감 정보 로깅 자제 필요
// X-Auth-Token 등을 로그에 찍지 않도록 주의
```

---

## 4. 성능 평가

### 4.1 번들 크기

**의존성 분석:**
```json
주요 라이브러리:
- socket.io-client: ~50KB (gzipped)
- zxing-js/browser: ~150KB
- qrcode: ~20KB
- swiper: ~80KB
- framer-motion: ~40KB

예상 총 번들 크기: ~300-400KB (gzipped)
```

**평가:**
- ✓ 허용 범위 내 (Core Web Vitals 목표: <500KB)
- ✓ 동적 import로 코드 스플리팅 가능

### 4.2 로딩 성능

**현재 구현:**
```typescript
// useScanOrderSocket: 지연 초기화 로직 존재
useEffect(() => {
  if (!enabled) return;

  const socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  // ...
}, [enabled, serverUrl, token, sessionId]);
```

**평가:**
- ✓ 적절한 의존성 배열
- ✓ 조건부 초기화
- ✗ 타임아웃 종료 보장 필요

### 4.3 메모리 누수 방지

**검증:**

```typescript
// 서버: 세션 정리
setInterval(() => {
  sessionService.cleanupInactiveSessions();
}, 10 * 60 * 1000);  // 10분마다

// 클라이언트: 리스너 정리
useEffect(() => {
  // ...
  return () => {
    socket.off('navigate');
    socket.disconnect();
  };
}, []);
```

**평가:**
- ✓ 서버: 30분 비활성 세션 자동 정리
- ✓ 클라이언트: cleanup 함수로 리스너 제거
- ⚠️ 큰 이벤트 객체 처리 시 추가 모니터링 필요

---

## 5. 테스트 커버리지 검증

### 5.1 현재 테스트 상황

| 테스트 타입 | 파일 | 상태 |
|----------|------|------|
| **단위 테스트** | server/__tests__/* | 부분 구현 |
| **통합 테스트** | server/src/__tests__/integration.test.ts | ✓ 구현됨 |
| **E2E 테스트** | playwright 설정됨 | - 미구현 |
| **컴포넌트 테스트** | vitest 설정됨 | - 미구현 |

### 5.2 필요한 테스트

**필수 추가 테스트:**

1. **Socket.IO 이벤트 핸들러**
   ```typescript
   describe('scanOrder event', () => {
     it('should validate payload with nonce', () => {});
     it('should retry on timeout', () => {});
     it('should handle offline scenario', () => {});
   });
   ```

2. **세션 페어링**
   ```typescript
   describe('SessionPairingService', () => {
     it('should generate 8-char sessionId', () => {});
     it('should expire token after 10 minutes', () => {});
     it('should cleanup inactive sessions', () => {});
   });
   ```

3. **모니터 페이지**
   ```typescript
   describe('MonitorController', () => {
     it('should connect to socket server', () => {});
     it('should display order form on navigate event', () => {});
     it('should handle reconnection', () => {});
   });
   ```

### 5.3 테스트 실행 현황

```bash
npm run test           # Vitest (성공)
npm run test:server   # Jest (2 에러 - 컴파일 에러로 인함)
npm run test:e2e      # Playwright (미구현)
```

---

## 6. 배포 준비도 체크리스트

### 6.1 빌드 & 컴파일

| 항목 | 상태 | 세부사항 |
|------|------|---------|
| **Next.js 빌드** | ✗ 실패 | `sessionPairingService.ts:19` TypeScript 에러 |
| **서버 컴파일** | ✓ 성공 | `tsc --project server/tsconfig.json` 완료 |
| **타입 체크** | ✗ 실패 | 위와 동일한 에러 |
| **린트** | ? 미확인 | `npm run lint` 결과 필요 |

**조치:**
1. `sessionPairingService.ts` 19번 줄 수정 필수
2. 테스트 파일도 동일 에러 있음

### 6.2 환경변수 관리

| 환경 | Supabase | Socket.IO | 기타 |
|------|----------|-----------|------|
| **개발** | .env.local | 포트 3000 | 테스트 토큰 |
| **테스트** | .env.test | Mock | - |
| **프로덕션** | ✗ 미정의 | ✗ 미정의 | - |

**필요한 작업:**
```bash
# Vercel 배포 환경에서 설정해야 할 변수
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SOCKET_IO_URL=https://socket.yourapp.com
NEXT_PUBLIC_SOCKET_IO_TOKEN=runtime-token (동적 발급 필요)
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=...
```

### 6.3 배포 인프라

| 항목 | 현재 | 권장 |
|------|------|------|
| **Next.js 앱** | Vercel (권장) | Vercel 또는 Self-hosted |
| **Socket.IO 서버** | Standalone Node.js | Heroku, Railway, DigitalOcean, AWS EC2 |
| **데이터베이스** | Supabase PostgreSQL | ✓ 기존 설정 유지 |
| **Redis** | 선택사항 | 분산 배포 시 필수 |

**Vercel 배포 시 고려사항:**

1. Socket.IO 서버 별도 배포 필요 (Vercel은 serverless)
2. CORS 설정: `NEXT_PUBLIC_SOCKET_IO_URL`은 HTTPS여야 함
3. 웹소켓 지원 확인 필요

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ]
      }
    ];
  }
};
```

### 6.4 모니터링 & 로깅

| 항목 | 현재 | 평가 |
|------|------|------|
| **에러 로깅** | Pino 설정됨 | ✓ |
| **성능 메트릭** | - | ✗ 미구현 |
| **사용자 활동 로깅** | - | ✗ 미구현 |
| **헬스체크** | `/health`, `/status` | ✓ |
| **모니터링 대시보드** | - | 검토 필요 |

**추가 필요:**
```typescript
// 성능 모니터링
import { performance } from 'perf_hooks';

socket.on('scanOrder', (payload) => {
  const start = performance.now();
  // ... 처리
  const duration = performance.now() - start;
  logger.info('scanOrder processed in %dms', duration);
});

// Sentry 통합 (선택사항)
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### 6.5 SIGTERM 처리

**현재 구현:**
```typescript
// server/src/index.ts
process.on('SIGTERM', () => {
  logger.info('SIGTERM 신호 수신 - 서버 종료 중...');
  server.close(() => {
    logger.info('서버가 종료되었습니다');
    process.exit(0);
  });
});
```

**평가:**
- ✓ 기본 구현 완료
- ⚠️ 진행 중인 소켓 연결 정리 로직 추가 권장

```typescript
// 개선된 graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM 신호 수신 - 서버 종료 중...');

  // 새 연결 거부
  server.close(() => {
    logger.info('HTTP 서버 종료됨');

    // 기존 소켓 정리 (최대 30초 대기)
    const clients = io.engine.clientsCount;
    if (clients > 0) {
      io.disconnectSockets();
      logger.info('%d개 소켓 연결 종료', clients);
    }

    process.exit(0);
  });

  // 강제 종료 타임아웃
  setTimeout(() => {
    logger.error('강제 종료 (30초 초과)');
    process.exit(1);
  }, 30000);
});
```

---

## 7. 기술 결정 검증

### 7.1 Socket.IO 선택

| 항목 | 선택 | 평가 | 대안 |
|------|------|------|------|
| **실시간 통신** | Socket.IO | ✓ 적절 | WebSocket, gRPC |
| **재연결 전략** | 자동 | ✓ 적절 | 수동 |
| **메시지 보증** | ACK | ✓ 적절 | - |
| **분산 배포** | Redis Adapter | 선택사항 | in-memory |

**결론:** 적절한 선택

### 7.2 JWT vs Session

| 항목 | 선택 | 이유 |
|------|------|------|
| **토큰 기반** | JWT | 마이크로서비스, 모바일 친화적 |
| **만료 시간** | 10분 | 보안과 UX 균형 |
| **갱신 전략** | 미구현 | ✗ 개선 필요 |

### 7.3 데이터베이스 선택

| 항목 | 선택 | 평가 |
|------|------|------|
| **ORM** | Supabase | ✓ 자동 타입 생성 |
| **마이그레이션** | SQL 파일 | ✓ 버전 관리 |
| **실시간** | 구독 가능 | ✓ 향후 활용 가능 |

---

## 8. 최종 체크리스트

### 빌드 & 배포

- [ ] ✗ TypeScript 컴파일 성공 (sessionPairingService.ts 19번 줄 수정 필요)
- [ ] ? 모든 테스트 통과 (컴파일 에러 해결 후 재실행)
- [ ] ? 린트 경고 없음 (`npm run lint` 필요)
- [ ] ✓ 환경변수 .env.example 완성
- [ ] ⚠️ 프로덕션 환경변수 설정 필요 (Vercel 배포 전)

### 보안

- [ ] ✗ 테스트 토큰 프로덕션 코드에서 제거
- [ ] ✓ JWT 비밀키 환경변수 관리
- [ ] ✓ CORS 오리진 제한
- [ ] ⚠️ 토큰 갱신 로직 추가
- [ ] ? 민감 정보 로깅 감사

### 기능

- [ ] ✓ Socket.IO 서버 구현 (T-004)
- [ ] ✓ 타입 시스템 (T-005)
- [ ] ✓ 세컨드 모니터 기본 (T-006)
- [ ] ⚠️ Window Management API 테스트 필요
- [ ] ✓ 제작의뢰서 연동 구조 (T-007)

### 모니터링

- [ ] ✓ 헬스체크 엔드포인트
- [ ] ✓ 상태 모니터링
- [ ] ⚠️ 에러 추적 시스템 (Sentry 검토)
- [ ] ⚠️ 성능 메트릭 수집

---

## 9. 주요 문제 및 해결책

### 문제 1: TypeScript 컴파일 에러

**심각도**: 🔴 높음 (배포 불가)

**현상:**
```
sessionPairingService.ts:19:24: Object is possibly 'undefined'
```

**원인:**
- `randomBytes(6)`의 반환 타입 좁히기 부족
- `bytes[index]` 접근 시 undefined 가능성 간과

**해결책:**
```typescript
// sessionPairingService.ts를 아래와 같이 수정
function generateSessionId(): string {
  // 옵션 A: nanoid 사용 (권장)
  import { nanoid } from 'nanoid';
  return nanoid(8).toUpperCase();

  // 옵션 B: 타입 좁히기
  // 위의 "2.3 해결 방안 > 옵션 B" 참조
}
```

**영향도:** 즉시 수정 필수

---

### 문제 2: 토큰 관리의 불완전성

**심각도**: 🟠 중간 (보안 위험)

**현상:**
```typescript
const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token';
```

**문제:**
- 테스트 토큰이 프로덕션 코드에 남아있음
- 프로덕션 배포 시 'test-token'으로 실행될 위험
- 사용자별 토큰 발급 로직 부재

**해결책:**

1. **테스트 토큰 제거:**
```typescript
// src/constants/env.ts
const socketIoUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL;
const socketIoToken = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN;

if (!socketIoUrl || !socketIoToken) {
  console.warn('Socket.IO 설정이 불완전합니다');
}
```

2. **런타임 토큰 발급:**
```typescript
// src/features/monitor/hooks/useSocketToken.ts
export function useSocketToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const response = await fetch('/api/socket/token');
      const { token } = await response.json();
      setToken(token);
    };

    fetchToken();
  }, []);

  return token;
}

// src/app/api/socket/token/route.ts
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const token = jwt.sign(
    { sub: user.id, role: 'mobile' },
    process.env.SOCKET_JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return Response.json({ token });
}
```

**영향도:** 배포 전 필수 개선

---

### 문제 3: 상태 동기화의 취약점

**심각도**: 🟠 중간

**현상:**
- 클라이언트 새로고침 시 재시도 큐 손실
- 모니터 측 상태 일관성 검증 부재
- 네트워크 복구 후 상태 검증 로직 없음

**해결책:**

1. **IndexedDB를 이용한 영구 큐:**
```typescript
// src/features/monitor/lib/persistent-queue.ts
export class PersistentQueue {
  async add(payload: ScanOrderPayload): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('queue', 'readwrite');
    await tx.objectStore('queue').add(payload);
  }

  async getAll(): Promise<ScanOrderPayload[]> {
    const db = await this.getDB();
    return db.getAll('queue');
  }
}
```

2. **상태 동기화 메커니즘:**
```typescript
socket.on('navigate', (data) => {
  // 수신한 주문이 대기열에 있으면 제거
  queue.remove(data.nonce);
});
```

**영향도:** Phase 2 기능, 현재는 낮은 우선순위

---

### 문제 4: 환경 분리 부족

**심각도**: 🟡 낮음

**현상:**
```
.env.example  (문서용)
.env.local    (개발용)
.env.test     (테스트용)
(없음)        (프로덕션용)
```

**해결책:**

```bash
# 프로덕션 배포 시 Vercel UI에서 설정:
NEXT_PUBLIC_SOCKET_IO_URL=https://socket-api.yourapp.com
NEXT_PUBLIC_SOCKET_IO_TOKEN=(런타임 발급 - 비워두기)
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=https://intra.yourapp.com/orders/{orderNo}

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SOCKET_JWT_SECRET=(강력한 32+ 문자 키)
```

**영향도:** 배포 전 필수

---

## 10. 최종 평가

### 통합 완성도: **7.5/10**

**강점:**
- ✓ Architecture 설계 우수 (Feature-based, 계층 분리)
- ✓ Socket.IO 구현 견고 (재연결, ACK, 로깅)
- ✓ TypeScript 타입 시스템 기본 완성
- ✓ 인증/인가 미들웨어 적절
- ✓ 세션 페어링 로직 창의적

**약점:**
- ✗ TypeScript 컴파일 에러 1건 (즉시 해결 가능)
- ✗ 토큰 관리 불완전 (테스트 토큰 남음)
- ⚠️ 상태 동기화 메커니즘 기본 수준
- ⚠️ 테스트 커버리지 부족
- ⚠️ 모니터링 기능 최소화

---

### 배포 준비도: **5/10** (1=준비불가, 10=즉시배포가능)

| 항목 | 준비도 |
|------|-------|
| 빌드 | 2/10 (컴파일 에러 제거 필요) |
| 보안 | 6/10 (토큰 관리 개선 필요) |
| 테스트 | 4/10 (기본 통합 테스트만 존재) |
| 모니터링 | 5/10 (헬스체크만 있음) |
| 문서 | 8/10 (Server README 우수) |
| 인프라 | 4/10 (배포 전략 미정) |

---

### 프로덕션 권장도: **No** (현재 상태)

**이유:**

1. **필수 차단 사항:**
   - TypeScript 컴파일 에러 해결 필요
   - 테스트 토큰 제거 필수
   - 토큰 발급 API 구현 필요

2. **강권 권장 사항:**
   - 통합 테스트 추가 (scanOrder 흐름)
   - 모니터 기능 E2E 테스트
   - 성능 모니터링 설정

3. **배포 후 개선 가능:**
   - 상태 동기화 개선 (Phase 2)
   - 오프라인 캐싱 (Phase 2)
   - 에러 리포트 시스템

**권장 배포 일정:**

| 단계 | 기간 | 작업 |
|------|------|------|
| 1단계 | 1-2일 | 컴파일 에러, 토큰 관리 수정 |
| 2단계 | 2-3일 | 테스트 추가, 배포 환경 구성 |
| 3단계 | 1일 | QA 검증 |
| 4단계 | 2025-11-05 예상 | 프로덕션 배포 |

---

### 리스크 평가: **Medium**

| 리스크 | 확률 | 영향 | 대응 |
|-------|------|------|------|
| 토큰 관리 실수 | 높음 | 높음 | 즉시 수정 |
| Socket 연결 불안 | 중간 | 높음 | 모니터링 강화 |
| 상태 불일치 | 중간 | 중간 | 페이징 감시 |
| 대규모 사용자 동시접속 | 낮음 | 높음 | Redis Adapter 준비 |

---

## 11. 상세 개선 로드맵

### 즉시 수정 (1-2일)

**1. TypeScript 컴파일 에러 해결**
```typescript
// server/src/services/sessionPairingService.ts:14-22 수정
import { nanoid } from 'nanoid';

function generateSessionId(): string {
  return nanoid(8).toUpperCase();
}
```

**2. 테스트 토큰 제거**
```typescript
// .env.example에서:
# NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token  (제거)

// src/app/monitor/page.tsx에서:
// const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token';
// 대신 hook에서 동적 발급 사용
```

**3. 토큰 발급 API 구현**
```typescript
// src/app/api/socket/token/route.ts (새로 생성)
// 위의 "문제 2: 토큰 관리" 해결책 참조
```

### 단기 개선 (3-5일)

**1. 통합 테스트 추가**
- MonitorController 연결 테스트
- scanOrder 이벤트 흐름
- 세션 페어링 검증

**2. 배포 환경 구성**
- Docker 이미지 작성
- Vercel 환경변수 설정
- Socket.IO 서버 배포 계획

**3. 에러 처리 강화**
- 네트워크 에러 복구
- 타임아웃 처리
- 사용자 피드백

### 중기 개선 (1-2주, Phase 2)

**1. 상태 동기화 개선**
- IndexedDB 영구 큐
- 네트워크 복구 검증
- 모니터 상태 동기화

**2. 모니터링 강화**
- 성능 메트릭 수집
- Sentry 통합
- 대시보드 구축

**3. 성능 최적화**
- 이미지 최적화
- 코드 스플리팅
- 캐싱 전략

---

## 12. 검증 결과 요약

### 핵심 발견사항

1. **아키텍처 설계**: 우수 (Feature-based, 명확한 계층 분리)
2. **코드 품질**: 중상 (컴파일 에러 1건, 타입 안전성 기본 확보)
3. **보안**: 중간 (토큰 관리 개선 필요)
4. **배포 준비도**: 부족 (컴파일 에러, 테스트 부족)
5. **문서**: 우수 (Server README 상세)

### 배포 전 필수 체크리스트

- [ ] TypeScript 컴파일 성공 (`npm run typecheck`)
- [ ] 모든 테스트 통과 (`npm run test:server`)
- [ ] 테스트 토큰 제거
- [ ] 토큰 발급 API 구현
- [ ] 프로덕션 환경변수 설정
- [ ] Socket.IO 서버 배포 계획 수립

### 승인 여부

**현재**: ❌ **배포 불가능**
→ 컴파일 에러 해결 후 재검증 필요

**예상 승인 일시**: 2025-10-23 (1-2일 내 수정 완료 시)

---

## 부록: 빠른 참조

### 디렉토리 가이드

```
T-004 (Socket.IO 서버)
  server/src/
  ├── index.ts                    (진입점)
  ├── events/handlers.ts          (이벤트 핸들러)
  ├── middleware/auth.ts          (JWT 인증)
  ├── services/                   (비즈니스 로직)
  │   ├── sessionService.ts
  │   └── sessionPairingService.ts ⚠️ 컴파일 에러
  └── utils/                      (설정, 로깅)

T-005 (타입 시스템)
  src/features/camera/
  ├── types.ts                    (진단 타입)
  └── hooks/                      (타입 활용)

T-006 (세컨드 모니터)
  src/features/monitor/
  ├── components/MonitorController
  ├── lib/
  │   ├── socket-client.ts        (Socket.IO 클라이언트)
  │   ├── socket-event-client.ts  (이벤트 처리)
  │   ├── window-manager.ts       (창 관리)
  │   └── qr-generator.ts         (QR 생성)
  └── types.ts

  src/app/monitor/page.tsx        (모니터 페이지)

T-007 (제작의뢰서 연동)
  src/app/scan/_hooks/
  └── useScanOrderSocket.ts        (스캔→전송 로직)

  src/constants/env.ts            (환경변수)
```

### 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 용도 |
|----------|--------|------|
| `/health` | GET | 헬스체크 |
| `/status` | GET | 상태 모니터링 |
| `/api/socket/token` | GET | 토큰 발급 (구현 필요) |
| (Socket.IO) | - | 실시간 통신 |

### 환경변수 참조

```bash
# 프론트엔드 (클라이언트 노출)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_IO_TOKEN=(동적 발급)
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=...

# 프론트엔드 (서버만)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# 백엔드
SOCKET_JWT_SECRET=your-secret-min-32-chars
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
```

---

**보고서 작성**: 2025-10-22
**검증자**: Claude Code (Next.js Developer)
**문의**: 개선사항 및 구현 시 추가 지원 가능

