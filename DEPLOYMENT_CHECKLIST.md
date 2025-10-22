# 21ZV T-004, T-005 배포 체크리스트

**기한**: T-004, T-005 프로덕션 배포 전 필수 확인 사항
**작성일**: 2025-10-22
**상태**: 배포 준비 중

---

## Phase 1: 즉시 수정 필요 (배포 블로킹)

### 1.1 TypeScript 컴파일 에러 해결 (BLOCKER)
- [ ] **에러 #1**: `server/src/services/sessionPairingService.ts:19` - "Object is possibly 'undefined'"
  - **위치**: `generateSessionId()` 함수
  - **원인**: randomBytes 반환값의 타입 안정성
  - **해결**: 파일 교체 `server/src/services/sessionPairingService-improved.ts` 사용
  - **명령**: `npm run typecheck` (0 에러 확인)

- [ ] **에러 #2**: `server/src/services/__tests__/sessionPairingService.test.ts:229` - "Object is possibly 'undefined'"
  - **위치**: `getPairedSessions()` 테스트
  - **원인**: 배열 접근 타입 검증 부족
  - **해결**: Non-null assertion 추가
  ```typescript
  // 수정 전
  expect(paired[0].sessionId).toBe(session1.sessionId);

  // 수정 후
  expect(paired.length).toBe(1);
  expect(paired[0]?.sessionId).toBe(session1.sessionId);
  ```

### 1.2 메모리 누수 방지 (CRITICAL)
- [ ] **페어링된 세션 자동 정리 구현**
  - **파일**: `server/src/services/sessionPairingService.ts`
  - **현재**: 페어링된 세션이 영구 보관됨
  - **해결**: `sessionPairingService-improved.ts` 적용
  - **내용**:
    - 30분마다 정기 정리 (cleanupInterval)
    - 페어링 후 5분 경과하고 양쪽 연결 해제 시 자동 삭제
    - 메모리 통계 로깅
  - **검증**:
    ```bash
    npm run test:server -- sessionPairingService
    ```

### 1.3 환경변수 설정 확인 (CRITICAL)
- [ ] `SOCKET_JWT_SECRET` 설정 확인
  - **프로덕션 값**: 32자 이상 랜덤 문자열
  - **기본값**: `dev-secret-key-change-in-production` (절대 사용 금지)
  - **생성 방법**:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

- [ ] `CORS_ORIGINS` 확인
  - **프로덕션 형식**: `https://example.com,https://app.example.com`
  - **localhost 제거**: 프로덕션에서는 실제 도메인만 등록
  - **검증 로직**: `validateCorsOriginsForProduction()` 호출 추가

- [ ] `NODE_ENV=production` 설정
  - **확인**: `echo $NODE_ENV`
  - **Vercel**: 환경변수 설정에서 확인

- [ ] `PORT` 설정 (기본: 3000)
  - **Vercel**: 자동 설정 (PORT 환경변수 사용)

---

## Phase 2: 배포 전 1주일 내 필수 (HIGH 우선순위)

### 2.1 입력값 검증 강화
- [ ] Zod 스키마 기반 검증 추가
  - **파일**: `server/src/events/handlers.ts`
  - **적용 대상**:
    - `registerClient` → `RegisterClientSchema`
    - `joinSession` → `JoinSessionSchema`
    - `scanOrder` → `ScanOrderSchema`
    - `session:join` → `SessionJoinSchema`
  - **참고 코드**: `server/src/utils/improvements.ts`
  - **검증**: 모든 테스트 통과

- [ ] CORS 프로덕션 검증 추가
  - **위치**: `server/src/utils/config.ts` - `validateConfig()` 함수
  - **추가 로직**: `validateCorsOriginsForProduction()` 호출
  - **테스트**:
    ```bash
    NODE_ENV=production npm run server:build
    ```

### 2.2 테스트 커버리지 확대
- [ ] 통합 테스트 1회 실행
  ```bash
  npm run test:server -- integration.test.ts
  ```

- [ ] 부하 테스트 추가 (선택)
  - **목표**: 1000개 동시 연결 처리 가능 확인
  - **메모리**: < 100MB 증가
  - **참고 코드**: TECHNICAL_REVIEW_T004_T005.md 섹션 6.1

### 2.3 레이트 리미트 구현 (HIGH)
- [ ] 이벤트별 레이트 리미트 추가
  - **파일**: `server/src/middleware/rateLimitSocket.ts` (신규 생성)
  - **적용 대상**: `scanOrder`, `session:create`, `session:join`
  - **설정**:
    - scanOrder: 10 requests/min
    - session:* : 5 requests/min
  - **참고 코드**: `server/src/utils/improvements.ts` - `SocketRateLimiter` 클래스

### 2.4 Redis 어댑터 활성화 (선택이지만 권장)
- [ ] 수평 확장 대비 Redis 설정
  - **파일**: `server/src/adapters/redis.ts` (신규 생성)
  - **설정**: `REDIS_URL` 환경변수
  - **참고 코드**: TECHNICAL_REVIEW_T004_T005.md 섹션 5.3
  - **검증**:
    ```bash
    redis-cli PING
    ```

### 2.5 구조화된 로깅 추가 (MEDIUM)
- [ ] traceId 기반 요청 추적
  - **목표**: 문제 발생 시 요청 경로 추적 가능
  - **구현**: `StructuredLogger` 클래스 사용
  - **위치**: 모든 핸들러에 적용
  - **로그 형식**: `{ traceId, socketId, event, data }`

---

## Phase 3: 배포 후 관리 (1-2주)

