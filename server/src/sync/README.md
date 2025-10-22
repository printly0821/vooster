# Vooster 동기화 엔진

로컬 태스크 파일(.md, .json)과 Vooster API를 양방향으로 자동 동기화하는 엔진입니다.

## 주요 기능

- ✅ **실시간 파일 감시**: chokidar를 사용한 로컬 파일 변경 감지
- 🔄 **양방향 동기화**: 로컬 ↔ 원격 자동 동기화
- ⚡ **충돌 해결**: 타임스탬프 기반 자동 충돌 해결
- 💾 **SQLite 매핑**: 로컬-원격 태스크 매핑 관리
- 🔁 **재시도 로직**: 지수 백오프를 사용한 자동 재시도
- 📊 **통계 및 로깅**: pino 기반 구조화된 로깅

## 아키텍처

```
server/src/sync/
├── types.ts                 # 타입 정의 및 Zod 스키마
├── config/
│   └── config.ts           # 설정 로더
├── store/
│   └── mappingStore.ts     # SQLite 매핑 스토어
├── api/
│   └── voosterClient.ts    # Vooster REST API 클라이언트
├── parser/
│   └── taskParser.ts       # JSON/Markdown 파서
├── conflict/
│   └── conflictResolver.ts # 충돌 해결 로직
├── sync/
│   └── syncEngine.ts       # 동기화 엔진 핵심
└── index.ts                # 메인 진입점
```

## 설정

`.env` 파일에 다음 환경 변수를 설정하세요:

```bash
# Vooster API 설정
VOOSTER_BASE_URL=https://api.vooster.ai/v1
VOOSTER_API_TOKEN=your-api-token-here

# 동기화 설정
SYNC_WATCH_DIR=.vooster/tasks
SYNC_DB_PATH=.vooster/sync.db
SYNC_POLL_INTERVAL_MS=30000
SYNC_CONCURRENCY=5
SYNC_DELETE_POLICY=archive    # archive | delete | ignore
SYNC_CLOCK_DRIFT_MS=5000
SYNC_ENABLED=true
```

## 사용법

### 프로그래밍 방식

```typescript
import { startSyncEngine } from './server/src/sync';

// 기본 설정으로 시작
const engine = await startSyncEngine();

// 커스텀 설정으로 시작
const engine = await startSyncEngine({
  watchDir: './custom/tasks',
  pollIntervalMs: 60000,
});

// 헬스체크
const health = engine.getHealth();
console.log(health);

// 통계 조회
const stats = engine.getStats();
console.log(stats);

// 종료
await engine.stop();
```

### CLI 모드

```bash
# 동기화 엔진 시작
npm run sync

# 또는 직접 실행
tsx server/src/sync/index.ts
```

## 파일 포맷

### JSON 포맷

```json
{
  "id": "task-001",
  "title": "사용자 인증 구현",
  "description": "JWT 기반 인증 시스템 구축",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "updatedAt": "2025-01-22T10:30:00.000Z",
  "tags": ["backend", "security"]
}
```

### Markdown 포맷 (Frontmatter)

```markdown
---
id: task-001
title: 사용자 인증 구현
status: IN_PROGRESS
priority: HIGH
updatedAt: 2025-01-22T10:30:00.000Z
tags:
  - backend
  - security
---

## 설명

JWT 기반 인증 시스템을 구축합니다.

## 체크리스트

- [x] JWT 토큰 생성
- [x] 토큰 검증 미들웨어
- [ ] 리프레시 토큰
```

## 충돌 해결

타임스탬프 기반 최신 수정 우선 정책:

1. **허용 드리프트 내**: 로컬 우선 (기본 5초)
2. **명확한 시간 차이**: 최신 수정 우선
3. **충돌 로그**: 모든 충돌은 로그에 기록됨

## 삭제 정책

로컬 파일 삭제 시 원격 태스크 처리 방법:

- **archive**: 태스크를 보관 상태로 변경 (기본값)
- **delete**: 태스크를 완전히 삭제
- **ignore**: 원격 태스크는 그대로 유지

## 에러 처리

- **네트워크 오류**: 지수 백오프 재시도 (1s → 2s → 4s → 32s)
- **429 Rate Limit**: Retry-After 헤더 준수
- **파싱 오류**: 해당 파일 스킵 및 로그 기록
- **충돌 실패**: 로그 기록 후 스킵

## 모니터링

### 헬스체크

```typescript
const health = engine.getHealth();
// {
//   healthy: true,
//   lastSyncAt: "2025-01-22T...",
//   pendingOperations: 0,
//   stats: { created: 10, updated: 5, ... }
// }
```

### 로그

모든 작업은 구조화된 JSON 로그로 기록됩니다:

```json
{
  "level": "info",
  "time": "2025-01-22T10:30:00.000Z",
  "msg": "원격 태스크 생성됨",
  "localId": "task-001",
  "remoteId": "remote-abc123"
}
```

## 테스트

```bash
# 단위 테스트
npm run test:server

# 통합 테스트
npm run test:server -- sync
```

## 확장성

### Webhook 지원 (향후)

```typescript
// Webhook 엔드포인트 추가
app.post('/api/sync/webhook', async (req, res) => {
  const event = req.body;
  await engine.handleWebhookEvent(event);
  res.json({ success: true });
});
```

### WebSocket 지원 (향후)

```typescript
// WebSocket 연결
const ws = new WebSocket('wss://api.vooster.ai/sync');
ws.on('message', (data) => {
  engine.handleRealtimeUpdate(JSON.parse(data));
});
```

## 보안

- ✅ API 토큰은 환경 변수로 관리
- ✅ 로그에서 민감 정보 마스킹
- ✅ HTTPS 강제
- ✅ 요청 재시도 제한

## 성능

- **평균 동기화 지연**: < 2초 (로컬 변경 → 원격 반영)
- **폴링 간격**: 30초 (설정 가능)
- **동시 처리**: 5개 (설정 가능)
- **메모리 사용**: SQLite WAL 모드로 최적화

## 문제 해결

### 동기화가 작동하지 않음

1. `SYNC_ENABLED=true` 확인
2. `VOOSTER_API_TOKEN` 설정 확인
3. 로그 확인: `LOG_LEVEL=debug npm run sync`

### 파일이 동기화되지 않음

1. 파일 포맷 확인 (.json 또는 .md)
2. 스키마 검증 오류 확인
3. 워치 디렉터리 경로 확인

### 충돌이 계속 발생함

1. `SYNC_CLOCK_DRIFT_MS` 증가 (기본 5000ms)
2. 시스템 시간 동기화 확인 (NTP)

## 라이선스

MIT
