# 원격 컴퓨터 제어 시스템 - 통합 개발 가이드

**프로젝트명**: Vooster Remote Control System
**버전**: 1.0.0
**작성일**: 2025-10-23
**상태**: 설계 및 구현 가이드 완성

---

## 개요

Vooster 원격 컴퓨터 제어 시스템은 **스마트폰 웹 애플리케이션**에서 원격으로 Windows, macOS, Linux 컴퓨터를 제어하는 Next.js 기반 풀스택 솔루션입니다.

### 핵심 특징

| 특징 | 설명 |
|------|------|
| **웹 기반** | 모든 기기에서 브라우저로 접근 가능 |
| **실시간** | WebSocket 기반 양방향 통신 |
| **원격 실행** | 명령 큐 시스템으로 안정적인 실행 |
| **시스템 모니터링** | CPU, 메모리, 네트워크 실시간 모니터링 |
| **보안 우선** | JWT 인증, SSL/TLS, RLS 정책 |
| **확장 가능** | 플러그인 아키텍처로 기능 확장 용이 |

---

## 프로젝트 구조

### 핵심 문서

| 문서 | 내용 | 대상 |
|------|------|------|
| **remote-control-fullstack.md** | 아키텍처, 기술 스택, 설계 전략 | 아키텍트, 개발리더 |
| **implementation-guide.md** | 구체적 구현 예제, 코드 패턴 | 개발자 |
| **deployment-guide.md** | 배포, 모니터링, 운영 절차 | DevOps, 운영팀 |
| **REMOTE-CONTROL-README.md** | 이 문서 (통합 개요) | 전체 팀 |

### 디렉토리 구조

```
vooster/
├── src/
│   ├── app/                    # Next.js 앱 라우터
│   ├── backend/                # 서버 로직 (Hono.js)
│   ├── features/               # 기능별 모듈
│   │   ├── auth/               # 인증
│   │   ├── computers/          # 컴퓨터 관리
│   │   ├── remote-control/     # 원격 제어
│   │   └── system-info/        # 시스템 정보
│   ├── components/             # 공유 컴포넌트
│   ├── lib/                    # 유틸리티 및 클라이언트
│   └── types/                  # TypeScript 타입 정의
│
├── agents/
│   └── node-agent/             # Node.js 클라이언트 Agent
│       ├── src/
│       │   ├── index.ts        # 메인 진입점
│       │   ├── socket-client.ts
│       │   ├── command-executor.ts
│       │   └── system-monitor.ts
│       └── package.json
│
├── supabase/
│   └── migrations/             # 데이터베이스 스키마
│
├── servers/
│   └── websocket/              # WebSocket 서버 (별도 Node.js)
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── vooster-docs/               # 문서
│   ├── remote-control-fullstack.md
│   ├── implementation-guide.md
│   ├── deployment-guide.md
│   └── REMOTE-CONTROL-README.md
│
└── package.json
```

---

## 빠른 시작

### 1단계: 환경 설정 (5분)

```bash
# 저장소 클론
git clone <repository>
cd vooster

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# Supabase 초기화
npx supabase start
```

### 2단계: 데이터베이스 설정 (10분)

```bash
# Supabase 프로젝트 생성
supabase link --project-ref <project-ref>

# 마이그레이션 실행
supabase migration up

# 테스트 데이터 추가
npm run db:seed
```

### 3단계: 개발 서버 시작 (3분)

```bash
# 터미널 1: Next.js 앱
npm run dev

# 터미널 2: WebSocket 서버
cd servers/websocket && npm run dev

# 터미널 3: Agent 시뮬레이션
cd agents/node-agent && npm run dev

# 브라우저에서 http://localhost:3000 접속
```

---

## 기술 스택

### 프론트엔드

```json
{
  "framework": "Next.js 15",
  "language": "TypeScript 5",
  "styling": "TailwindCSS 4",
  "components": "shadcn/ui",
  "stateManagement": ["Zustand", "@tanstack/react-query"],
  "realtime": "socket.io-client",
  "forms": "react-hook-form + Zod",
  "icons": "lucide-react"
}
```

### 백엔드

```json
{
  "runtime": "Node.js 20+",
  "framework": "Next.js (App Router)",
  "api": "Hono.js",
  "database": "Supabase (PostgreSQL)",
  "auth": "@supabase/ssr",
  "realtime": "socket.io",
  "cache": "Redis (선택)"
}
```

### 클라이언트 Agent

```json
{
  "runtime": "Node.js 20+",
  "realtime": "socket.io-client",
  "systemControl": "robotjs",
  "monitoring": "systeminformation",
  "logging": "winston"
}
```

---

## 주요 기능

### MVP (Phase 1)

#### 1. 인증 (F-01)
- 이메일/비밀번호 로그인
- 회원가입
- 토큰 기반 세션 관리
- 자동 로그인

#### 2. 컴퓨터 관리 (F-02)
- 컴퓨터 등록 및 목록 조회
- 상태 모니터링 (온라인/오프라인)
- 시스템 정보 표시

