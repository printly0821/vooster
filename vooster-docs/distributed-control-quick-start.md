# 분산 제어 시스템 빠른 시작 가이드

분산 제어 시스템을 빠르게 시작하기 위한 핵심 개념과 실행 단계를 정리했습니다.

---

## 핵심 개념 5분 이해

### 1. 시스템 흐름

```
사용자가 명령 생성
    ↓
서버가 Redis에 저장 + SSE로 푸시
    ↓
클라이언트 에이전트가 수신
    ↓
명령 실행 (인쇄, 스크린샷 등)
    ↓
결과를 서버로 전송
    ↓
데이터베이스 저장 + 사용자에게 표시
```

### 2. 핵심 기술 선택

| 기술 | 용도 | 이유 |
|------|------|------|
| **Hono.js** | API 프레임워크 | 가볍고 빠름, TypeScript 기본 지원 |
| **Next.js SSE** | 실시간 통신 | 간단하고 안정적, 로드 밸런싱 용이 |
| **Redis** | 명령 큐 | 빠르고 간단, 최소 복잡도 |
| **PostgreSQL** | 영구 저장소 | 신뢰성 높음, 감사 로깅 용이 |

### 3. 데이터 모델

```typescript
// 필수 3가지 엔티티

// 1. 클라이언트 (제어 대상)
interface Client {
  id: string;
  name: string;
  clientKey: string;
  status: 'online' | 'offline';
}

// 2. 명령 (제어 지시)
interface Command {
  id: string;
  clientId: string;
  action: string; // 'print', 'screenshot' 등
  payload: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// 3. 결과 (실행 결과)
interface Result {
  commandId: string;
  success: boolean;
  data: any;
  duration: number;
}
```

---

## 빠른 설정 (10분)

### Step 1: 환경 변수 설정

```bash
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/db
REDIS_HOST=localhost
REDIS_PORT=6379

# 클라이언트 발급 예: sk_client001_abc123xyz
CLIENT_KEY=sk_client001_yourkey
```

### Step 2: 필수 테이블 생성

```sql
-- 최소한의 테이블만 생성
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_key TEXT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'online'
);

CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  action VARCHAR(100),
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES commands(id),
  event_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 3: 서버 엔드포인트 (최소)

```typescript
// 명령 생성
POST /api/commands
{
  "clientId": "uuid",
  "action": "print",
  "payload": { "file": "document.pdf" }
}

// 상태 조회
GET /api/commands/:id

// 결과 저장
POST /api/commands/:id/result
{
  "success": true,
  "data": { "jobId": "123" }
}

// SSE 스트림
GET /api/events/:clientId (이벤트 구독)
```

### Step 4: 클라이언트 에이전트 (최소)

```typescript
class Agent {
  async connect() {
    // 1. SSE로 명령 듣기
    const eventSource = new EventSource('/api/events/:clientId');

    eventSource.addEventListener('command', (e) => {
      const cmd = JSON.parse(e.data);
      this.execute(cmd);
    });
  }

  async execute(command) {
    // 2. 명령 실행
    const result = await doWork(command.action, command.payload);

    // 3. 결과 전송
    await fetch(`/api/commands/${command.id}/result`, {
      method: 'POST',
      body: JSON.stringify(result)
    });
  }
}
```

---

## 실제 사용 예시

### 인쇄 시스템 구현

```typescript
// 1. 명령 생성 (관리자가 버튼 클릭)
const createPrintJob = async (printerId: string, filePath: string) => {
  const response = await fetch('/api/commands', {
    method: 'POST',
    body: JSON.stringify({
      clientId: printerId,
      action: 'print',
      payload: {
        filePath,
        copies: 1,
        options: { duplex: true }
      },
      priority: 5
    })
  });

  const command = await response.json();
  return command.id; // 추적용 ID
};

// 2. 상태 모니터링
const monitorPrintJob = async (commandId: string) => {
  while (true) {
    const response = await fetch(`/api/commands/${commandId}`);
    const command = await response.json();

    console.log(`Status: ${command.status}`);

    if (command.status === 'completed') {
      console.log('인쇄 완료:', command.result);
      break;
    }

    if (command.status === 'failed') {
      console.error('인쇄 실패:', command.error_message);
      break;
    }

    await new Promise(r => setTimeout(r, 1000));
  }
};

// 3. 클라이언트 에이전트 (프린터 컴퓨터)
class PrinterAgent {
  async startListening() {
    const clientId = 'printer-001';

    const eventSource = new EventSource(
      `/api/events/${clientId}`,
      {
        headers: { 'Authorization': 'Bearer sk_printer001_key' }
      }
    );

    eventSource.addEventListener('command', async (e) => {
      const cmd = JSON.parse(e.data);

      if (cmd.action === 'print') {
        // 인쇄 실행
        const jobId = await this.printFile(
          cmd.payload.filePath,
          cmd.payload.copies
        );

        // 결과 전송
        await fetch(`/api/commands/${cmd.id}/result`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer sk_printer001_key' },
          body: JSON.stringify({
            success: true,
            data: { jobId }
          })
        });
      }
    });
  }

  async printFile(filePath: string, copies: number) {
    // 실제 인쇄 로직 (플랫폼별)
    // Windows: ShellExecute("print", filePath)
    // macOS: lp -n copies filePath
    // Linux: lpr -# copies filePath
    return `job_${Date.now()}`;
  }
}
```

---

## 일반적인 문제 해결

### Q1: 클라이언트가 명령을 받지 못함

**원인**:
1. 클라이언트가 연결되지 않음
2. 클라이언트 ID 불일치
3. 권한 없음

**해결**:
```bash
# 1. Redis에서 클라이언트 상태 확인
redis-cli
> GET client:client-001:status