### 3.1 모니터링 설정
- [ ] 서버 헬스 체크 엔드포인트 활성화
  - **엔드포인트**: `/health`, `/status`
  - **확인**:
    ```bash
    curl https://your-server/health
    ```
  - **메트릭**:
    - 메모리 사용량
    - 활성 세션 수
    - 응답 시간

- [ ] 로그 수집 설정
  - **도구**: CloudWatch, DataDog, 또는 자체 로그 시스템
  - **로그 레벨**: production에서는 'info' 이상만
  - **알림**: 에러 발생 시 즉시 알림

### 3.2 성능 모니터링
- [ ] 메모리 누수 감시
  - **주기**: 매일 오전 메모리 사용량 확인
  - **임계값**: 500MB 초과 시 재시작
  - **자동화**: 메모리 모니터링 스크립트 작성

- [ ] 세션 정리 로그 확인
  - **주기**: 매주 한 번 세션 정리 통계 검토
  - **목표**: 만료된 세션 > 활성 세션

---

## 배포 실행 체크리스트

### 로컬 최종 검증
```bash
# 1. 타입 체크
npm run typecheck

# 2. 서버 빌드
npm run server:build

# 3. 모든 테스트
npm run test:server

# 4. 서버 시작
npm run server:dev
```

### Vercel 배포
```bash
# 1. 환경변수 설정 확인
# Vercel Dashboard → Project Settings → Environment Variables
# - SOCKET_JWT_SECRET
# - CORS_ORIGINS
# - NODE_ENV=production

# 2. 배포
git push origin main

# 3. 배포 완료 확인
# Vercel Dashboard → Deployments
```

### 배포 후 검증
```bash
# 1. 헬스 체크
curl https://your-vercel-domain/health

# 2. 타입 스크립트 에러 확인
# (자동 빌드 과정에서 확인)

# 3. 로그 확인
# Vercel → Function Logs

# 4. 성능 테스트 (선택)
# - Socket.IO 연결 테스트
# - 첫 세션 생성 시간 측정
```

---

## 위험 요소 & 롤백 계획

### 알려진 위험
1. **메모리 누수** (현재 상태)
   - 확인 방법: `/status` 엔드포인트의 memory.heapUsed 증가 추이
   - 롤백 기준: 1시간에 50MB 이상 증가
   - 롤백 방법: 이전 버전으로 Vercel 재배포

2. **높은 에러율**
   - 확인 방법: 에러 로그 모니터링
   - 롤백 기준: 에러율 > 1% (100 요청 중 1개 이상)

3. **느린 응답시간**
   - 확인 방법: `/status` 엔드포인트 응답 시간
   - 롤백 기준: 평균 응답시간 > 1초

### 롤백 절차
```bash
# 1. Vercel 대시보드에서 이전 배포 버전 선택
# 2. "Promote to Production" 클릭
# 3. 헬스 체크 재실행
```

---

## 커뮤니케이션 체크리스트

### 팀 공지
- [ ] 개발팀: 배포 일정 공지
- [ ] QA팀: 테스트 케이스 및 배포 후 검증 항목 전달
- [ ] 운영팀: 모니터링 설정 및 알림 규칙 설명

### 사용자 영향 최소화
- [ ] 배포 시간: 업무 시간 외 (오전 2-4시)
- [ ] 예상 다운타임: 0분 (zero-downtime deployment)
- [ ] 롤백 준비시간: 5분 이내

---

## 성공 기준

배포가 성공으로 간주되는 조건:

1. **기능**
   - [ ] 모든 T-004, T-005 요구사항 작동 확인
   - [ ] 세션 생성 시간 < 100ms
   - [ ] 페어링 완료 시간 < 500ms

2. **안정성**
   - [ ] 에러율 < 0.1% (1000시간 관찰)
   - [ ] 메모리 사용량 안정적 (증가 < 10MB/시간)
   - [ ] 응답시간 P95 < 500ms

3. **보안**
   - [ ] TypeScript 타입 에러 0개
   - [ ] 입력값 검증 완료
   - [ ] CORS 설정 검증 완료

4. **모니터링**
   - [ ] 모든 로그 수집 중
   - [ ] 알림 규칙 활성화됨
   - [ ] 대시보드 생성됨

---

## 참고 자료

- **전체 기술 리뷰**: `TECHNICAL_REVIEW_T004_T005.md`
- **개선 코드 예제**:
  - `server/src/utils/improvements.ts`
  - `server/src/events/handlers-improved.ts`
  - `server/src/services/sessionPairingService-improved.ts`
- **테스트**:
  - `server/src/__tests__/integration.test.ts`
  - `server/src/services/__tests__/sessionPairingService.test.ts`

---

## FAQ

### Q1: 지금 바로 배포해도 되나요?
**A**: 아니요. Phase 1의 2개 TypeScript 에러와 메모리 누수 문제를 먼저 해결해야 합니다.

### Q2: 배포까지 얼마나 걸리나요?
**A**: Phase 1 (3일) + Phase 2 (4일) = 약 1주일을 권장합니다.

### Q3: Redis는 필수인가요?
**A**: MVP 배포에는 선택사항이지만, 2개 이상의 서버가 필요할 때는 필수입니다.

### Q4: 테스트를 모두 통과해야 하나요?
**A**: 최소 80% 이상의 테스트 통과가 필요합니다. Phase 3에서 나머지를 추가할 수 있습니다.

### Q5: 배포 후 문제가 발생하면?
**A**: 즉시 이전 버전으로 롤백할 수 있습니다 (5분 이내). 이후 원인 분석 후 재배포합니다.

---

**마지막 점검**: 이 체크리스트의 모든 항목을 확인한 후 배포를 진행하세요.
**담당자**: [팀명] / [담당자명]
**승인**: [결재자명]