#### 3. 원격 제어 (F-03)
- 마우스 제어 (이동, 클릭)
- 키보드 입력
- 시스템 명령 (종료, 재부팅)
- 명령 이력 관리

#### 4. 시스템 모니터링 (F-04)
- CPU, 메모리 사용률
- 네트워크 상태
- 디스크 사용량
- 실시간 그래프

### Phase 2 (확장 기능)

- 화면 공유 (WebRTC)
- 파일 전송
- 명령 매크로 자동화
- 다중 사용자 권한 관리
- 감사 로그

### Phase 3 (현장 인쇄 & 창고)

- 프린터 제어
- 인쇄 작업 모니터링
- 재고 시스템 연동
- 바코드 스캔 자동화

---

## 핵심 흐름

### 1. 로그인 흐름

```
사용자 입력 (이메일, 비밀번호)
         ↓
   로그인 API (POST /api/auth/login)
         ↓
  Supabase Auth 인증
         ↓
   JWT 토큰 발급
         ↓
  쿠키 저장 + React Query 업데이트
         ↓
   대시보드로 리다이렉트
```

### 2. 명령 실행 흐름

```
웹앱: "마우스 이동" 버튼 클릭
         ↓
 React Query: POST /api/commands
         ↓
API 서버: 명령을 DB에 저장
         ↓
WebSocket: Agent에 "newCommand" 이벤트 전송
         ↓
Agent: robotjs로 마우스 이동 실행
         ↓
Agent: WebSocket으로 "commandExecuted" 보고
         ↓
API 서버: 명령 상태 업데이트 (DB)
         ↓
웹앱: WebSocket 수신 → UI 업데이트 (완료)
```

### 3. 실시간 상태 업데이트 흐름

```
Agent: 5초마다 시스템 정보 수집
         ↓
  WebSocket: "systemInfoUpdate" 이벤트 전송
         ↓
API 서버: Redis 캐시 업데이트
         ↓
  웹앱: socket.io 구독 → 상태 변경 감지
         ↓
   UI: 리얼타임 그래프 업데이트
```

---

## 개발 가이드

### 새로운 기능 추가 (5단계)

#### 1단계: 타입 정의

```typescript
// src/types/newfeature.ts
export interface NewFeature {
  id: string;
  computerId: string;
  data: Record<string, any>;
}
```

#### 2단계: 백엔드 API

```typescript
// src/features/newfeature/backend/route.ts
export const registerNewFeatureRoutes = (app: Hono<AppEnv>) => {
  app.post('/api/newfeature', async (c) => {
    // 구현
  });
};
```

#### 3단계: 데이터베이스 마이그레이션

```sql
-- supabase/migrations/xxx_create_newfeature_table.sql
CREATE TABLE newfeature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4단계: React Query Hook

```typescript
// src/features/newfeature/hooks/useNewFeature.ts
export function useNewFeatureQuery() {
  return useQuery({
    queryKey: ['newfeature'],
    queryFn: async () => {
      const response = await apiClient.get('/api/newfeature');
      return response.data;
    },
  });
}
```

#### 5단계: UI 컴포넌트

```typescript
// src/features/newfeature/components/NewFeature.tsx
'use client';

export function NewFeature() {
  const query = useNewFeatureQuery();
  // 구현
}
```

### 코드 스타일 가이드

- **TypeScript**: Strict mode, 모든 타입 명시
- **컴포넌트**: `use client` 지시어 필수
- **스타일**: TailwindCSS + `cn()` 유틸리티
- **에러 처리**: Result 타입 패턴 사용
- **네이밍**: camelCase (함수/변수), PascalCase (컴포넌트)

상세 가이드는 `vooster-docs/guideline.md` 참조.

---

## 배포 프로세스

### 개발 환경 (로컬)

```bash
npm run dev  # 자동 재로드
```

### 스테이징 환경

```bash
# staging 브랜치에서
git checkout staging
git push origin staging