# 2. 데이터베이스에서 클라이언트 확인
SELECT * FROM clients WHERE id = 'client-001';

# 3. 권한 설정 확인
SELECT * FROM client_permissions WHERE client_id = 'client-001';
```

### Q2: 명령이 완료되지 않음

**원인**:
1. 클라이언트 실행 중 오류
2. 네트워크 연결 끊김
3. 재시도 초과

**해결**:
```typescript
// 1. 로그 확인
SELECT * FROM command_logs WHERE command_id = 'cmd-123' ORDER BY created_at;

// 2. 에러 메시지 확인
SELECT error_message, status FROM commands WHERE id = 'cmd-123';

// 3. 수동 재시도
POST /api/commands/cmd-123/retry
```

### Q3: Redis 메모리 부족

**원인**: TTL 설정 안 됨 또는 메모리 제한 없음

**해결**:
```bash
# Redis 메모리 제한 설정
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 캐시 전체 삭제
redis-cli FLUSHALL

# 메모리 사용량 확인
redis-cli INFO memory
```

---

## 성능 최적화 팁

### 1. 명령 배치 처리

```typescript
// 나쁜 예: 1개씩 전송
for (const printer of printers) {
  await createCommand(printer, job);
  await wait(100);
}

// 좋은 예: 배치로 전송
const commands = await Promise.all(
  printers.map(p => createCommand(p, job))
);
```

### 2. 우선순위 활용

```typescript
// 중요한 명령은 높은 우선순위
await createCommand({
  action: 'emergency_shutdown',
  priority: 10  // 최고 우선순위
});

// 일반 작업은 낮은 우선순위
await createCommand({
  action: 'collect_logs',
  priority: 1   // 낮은 우선순위
});
```

### 3. 캐싱 활용

```typescript
// 자주 조회되는 명령은 캐시
const cacheKey = `command:${commandId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const command = await db.commands.findById(commandId);
await redis.setex(cacheKey, 300, JSON.stringify(command));

return command;
```

### 4. 연결 풀링

```typescript
// Redis 연결 재사용
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false
});

// PostgreSQL 연결 풀
const pool = new pg.Pool({
  max: 20,              // 최대 연결 수
  min: 5,               // 최소 연결 수
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

---

## 보안 체크리스트 (필수)

```markdown
## 배포 전 보안 확인

### 통신 보안
- [ ] HTTPS/WSS 사용
- [ ] 자체 서명 인증서 제거
- [ ] CORS 정책 설정

### 인증 & 권한
- [ ] 클라이언트 키 안전하게 관리
- [ ] Rate limiting 설정
- [ ] 권한 확인 로직 구현

### 데이터 보안
- [ ] 민감 데이터 암호화
- [ ] 비밀번호는 해시 저장
- [ ] SQL injection 방지 (Zod 검증)

### 감시 & 감시
- [ ] 감사 로깅 활성화
- [ ] 에러 로깅
- [ ] 모니터링 설정

### 정기 점검
- [ ] 의존성 업데이트 확인
- [ ] 보안 패치 적용
- [ ] 백업 테스트
```

---

## 다음 단계

### 소규모 (프로토타입)
1. 기본 API 엔드포인트 구현
2. 간단한 클라이언트 에이전트 작성
3. Redis만 사용 (PostgreSQL은 로깅용)

**예상 시간**: 1-2주

### 중규모 (프로덕션 준비)
1. WebSocket 지원 추가
2. 데이터베이스에 모든 데이터 저장
3. 모니터링 및 로깅 구축
4. 보안 강화 (RBAC 등)

**예상 시간**: 2-3주

### 대규모 (엔터프라이즈)
1. 마이크로서비스 분리
2. 메시지 큐 (RabbitMQ) 통합
3. 로드 밸런싱 및 자동 확장
4. 상세한 모니터링 및 알림

**예상 시간**: 3-4주

---

## 참고 자료

### 내 문서
- [분산 제어 시스템 아키텍처 가이드](distributed-control-system-architecture.md)
- [실제 구현 가이드](distributed-control-implementation-guide.md)

### 외부 자료
- [Hono.js 공식 문서](https://hono.dev/)
- [Redis 최적화](https://redis.io/docs/about/)
- [Next.js SSE 예제](https://nextjs.org/docs/app/building-your-application/routing/api-routes)
- [WebSocket 표준](https://tools.ietf.org/html/rfc6455)

---

## 마지막 팁

### 1. 작게 시작하기
```typescript
// MVP: 가장 간단한 버전
const mvp = {
  클라이언트수: 5,
  명령종류: 1,
  저장소: Redis만,
  인증: 간단한 토큰
};
```

### 2. 단계적 확장
```typescript
// 첫 달: 기본 기능
// 두 번째 달: 모니터링 추가
// 세 번째 달: 고급 기능 추가
```

### 3. 실수 줄이기
```typescript
// 항상 확인
- [ ] 명령 ID 올바른가?
- [ ] 클라이언트 키 유효한가?
- [ ] Redis 연결됐나?
- [ ] 데이터베이스 쿼리 정확한가?
```

### 4. 디버깅 팁
```bash
# Redis 명령어로 상태 확인
redis-cli KEYS 'control_system:*'
redis-cli LLEN 'control_system:client:client-001:queue'

# 데이터베이스 쿼리
SELECT COUNT(*) FROM commands WHERE status = 'pending';
SELECT * FROM command_logs WHERE command_id = '...' ORDER BY created_at DESC;

# 로그 확인
docker logs -f api_container
tail -f ~/.pm2/logs/api-error.log
```

---

이 가이드로 분산 제어 시스템을 빠르게 시작할 수 있습니다.
구체적인 구현 세부사항은 [실제 구현 가이드](distributed-control-implementation-guide.md)를 참고하세요.
