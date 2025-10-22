# T-004~T-007 빠른 수정 가이드

**목표**: 배포 가능 상태로 변경 (1-2일 소요)

---

## 1단계: TypeScript 컴파일 에러 해결 (30분)

### 문제
```
server/src/services/sessionPairingService.ts:19:24
Type error: Object is possibly 'undefined'.
```

### 해결책

**옵션 A: nanoid 사용 (권장 - 1분)**

파일: `/Users/innojini/Dev/vooster/server/src/services/sessionPairingService.ts`

```typescript
// 1. 기존 코드 (14-22줄) 제거
// function generateSessionId(): string {
//   const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
//   const bytes = randomBytes(6);
//   ...
// }

// 2. 아래 코드로 대체
import { nanoid } from 'nanoid';

function generateSessionId(): string {
  return nanoid(8).toUpperCase();
}
```

**옵션 B: 타입 좁히기 (3분)**

```typescript
function generateSessionId(): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(5); // 5바이트만 사용
  let result = '';

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      result += alphabet[byte % alphabet.length];
    }
  }

  // 남은 3자리는 무작위로 채우기
  for (let i = result.length; i < 8; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return result;
}
```

### 검증
```bash
npm run typecheck
# 에러가 사라져야 함
```

---

## 2단계: 테스트 토큰 제거 (15분)

### 문제
```
NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token  # 프로덕션에서 'test-token' 실행됨
```

### 해결책 A: 간단한 방법 (env.example 수정만)

파일: `/Users/innojini/Dev/vooster/.env.example`

```diff
- NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token
+ NEXT_PUBLIC_SOCKET_IO_TOKEN=<runtime-generated>
```

파일: `/Users/innojini/Dev/vooster/.env.local` (개발용만 유지)

```
NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token  # 개발 환경에서만 사용
```

### 해결책 B: 런타임 토큰 발급 (권장 - 30분)

**Step 1**: API 라우트 생성

파일: `/Users/innojini/Dev/vooster/src/app/api/socket/token/route.ts` (새로 생성)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // 실제 구현: 사용자 인증 확인
    const userId = 'user-123'; // TODO: 실제 사용자 ID 추출
    const userRole = 'mobile'; // TODO: 실제 역할 확인

    const jwtSecret = process.env.SOCKET_JWT_SECRET || 'dev-secret';

    const token = jwt.sign(
      {
        sub: userId,
        role: userRole,
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
```

**Step 2**: .env 파일 수정

파일: `/Users/innojini/Dev/vooster/.env.example`

```diff
- NEXT_PUBLIC_SOCKET_IO_TOKEN=test-token
+ # NEXT_PUBLIC_SOCKET_IO_TOKEN은 런타임에 /api/socket/token에서 발급
+ # 빌드 타임에 필요없음
```

**Step 3**: 클라이언트에서 사용

파일: `/Users/innojini/Dev/vooster/src/features/monitor/hooks/useSocketToken.ts` (새로 생성)

```typescript
import { useEffect, useState } from 'react';

export function useSocketToken() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/socket/token');
        if (!response.ok) throw new Error('Failed to fetch token');

        const { token } = await response.json();
        setToken(token);
      } catch (err) {
        setError((err as Error).message);
        // 개발 환경에서는 테스트 토큰 사용
        if (process.env.NODE_ENV === 'development') {
          setToken('test-token');
        }
      }
    };

    fetchToken();
  }, []);

  return { token, error };
}
```

파일: `/Users/innojini/Dev/vooster/src/features/monitor/components/MonitorController.tsx` (수정)

```typescript
// 기존 코드
// const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN || 'test-token';

// 새 코드
const { token } = useSocketToken();

if (!token) {
  return <div>토큰 로딩 중...</div>;
}

// 나머지 코드
```

### 검증
```bash
npm run build
# 컴파일 성공하고, NEXT_PUBLIC_SOCKET_IO_TOKEN 경고가 사라져야 함
```

---

## 3단계: 빌드 검증 (10분)

```bash
# 1. 프론트엔드 빌드
npm run build