# Vercel이 자동 배포 (staging-project.vercel.app)
```

### 프로덕션 환경

```bash
# main 브랜치에서
./scripts/pre-deployment-check.sh  # 사전 검사
./scripts/deploy-production.sh      # 배포 실행
./scripts/post-deployment-verify.sh # 사후 검증
```

상세 배포 절차는 `vooster-docs/deployment-guide.md` 참조.

---

## 모니터링 및 운영

### 주요 메트릭

| 메트릭 | 목표 | 도구 |
|--------|------|------|
| **응답 시간** | < 200ms | Vercel Analytics |
| **오류율** | < 0.1% | Sentry |
| **가용성** | 99.9% | Uptime Robot |
| **WebSocket 연결** | 1000+ 동시 | Grafana |

### 로그 및 알림

- **로깅**: Winston + ELK Stack
- **메트릭**: Prometheus + Grafana
- **알림**: Slack, PagerDuty
- **추적**: Sentry (에러), DataDog (APM)

상세 운영 절차는 `vooster-docs/deployment-guide.md` 참조.

---

## 보안 체크리스트

### 개발 단계

- [ ] 환경 변수 `.env` 파일 생성
- [ ] Supabase RLS 정책 설정
- [ ] HTTPS 로컬 테스트
- [ ] JWT 토큰 검증 구현

### 배포 전

- [ ] TypeScript strict mode 확인
- [ ] 의존성 보안 감사 (`npm audit`)
- [ ] OWASP Top 10 검토
- [ ] SSL 인증서 준비

### 프로덕션

- [ ] HTTPS/TLS 1.2+ 적용
- [ ] CORS 정책 설정
- [ ] Rate limiting 구성
- [ ] 정기 백업 스케줄링

---

## 문제 해결

### 자주 묻는 질문

**Q: WebSocket 연결이 실패합니다.**
A: 방화벽에서 포트 3001 허용 확인. Agent 로그 확인 (`npm run logs:agent`)

**Q: Agent가 명령을 실행하지 않습니다.**
A: 토큰 만료 확인. Agent 설정 파일 검증 (`AUTH_TOKEN` 등)

**Q: 데이터베이스 연결 오류**
A: `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 확인. 마이그레이션 재실행.

더 많은 문제 해결은 `vooster-docs/deployment-guide.md` → "문제 해결" 섹션 참조.

---

## 성능 최적화

### 프론트엔드

- Next.js 이미지 최적화 (`<Image />`)
- 코드 스플리팅 (동적 임포트)
- React Query 캐싱
- Service Worker (PWA)

### 백엔드

- 데이터베이스 인덱싱
- Redis 캐싱
- API 응답 압축
- 커넥션 풀링

### 인프라

- CDN (CloudFlare)
- Edge caching
- 다중 리전 배포 (확장 시)

---

## 팀 온보딩

### 신규 개발자 체크리스트

- [ ] 저장소 클론 및 의존성 설치
- [ ] 로컬 개발 환경 구성 완료
- [ ] Supabase 프로젝트 액세스 권한 획득
- [ ] 핵심 문서 읽기 (20분)
- [ ] 간단한 버그 픽스로 PR 제출

### 추천 학습 순서

1. **architecture.md**: 전체 구조 이해 (30분)
2. **guideline.md**: 코드 스타일 학습 (20분)
3. **implementation-guide.md**: 예제 코드 분석 (1시간)
4. **remote-control-fullstack.md**: 심화 주제 (2시간)

---

## 기여 가이드

### PR 프로세스

1. **이슈 생성**: 기능 또는 버그 설명
2. **브랜치 생성**: `feature/xxx` 또는 `fix/xxx`
3. **코드 작성**: Guideline 준수
4. **테스트 작성**: 최소 80% 커버리지
5. **PR 제출**: 상세 설명 및 스크린샷 포함
6. **리뷰 및 병합**: 최소 2명 승인 후 병합

### 커밋 메시지 규칙

```
<type>(<scope>): <subject>

<body>

<footer>
```

예제:
```
feat(remote-control): Add keyboard shortcut support

- Added support for Ctrl+Alt+Delete
- Added keyboard macro recording
- Added keyboard layout detection

Closes #123
```

---

## 라이선스 및 지원

- **라이선스**: MIT
- **지원**: GitHub Issues
- **보안 이슈**: security@vooster.app로 보고

---

## 유용한 링크

### 공식 문서
- [Next.js 공식 문서](https://nextjs.org)
- [Supabase 공식 문서](https://supabase.com/docs)
- [socket.io 문서](https://socket.io/docs/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)

### 내부 문서
- [기술 스택 상세](./remote-control-fullstack.md)
- [구현 예제](./implementation-guide.md)
- [배포 절차](./deployment-guide.md)
- [코드 가이드라인](./guideline.md)

---

## 다음 단계

### 우선순위 작업

1. **즉시** (Week 1)
   - [ ] Next.js 프로젝트 초기화
   - [ ] Supabase 스키마 생성
   - [ ] 기본 인증 시스템 구현

2. **1주일 내** (Week 2-3)
   - [ ] WebSocket 서버 구축
   - [ ] 컴퓨터 관리 API 완성
   - [ ] 클라이언트 Agent 기본 구현

3. **2주일 내** (Week 4)
   - [ ] 원격 제어 기능 완성
   - [ ] 실시간 상태 표시
   - [ ] E2E 테스트 작성

4. **3주일 내** (Week 5-6)
   - [ ] 프로덕션 배포
   - [ ] 모니터링 설정
   - [ ] 성능 최적화

---

**최종 확인**
- [ ] 모든 문서 읽음
- [ ] 개발 환경 구성 완료
- [ ] 첫 커밋 준비 완료
- [ ] 팀과 시간 예약 (온보딩)

---

**문서 작성**: 2025-10-23
**최종 검토**: 대기 중
**상태**: 설계 완료, 구현 준비 중

