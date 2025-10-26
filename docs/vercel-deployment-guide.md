# Vooster Vercel 배포 가이드

> **작성일**: 2025-10-27
> **분석 기반**: Next.js Developer, TypeScript Pro, PostgreSQL Pro, React Specialist 전문가 에이전트
> **프로젝트**: Vooster (Next.js 15 + Supabase + Socket.IO)

---

## 📋 목차

1. [개요 및 현황](#1-개요-및-현황)
2. [배포 전 필수 수정 사항 🚨](#2-배포-전-필수-수정-사항-)
3. [TypeScript 설정 최적화](#3-typescript-설정-최적화)
4. [데이터베이스 설정 (Supabase)](#4-데이터베이스-설정-supabase)
5. [Socket.IO 서버 처리](#5-socketio-서버-처리)
6. [프론트엔드 최적화](#6-프론트엔드-최적화)
7. [Next.js 설정 수정](#7-nextjs-설정-수정)
8. [환경 변수 설정](#8-환경-변수-설정)
9. [배포 프로세스](#9-배포-프로세스)
10. [배포 전 체크리스트](#10-배포-전-체크리스트)
11. [문제 해결 가이드](#11-문제-해결-가이드)
12. [배포 후 모니터링](#12-배포-후-모니터링)

---

## 1. 개요 및 현황

### 1.1 프로젝트 기술 스택

```
프론트엔드: Next.js 15.5.5 (App Router) + React 19 + TypeScript 5.x
상태 관리: Zustand 4.x + TanStack Query 5.x
백엔드: Hono API + Socket.IO Server
데이터베이스: Supabase (PostgreSQL 기반)
로컬 DB: better-sqlite3 (동기화 엔진)
UI: Radix UI + Tailwind CSS + Framer Motion
빌드: Next.js (Webpack 최적화)
```

### 1.2 Vercel 배포 준비도 평가

| 항목 | 현재 상태 | 준비도 |
|------|----------|--------|
| **Next.js 설정** | App Router, TypeScript Strict | ✅ 우수 |
| **TypeScript** | 의존성 누락, 임시 파일 에러 | 🔴 수정 필요 |
| **데이터베이스** | Supabase 사용 (서버리스 친화적) | 🟡 최적화 필요 |
| **Socket.IO** | 독립 서버 (Vercel 미지원) | 🔴 별도 배포 필요 |
| **프론트엔드** | SSR 패턴 준수, 보안 이슈 | 🟡 개선 필요 |
| **환경 변수** | 32개 변수, 보안 검증 필요 | 🟡 설정 필요 |

**종합 평가**: 🟡 **70/100** (수정 후 배포 가능)

### 1.3 전문가 에이전트 분석 요약

#### Next.js Developer 분석
- ✅ App Router 구조 우수
- 🔴 Socket.IO 서버 별도 배포 필수
- 🟡 이미지 최적화 보안 강화 (`hostname: '**'`)
- 🟡 환경 변수 32개 설정 필요

#### TypeScript Pro 분석
- 🔴 npm install 미실행 (50개 의존성 누락)
- 🔴 T-014 임시 파일 10개로 빌드 실패
- 🟡 Extension 타입 에러 89개
- ✅ Strict 모드 활성화

#### PostgreSQL Pro 분석
- ✅ Supabase 사용 (서버리스 친화적)
- 🟡 연결 풀링 설정 부재
- 🟡 SQLite 경로 Vercel /tmp 사용 필요
- 🟢 RLS 정책 활성화 권장

#### React Specialist 분석
- ✅ "use client" 지시어 명확히 사용
- 🟡 localStorage SSR 보호 확인 필요
- 🟡 Socket.IO 토큰 보안 개선
- 🟢 React.memo 추가 권장

---

## 2. 배포 전 필수 수정 사항 🚨

### 2.1 즉시 수정 (빌드 실패 원인)

#### 🔴 **우선순위 1: npm 의존성 설치**

**문제**: 50개 UNMET DEPENDENCY로 빌드 즉시 실패
```bash
Module not found: Can't resolve 'socket.io-client'
Module not found: Can't resolve 'qrcode'
```

**해결**:
```bash
# Clean install 권장
rm -rf node_modules package-lock.json
npm install

# 또는
npm install
```

#### 🔴 **우선순위 2: T-014 임시 파일 정리**

**문제**: 루트 디렉토리에 10개 임시 파일로 타입 에러 발생
```
T-014_TypeScript_스키마.ts
T-014_API_설계.md
T-014_구현세부가이드.md
... (총 10개)
```

**해결**:
```bash
# .vooster/tasks/ 디렉토리로 이동
mkdir -p .vooster/tasks
mv T-014_*.ts T-014_*.md .vooster/tasks/ 2>/dev/null || true

# .gitignore에 추가
echo -e "\n# Task temporary files\nT-014_*\n.vooster/tasks/T-*" >> .gitignore
```

#### 🔴 **우선순위 3: tsconfig.json 수정**

**문제**: include에 모든 파일 포함 (`**/*.ts`)로 임시 파일 컴파일 시도

**현재 설정**:
```json
{
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

**수정 후**:
```json
{
  "include": [
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "T-014_*.ts",
    ".vooster/**",
    "server/",
    "extension/"
  ]
}
```

**파일 경로**: `/mnt/d/dev/vooster/tsconfig.json`

---

## 3. TypeScript 설정 최적화

### 3.1 Extension 타입 에러 수정

**문제**: 89개 타입 에러 (대부분 Chrome API 관련)

**해결**: `extension/package.json`에 타입 정의 추가
```json
{
  "devDependencies": {
    "preact": "^10.19.3",
    "@types/chrome": "^0.0.258"
  }
}
```

```bash
cd extension
npm install
cd ..
```

### 3.2 Server 테스트 타입 수정

**문제**: `server/src/__tests__/integration.test.ts`에서 타입 에러

**수정 전**:
```typescript
it('should connect', (done) => {  // ❌ done 타입 미정의
  // ...
});
```

**수정 후**:
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

it('should connect', (done: jest.DoneCallback) => {  // ✅ 타입 명시
  // ...
});
```

**파일 경로**: `/mnt/d/dev/vooster/server/src/__tests__/integration.test.ts`

### 3.3 any 타입 제거 (선택)

**발견**: 21건 (server/src/)

**예시**: `next.config.ts`
```typescript
// 수정 전
webpack: (config, { dev }) => {  // ❌ config가 any

// 수정 후
import type { Configuration } from 'webpack';

webpack: (config: Configuration, { dev }: { dev: boolean }) => {  // ✅
```

---

## 4. 데이터베이스 설정 (Supabase)

### 4.1 연결 풀링 활성화 (중요)

**문제**: Vercel 서버리스 환경에서 동시 요청 시 연결 수 폭발

**해결**: Supabase Pooler URL 사용

**파일**: `/mnt/d/dev/vooster/src/backend/supabase/client.ts`

```typescript
/**
 * Supabase 서비스 클라이언트 생성 (서버 전용)
 * Vercel 배포 시 연결 풀링 URL 사용
 */
export const createServiceClient = ({ url, serviceRoleKey }: ServiceClientConfig) =>
  createClient(
    process.env.SUPABASE_POOLER_URL || url, // ✅ Pooler 우선 사용
    serviceRoleKey,
    {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(8000), // ✅ 8초 타임아웃 (Vercel 10초 제한 전)
          });
        },
      },
    }
  );
```

**환경 변수 추가** (Vercel Dashboard):
```bash
SUPABASE_POOLER_URL=https://[project-ref].pooler.supabase.com
```

### 4.2 서버 클라이언트 싱글톤 패턴 (최적화)

**문제**: 매 요청마다 새 클라이언트 생성 → Cold Start 악화

**파일**: `/mnt/d/dev/vooster/src/lib/supabase/server-client.ts`

**현재 코드**:
```typescript
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(...); // ❌ 매번 새로 생성
};
```

**최적화 후**:
```typescript
let cachedServerClient: SupabaseClient<Database> | null = null;

/**
 * Supabase 서버 클라이언트 가져오기 (싱글톤 패턴)
 * Cold Start 최소화를 위한 클라이언트 재사용
 */
export const getSupabaseServerClient = async () => {
  if (cachedServerClient) return cachedServerClient;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  cachedServerClient = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}, // Next.js 15 읽기 전용
      },
    }
  );

  return cachedServerClient;
};
```

### 4.3 SQLite 경로 수정 (Vercel 환경)

**문제**: Vercel 서버리스는 읽기 전용 파일 시스템

**파일**: `/mnt/d/dev/vooster/server/src/sync/store/mappingStore.ts`

```typescript
/**
 * MappingStore 생성자
 * Vercel 환경에서는 /tmp 디렉토리 사용
 */
constructor(dbPath: string) {
  const isVercel = process.env.VERCEL === '1';

  if (isVercel) {
    // Vercel: /tmp 사용 (휘발성 - 세션마다 초기화됨)
    dbPath = `/tmp/${path.basename(dbPath)}`;
  }

  this.db = new Database(dbPath);

  if (!isVercel) {
    // WAL 모드는 로컬 환경에서만 사용
    this.db.pragma('journal_mode = WAL');
  }

  this.initializeSchema();
}
```

**주의**: `/tmp`는 휘발성이므로 중요 데이터는 Supabase에 저장

### 4.4 RLS (Row Level Security) 활성화 (권장)

**Supabase Dashboard → SQL Editor**:
```sql
-- business_card 테이블 RLS 활성화
ALTER TABLE business_card ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 명함만 조회
CREATE POLICY "Users can view own cards"
  ON business_card FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 명함만 삽입
CREATE POLICY "Users can insert own cards"
  ON business_card FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 명함만 수정
CREATE POLICY "Users can update own cards"
  ON business_card FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 명함만 삭제
CREATE POLICY "Users can delete own cards"
  ON business_card FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 5. Socket.IO 서버 처리

**중요**: Vercel은 WebSocket 서버를 직접 실행할 수 없습니다. 두 가지 옵션을 제공합니다.

### Option 1: Railway/Render 별도 배포 (추천)

#### 5.1.1 Railway 배포

**장점**:
- WebSocket 완전 지원
- 무료 티어 제공 ($5 크레딧/월)
- 간단한 배포 프로세스
- 자동 HTTPS

**배포 단계**:

```bash
# 1. Railway CLI 설치
npm i -g @railway/cli

# 2. Railway 로그인
railway login

# 3. 프로젝트 초기화
railway init

# 4. server 디렉토리 배포
cd server
railway up

# 5. 환경 변수 설정 (Railway Dashboard)
# - NODE_ENV=production
# - SUPABASE_URL=...
# - SUPABASE_SERVICE_ROLE_KEY=...
# - JWT_SECRET=...

# 6. 배포된 URL 확인
railway domain
# 예: https://your-app.railway.app
```

**Vercel 환경 변수 업데이트**:
```bash
# Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SOCKET_IO_URL=https://your-app.railway.app
```

#### 5.1.2 Render 배포

**장점**:
- 무료 티어 (750시간/월)
- GitHub 자동 배포
- 환경 변수 관리 편리

**배포 단계**:

1. **Render Dashboard** → New → Web Service
2. **Repository**: GitHub 연동
3. **Build Command**: `cd server && npm install && npm run build`
4. **Start Command**: `cd server && npm run start`
5. **Environment Variables**: Supabase 등 설정
6. **Deploy**

**Vercel 환경 변수 업데이트**:
```bash
NEXT_PUBLIC_SOCKET_IO_URL=https://your-app.onrender.com
```

### Option 2: Pusher/Ably 마이그레이션 (서버리스)

#### 5.2.1 Pusher 사용

**장점**:
- 서버리스 친화적
- Vercel과 완벽 호환
- 무료 티어 (100 동시 연결)
- 관리 부담 없음

**단점**:
- Socket.IO 코드 전체 마이그레이션 필요
- 비용 발생 가능 (스케일링 시)

**설치**:
```bash
npm install pusher pusher-js
```

**서버 측 코드** (`/mnt/d/dev/vooster/src/app/api/trigger-scan/route.ts`):

```typescript
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: 'ap3', // 아시아 태평양 (한국)
  useTLS: true,
});

export async function POST(req: Request) {
  const { displayId, orderNo } = await req.json();

  // Socket.IO emit 대신 Pusher trigger 사용
  await pusher.trigger(`display-${displayId}`, 'scan-order', {
    orderNo,
    timestamp: Date.now(),
  });

  return Response.json({ success: true });
}
```

**클라이언트 측 코드** (`/mnt/d/dev/vooster/src/app/scan/_hooks/useScanOrderSocket.ts`):

```typescript
import Pusher from 'pusher-js';
import { useEffect } from 'react';

export const useScanOrderSocket = ({ displayId, onOrderReceived, enabled }) => {
  useEffect(() => {
    if (!enabled) return;

    // Socket.IO 대신 Pusher 사용
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: 'ap3',
    });

    const channel = pusher.subscribe(`display-${displayId}`);
    channel.bind('scan-order', (data: { orderNo: string }) => {
      onOrderReceived(data.orderNo);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [displayId, onOrderReceived, enabled]);
};
```

**환경 변수** (Vercel Dashboard):
```bash
PUSHER_APP_ID=your-app-id
NEXT_PUBLIC_PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
```

#### 5.2.2 옵션 비교

| 항목 | Railway/Render | Pusher/Ably |
|------|----------------|-------------|
| **난이도** | 쉬움 (코드 수정 최소) | 중간 (마이그레이션 필요) |
| **비용** | 무료 → $5-20/월 | 무료 → $49/월 |
| **유지보수** | 서버 관리 필요 | 완전 관리형 |
| **확장성** | 수동 스케일링 | 자동 스케일링 |
| **추천** | ✅ 단기 (빠른 배포) | 🟢 장기 (운영 안정성) |

---

## 6. 프론트엔드 최적화

### 6.1 localStorage SSR 보호 (중요)

**문제**: 서버 렌더링 시 `window.localStorage` 접근 에러

**파일**: `/mnt/d/dev/vooster/src/app/scan/_hooks/useScanHistory.ts`

**현재 코드 확인 필요**. 다음 패턴 적용:

```typescript
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'scan_history';

export const useScanHistory = () => {
  const [isClient, setIsClient] = useState(false);
  const [history, setHistory] = useState<ScanHistory[]>([]);

  // 1. 클라이언트 환경 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 2. localStorage 읽기 (클라이언트에서만)
  useEffect(() => {
    if (!isClient) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, [isClient]);

  // 3. localStorage 저장
  const addToHistory = (item: ScanHistory) => {
    if (!isClient) return;

    const updated = [item, ...history].slice(0, 100);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { history, addToHistory };
};
```

### 6.2 Socket.IO 토큰 보안 개선 (중요)

**문제**: `NEXT_PUBLIC_SOCKET_IO_TOKEN` 클라이언트 노출

**현재**: 하드코딩된 토큰
```typescript
// ❌ 보안 위험
const token = process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN;
```

**권장**: 서버 API에서 세션별 임시 토큰 발급

**신규 파일**: `/mnt/d/dev/vooster/src/app/api/socket-token/route.ts`
```typescript
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Socket.IO 연결용 임시 토큰 발급
 * 유효 기간: 1시간
 */
export async function GET() {
  const token = jwt.sign(
    { type: 'socket_connection' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return NextResponse.json({ token });
}
```

**클라이언트 수정**: `/mnt/d/dev/vooster/src/app/scan/_hooks/useScanOrderSocket.ts`
```typescript
useEffect(() => {
  if (!enabled) return;

  // ✅ 서버에서 토큰 가져오기
  fetch('/api/socket-token')
    .then(res => res.json())
    .then(({ token }) => {
      const socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      // ... 나머지 로직
    });
}, [enabled]);
```

### 6.3 이미지 리모트 패턴 화이트리스트 (보안)

**문제**: 모든 도메인 허용 → 악의적 이미지 로드 가능

**파일**: `/mnt/d/dev/vooster/next.config.ts`

**현재 설정**:
```typescript
images: {
  remotePatterns: [
    { hostname: '**' }, // ❌ 보안 위험
  ],
}
```

**수정 후**:
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'hdoogkxysxcyxjcflvjq.supabase.co', // Supabase Storage
    },
    // 추가 CDN이 있다면 여기에 명시
    // {
    //   protocol: 'https',
    //   hostname: 'your-cdn.com',
    // },
  ],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
}
```

### 6.4 React.memo 추가 (성능 최적화)

**자주 리렌더링되는 컴포넌트 메모이제이션**

**예시**: `/mnt/d/dev/vooster/src/app/scan/_components/BarcodeSection.tsx`
```typescript
import React from 'react';

/**
 * 바코드 정보 표시 섹션
 * props가 변경되지 않으면 리렌더링 방지
 */
export const BarcodeSection = React.memo(({ barcode, onClear }) => {
  return (
    <div className="barcode-section">
      <p>{barcode}</p>
      <button onClick={onClear}>Clear</button>
    </div>
  );
});

BarcodeSection.displayName = 'BarcodeSection';
```

### 6.5 Dynamic Import 추가 (번들 크기 최적화)

**파일**: `/mnt/d/dev/vooster/src/app/scan/page.tsx`

```typescript
import dynamic from 'next/dynamic';

// ✅ 이미 구현됨
const ReportView = dynamic(
  () => import('./_components/ReportView').then(m => ({ default: m.ReportView })),
  {
    loading: () => <div>제작의뢰서 로딩 중...</div>,
    ssr: false,
  }
);

// ✅ 추가 권장
const SettingsDrawer = dynamic(
  () => import('./_components/SettingsDrawer'),
  { ssr: false }
);

const HistoryDrawer = dynamic(
  () => import('./_components/HistoryDrawer'),
  { ssr: false }
);
```

---

## 7. Next.js 설정 수정

### 7.1 next.config.ts 보안 강화

**파일**: `/mnt/d/dev/vooster/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⚠️ 개발 시에만 권장
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hdoogkxysxcyxjcflvjq.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  outputFileTracingIncludes: {
    '/api/**/*': ['./docs/**/*', './vooster-docs/**/*'],
    '/app/**/*': ['./docs/**/*', './vooster-docs/**/*'],
  },

  // ✅ 추가 권장 설정
  compress: true, // Gzip 압축
  poweredByHeader: false, // X-Powered-By 헤더 제거 (보안)

  experimental: {
    optimizeCss: true, // CSS 최적화
    scrollRestoration: true,
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'refractor$': 'refractor/lib/core.js',
      };
    }
    return config;
  },

  serverExternalPackages: ['refractor'],
} satisfies NextConfig;

export default nextConfig;
```

### 7.2 vercel.json 생성 (권장)

**파일**: `/mnt/d/dev/vooster/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 7.3 .vercelignore 생성 (빌드 속도 향상)

**파일**: `/mnt/d/dev/vooster/.vercelignore`

```
# Vercel에 업로드하지 않을 파일
T-014_*
.vooster/
extension/
server/src/__tests__/
e2e/
*.test.ts
*.test.tsx
coverage/
playwright-report/
.env.local
```

---

## 8. 환경 변수 설정

### 8.1 환경 변수 목록

**Vercel Dashboard → Settings → Environment Variables**

#### 필수 환경 변수 (Production)

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://hdoogkxysxcyxjcflvjq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://hdoogkxysxcyxjcflvjq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_POOLER_URL=https://hdoogkxysxcyxjcflvjq.pooler.supabase.com

# Socket.IO (Railway/Render 배포 후)
NEXT_PUBLIC_SOCKET_IO_URL=https://your-app.railway.app

# JWT (서버 전용)
JWT_SECRET=your-strong-secret-key-here

# 앱 설정
NEXT_PUBLIC_APP_BASE_URL=https://vooster.vercel.app
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=https://vooster.vercel.app/orders/{orderNo}/workorder
```

#### Preview 환경 변수 (선택)

**Preview 배포**에는 개발용 Supabase 프로젝트 사용 권장:
- `NEXT_PUBLIC_SUPABASE_URL`: 개발용 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: 개발용 키

### 8.2 환경 변수 설정 방법

#### 방법 1: Vercel Dashboard
1. **Vercel Dashboard** → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. **Add New** 클릭
4. Key, Value 입력
5. **Environment**: Production, Preview, Development 선택
6. **Save**

#### 방법 2: Vercel CLI
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 값 입력 프롬프트
```

#### 방법 3: .env 파일 bulk 업로드
```bash
vercel env pull .env.vercel.local
# 로컬 .env.local 값을 .env.vercel.local로 복사 후
vercel env add < .env.vercel.local
```

### 8.3 환경 변수 검증

**로컬 테스트**:
```bash
# .env.production 파일 생성
cp .env.local .env.production

# 프로덕션 빌드 테스트
npm run build
npm run start
```

---

## 9. 배포 프로세스

### 9.1 배포 전 로컬 테스트

```bash
# 1. 의존성 설치
npm install

# 2. T-014 파일 정리
mkdir -p .vooster/tasks
mv T-014_* .vooster/tasks/ 2>/dev/null || true

# 3. 타입 체크
npm run typecheck
# 또는 추가
npm run typecheck:all

# 4. 프로덕션 빌드
npm run build

# 5. 프로덕션 모드 실행
npm run start

# 6. 브라우저 확인 (http://localhost:3000)
# - SSR 에러 없는지
# - 하이드레이션 경고 없는지
# - 모든 기능 정상 동작
```

### 9.2 Vercel CLI 배포

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. Vercel 로그인
vercel login

# 3. 프로젝트 연결
vercel link

# 4. 환경 변수 설정 (Vercel Dashboard 또는 CLI)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... (총 32개 환경 변수)

# 5. Preview 배포 (테스트)
vercel

# 6. Production 배포
vercel --prod
```

### 9.3 GitHub 자동 배포 (권장)

**Vercel Dashboard → Git Integration**:
1. **GitHub 연동**
2. **Repository 선택**: `vooster`
3. **Branch**: `master` (또는 `main`)
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. **Install Command**: `npm install`

**자동 배포 플로우**:
```
git push origin master
  ↓
Vercel 자동 감지
  ↓
Preview 배포 생성 (PR일 경우)
  ↓
Production 배포 (master 브랜치)
```

### 9.4 배포 확인

```bash
# 1. 배포 URL 확인
vercel inspect [deployment-url]

# 2. 로그 확인
vercel logs --follow

# 3. 함수 크기 확인
vercel inspect [deployment-url] --token [token]

# 4. 빌드 분석
ANALYZE=true npm run build
```

---

## 10. 배포 전 체크리스트

### 🔴 필수 항목 (빌드 성공 조건)

- [ ] `npm install` 실행 완료
- [ ] T-014 임시 파일 10개 제거 또는 `.vooster/tasks/`로 이동
- [ ] `tsconfig.json` include/exclude 수정
- [ ] Extension 타입 정의 설치 (`@types/chrome`, `preact`)
- [ ] Socket.IO 서버 별도 배포 (Railway/Render) 또는 Pusher 마이그레이션
- [ ] `NEXT_PUBLIC_SOCKET_IO_URL` 환경 변수 설정
- [ ] Supabase 환경 변수 32개 설정
- [ ] 로컬 프로덕션 빌드 성공 (`npm run build`)

### 🟡 권장 항목 (성능/보안 향상)

- [ ] Supabase Pooler URL 사용 (`SUPABASE_POOLER_URL`)
- [ ] 서버 클라이언트 싱글톤 패턴 적용
- [ ] SQLite 경로 Vercel `/tmp` 사용
- [ ] localStorage SSR 보호 확인
- [ ] Socket.IO 토큰 서버 API로 변경
- [ ] 이미지 리모트 패턴 화이트리스트
- [ ] `vercel.json` 생성
- [ ] `.vercelignore` 생성
- [ ] RLS 정책 활성화

### 🟢 선택 항목 (장기 개선)

- [ ] React.memo 추가 (성능 최적화)
- [ ] Dynamic Import 확대
- [ ] any 타입 제거
- [ ] 번들 크기 분석 (`@next/bundle-analyzer`)
- [ ] Lighthouse CI 통합
- [ ] Sentry 에러 추적
- [ ] Vercel Analytics 활성화

---

## 11. 문제 해결 가이드

### 11.1 빌드 실패

#### 문제: Module not found
```
Error: Module not found: Can't resolve 'socket.io-client'
```

**해결**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 문제: TypeScript 컴파일 에러
```
Error: Type error: Cannot find name 'chrome'
```

**해결**:
```bash
cd extension
npm install @types/chrome preact
cd ..
```

#### 문제: T-014 파일 타입 에러
```
Error: T-014_TypeScript_스키마.ts(522,15): error TS2322
```

**해결**:
```bash
mkdir -p .vooster/tasks
mv T-014_*.ts T-014_*.md .vooster/tasks/
```

### 11.2 런타임 에러

#### 문제: localStorage is not defined
```
ReferenceError: localStorage is not defined
```

**해결**: SSR 보호 추가 (6.1 섹션 참고)

#### 문제: Supabase connection error
```
Error: Invalid Supabase URL
```

**해결**: Vercel Dashboard 환경 변수 확인
```bash
vercel env ls
```

#### 문제: Socket.IO connection failed
```
Error: WebSocket connection failed
```

**해결**:
1. Railway/Render 서버 상태 확인
2. `NEXT_PUBLIC_SOCKET_IO_URL` 환경 변수 확인
3. CORS 설정 확인 (Socket.IO 서버)

### 11.3 성능 문제

#### 문제: 첫 로드 느림 (LCP > 2.5초)
**해결**:
- Dynamic Import 추가
- 이미지 최적화 (WebP, AVIF)
- Font 최적화

#### 문제: 번들 크기 큼 (> 200KB)
**해결**:
```bash
npm run analyze
# 큰 라이브러리 확인 후 지연 로딩
```

#### 문제: 메모리 누수
**해결**:
- useEffect cleanup 함수 확인
- 타이머 정리 (`clearTimeout`, `clearInterval`)
- Socket.IO 연결 정리

### 11.4 디버깅 명령어

```bash
# Vercel 로그 실시간 확인
vercel logs --follow

# 특정 함수 로그
vercel logs [deployment-url] --output api/[[...hono]]

# 빌드 디버그 모드
vercel build --debug

# 로컬 환경 변수 확인
vercel env pull .env.vercel.local
cat .env.vercel.local
```

---

## 12. 배포 후 모니터링

### 12.1 Vercel Analytics

**활성화 방법**:
1. Vercel Dashboard → Analytics → Enable
2. `src/app/layout.tsx`에 자동 추가됨

**모니터링 지표**:
- **Core Web Vitals**: LCP, FID, CLS
- **Real Experience Score**: 실제 사용자 경험
- **Top Pages**: 페이지별 성능
- **Devices**: 기기별 성능

**목표값**:
- LCP (Largest Contentful Paint): < 2.5초
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### 12.2 Supabase Dashboard

**모니터링 항목**:
1. **Query Performance**: 느린 쿼리 추적
2. **Database Usage**: 스토리지 사용량
3. **API Requests**: 요청 수 및 에러율
4. **Auth**: 인증 현황

**Alert 설정**:
- 평균 응답 시간 > 3초
- 에러율 > 5%
- DB 용량 > 80%

### 12.3 로그 확인 방법

```bash
# 실시간 로그
vercel logs --follow

# 특정 시간 범위
vercel logs --since 1h --until 30m

# 특정 함수만
vercel logs --output api/[[...hono]]

# JSON 형식
vercel logs --format json
```

### 12.4 성능 메트릭

**Lighthouse 점수 목표**:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

**First Load JS 목표**:
- < 150KB (권장)
- 현재 프로젝트: ~422MB (`.next`) → 최적화 필요

**번들 분석**:
```bash
npm install -D @next/bundle-analyzer

# next.config.ts 수정
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);

# 실행
ANALYZE=true npm run build
```

### 12.5 에러 추적 (선택)

**Sentry 통합**:
```bash
npm install @sentry/nextjs

npx @sentry/wizard@latest -i nextjs
```

**환경 변수**:
```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 부록 A: 빠른 시작 가이드

```bash
# 1. 의존성 설치
npm install

# 2. 임시 파일 정리
mkdir -p .vooster/tasks && mv T-014_* .vooster/tasks/ 2>/dev/null || true

# 3. tsconfig.json 수정 (include에 src/**만 포함)

# 4. Socket.IO 서버 배포 (Railway)
npm i -g @railway/cli
railway login
cd server && railway up

# 5. Vercel 배포
npm i -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SOCKET_IO_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... (환경 변수 추가)

# 6. 배포
vercel --prod
```

---

## 부록 B: 참고 문서

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Railway Documentation](https://docs.railway.app/)
- [Pusher Documentation](https://pusher.com/docs/)

---

## 업데이트 이력

- **2025-10-27**: 초안 작성 (4명의 전문가 에이전트 분석 기반)

---

**작성자**: Claude Code (Next.js Developer, TypeScript Pro, PostgreSQL Pro, React Specialist)
**문의**: 추가 질문이나 문제가 발생하면 이 문서를 참고하여 해결해주세요.