# 2. 서버 컴파일
npm run server:build

# 3. 타입 체크
npm run typecheck

# 모두 성공하면 ✓
```

---

## 4단계: 환경변수 설정 (Vercel 배포용)

### Vercel 대시보드에서 설정할 환경변수

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxx

# Socket.IO (별도 서버 배포 후)
NEXT_PUBLIC_SOCKET_IO_URL=https://socket-api.yourapp.com
(NEXT_PUBLIC_SOCKET_IO_TOKEN은 런타임 발급이므로 불필요)

# 주문 연동
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=https://intra.yourapp.com/orders/{orderNo}/workorder

# Socket.IO 서버 설정
SOCKET_JWT_SECRET=<32+ 문자의 강력한 키>
NODE_ENV=production
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
LOG_LEVEL=info
```

---

## 5단계: 로컬 테스트

```bash
# 1. 개발 서버 시작
npm run dev

# 2. Socket.IO 서버 시작 (별도 터미널)
npm run server:dev

# 3. 브라우저에서 테스트
# http://localhost:3000/monitor
# - Socket 연결 확인
# - 토큰 API 호출 확인 (/api/socket/token)
```

---

## 6단계: 테스트 실행

```bash
# 단위 테스트
npm run test

# 서버 테스트 (sessionPairingService 에러 해결 후)
npm run test:server

# 모든 테스트
npm run test:all
```

---

## 체크리스트

### Phase 1: 컴파일 에러 해결 (필수)
- [ ] sessionPairingService.ts generateSessionId 함수 수정
- [ ] npm run typecheck 성공

### Phase 2: 토큰 관리 (필수)
- [ ] /api/socket/token 라우트 생성
- [ ] useSocketToken hook 생성
- [ ] MonitorController에서 동적 토큰 사용
- [ ] .env.example 업데이트

### Phase 3: 빌드 검증 (필수)
- [ ] npm run build 성공
- [ ] npm run server:build 성공
- [ ] npm run typecheck 성공

### Phase 4: 배포 준비 (필수)
- [ ] Vercel 환경변수 설정
- [ ] Socket.IO 서버 배포 계획 수립
- [ ] 로컬 테스트 통과

### Phase 5: 테스트 (권장)
- [ ] npm run test 통과
- [ ] npm run test:server 통과
- [ ] 수동 통합 테스트 완료

---

## 예상 소요 시간

| 단계 | 예상 시간 |
|------|---------|
| 1단계: TypeScript 수정 | 5분 |
| 2단계: 토큰 관리 | 15분 (간단) / 30분 (런타임 발급) |
| 3단계: 빌드 검증 | 10분 |
| 4단계: 환경변수 | 10분 |
| 5단계: 로컬 테스트 | 20분 |
| 6단계: 테스트 실행 | 15분 |
| **총합** | **75분 ~ 90분** |

---

## 트러블슈팅

### Q: "nanoid is not defined" 에러
```bash
npm install nanoid
```

### Q: "Cannot find module '@/features/monitor/hooks/useSocketToken'"
→ useSocketToken 파일을 먼저 생성했는지 확인

### Q: Vercel 배포 후 Socket 연결 실패
```
확인사항:
1. NEXT_PUBLIC_SOCKET_IO_URL이 HTTPS로 설정되어 있는가?
2. Socket.IO 서버가 실제로 실행 중인가?
3. CORS_ORIGINS에 Vercel 도메인이 포함되어 있는가?
```

### Q: "SOCKET_JWT_SECRET이 너무 짧다" 에러
```bash
# 32자 이상의 강력한 키 생성
openssl rand -base64 32
```

---

## 질문 있으시면

이 가이드를 따라도 문제가 발생하면:
1. INTEGRATION_REVIEW_T004-T007.md의 "9. 주요 문제 및 해결책" 섹션 참조
2. 에러 메시지의 파일:줄 번호 기록
3. 환경: npm 버전, Node.js 버전, OS 정보 함께 보고

