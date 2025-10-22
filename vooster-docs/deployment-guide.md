# 원격 컴퓨터 제어 시스템 - 배포 및 운영 가이드

**문서 버전**: 1.0.0
**작성일**: 2025-10-23
**대상**: DevOps 팀, 운영자

---

## 목차
1. [배포 아키텍처](#배포-아키텍처)
2. [개발 환경 구성](#개발-환경-구성)
3. [스테이징 배포](#스테이징-배포)
4. [프로덕션 배포](#프로덕션-배포)
5. [모니터링 및 로깅](#모니터링-및-로깅)
6. [보안 설정](#보안-설정)
7. [운영 절차](#운영-절차)
8. [문제 해결](#문제-해결)

---

## 배포 아키텍처

### 프로덕션 환경 구성

```
┌──────────────────────────────────────────┐
│         Client Browsers (HTTPS)          │
└────────────────┬─────────────────────────┘
                 │
      ┌──────────▼──────────┐
      │   CloudFlare CDN    │
      │  (Static Assets)    │
      └──────────┬──────────┘
                 │
┌────────────────▼─────────────────────────┐
│  Vercel (Next.js App)                    │
│  ├── API Routes (REST)                   │
│  ├── Server Components                   │
│  └── Dynamic Routes                      │
└────────┬──────────────────────┬──────────┘
         │                      │
    ┌────▼────────┐    ┌────────▼──────┐
    │  Supabase   │    │ WebSocket     │
    │  (Database) │    │ Server        │
    │  PostgreSQL │    │ (Node.js)     │
    └─────────────┘    └────────┬──────┘
                                │
         ┌──────────────────────┴──────────────────┐
         │                                         │
    ┌────▼──────────┐                    ┌────────▼───────┐
    │  Agent 1      │                    │  Agent 2       │
    │  (Docker)     │                    │  (Docker)      │
    │  Computer PC  │                    │  Printer PC    │
    └───────────────┘                    └────────────────┘
```

### 데이터 흐름

1. **웹앱 요청**: 사용자 → Vercel → Supabase
2. **실시간 통신**: 웹앱 ↔ WebSocket Server (Node.js)
3. **명령 실행**: WebSocket Server → Agent (Docker)
4. **상태 보고**: Agent → WebSocket Server → 웹앱

---

## 개발 환경 구성

### 1. 필수 도구 설치

```bash
# Node.js 20+ 설치
node --version  # v20.0.0 이상 확인

# npm 업데이트
npm install -g npm@latest

# 패키지 설치
npm install

# Supabase CLI 설치
npm install -g supabase
```

### 2. Docker 설정 (로컬 개발)

```bash
# Docker Desktop 설치 확인
docker --version

# docker-compose 확인
docker-compose --version
```

### 3. 환경 변수 설정

```bash
# .env.local 파일 생성
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_SECRET=$(openssl rand -base64 32)

# WebSocket
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Logging
LOG_LEVEL=debug
EOF

chmod 600 .env.local
```

### 4. 로컬 개발 서버 시작

```bash
# 터미널 1: Next.js 개발 서버
npm run dev

# 터미널 2: WebSocket 서버 (별도)
cd servers/websocket
npm run dev

# 터미널 3: Agent 시뮬레이션
cd agents/node-agent
npm run dev
```

---

## 스테이징 배포

### 1. 스테이징 환경 준비

```bash
# 스테이징 브랜치 생성
git checkout -b staging
git push origin staging

# 환경 변수 설정
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key
```

### 2. Vercel 스테이징 배포

```bash
# Vercel 프로젝트 링크
vercel link

# 스테이징 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL --environment staging
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY --environment staging

# 스테이징 배포
vercel deploy --prod --prebuilt
```

### 3. 데이터베이스 마이그레이션

```bash
# Supabase 마이그레이션 실행
supabase migration up

# 스테이징 데이터베이스에 시드 데이터 추가
npm run db:seed:staging
```

### 4. 테스트 실행

```bash
# E2E 테스트
npm run test:e2e

# 성능 테스트
npm run test:performance

# 보안 테스트
npm run test:security
```

---

## 프로덕션 배포

### 1. 배포 전 체크리스트

```bash
#!/bin/bash
# scripts/pre-deployment-check.sh

set -e

echo "=== Pre-Deployment Checks ==="

# 1. 브랜치 확인
echo "✓ Checking branch..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo "✗ Must deploy from main branch"
  exit 1
fi

# 2. 로컬 변경사항 확인
echo "✓ Checking for uncommitted changes..."
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Uncommitted changes detected"
  exit 1
fi

# 3. 최신 코드 확인
echo "✓ Checking if up to date..."
git fetch origin
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "✗ Not up to date with origin/main"
  exit 1
fi

# 4. 빌드 확인
echo "✓ Running build..."
npm run build

# 5. 테스트 확인
echo "✓ Running tests..."
npm run test

# 6. TypeScript 체크
echo "✓ Type checking..."
npm run typecheck

echo ""
echo "✅ All pre-deployment checks passed!"
```

### 2. 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "=== Production Deployment ==="

# 버전 업데이트
version=$(date +%Y.%m.%d.%H%M%S)
echo "Deploying version: $version"

# 1. Vercel 배포
echo "1. Deploying to Vercel..."
vercel deploy --prod \
  --token $VERCEL_TOKEN \
  --build-env NEXT_PUBLIC_VERSION=$version

# 2. WebSocket 서버 배포 (Heroku)
echo "2. Deploying WebSocket server..."
heroku deploy:jar servers/websocket/target/*.jar \
  --app vooster-websocket-prod

# 3. 데이터베이스 마이그레이션
echo "3. Running database migrations..."
supabase migration up --db-url $PRODUCTION_DB_URL

# 4. 환경 변수 검증
echo "4. Validating environment variables..."
node scripts/validate-env.js

# 5. 헬스 체크
echo "5. Running health checks..."
npm run test:health-check

# 6. Slack 알림
echo "6. Sending notification..."
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"Production deployment completed: $version\"}"

echo ""
echo "✅ Production deployment successful!"
```

### 3. 배포 실행

```bash
# 권한 부여
chmod +x scripts/pre-deployment-check.sh
chmod +x scripts/deploy-production.sh

# 사전 체크
./scripts/pre-deployment-check.sh

# 배포 실행
./scripts/deploy-production.sh
```

### 4. 배포 후 검증

```bash
#!/bin/bash
# scripts/post-deployment-verify.sh

set -e

PROD_URL="https://vooster.app"

echo "=== Post-Deployment Verification ==="

# 1. 앱 접근성 확인
echo "1. Checking app accessibility..."
status=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL)
if [ "$status" != "200" ]; then
  echo "✗ App returned status $status"
  exit 1
fi

# 2. API 헬스 체크
echo "2. Checking API health..."
curl -s $PROD_URL/api/health | grep -q '"status":"ok"' || exit 1

# 3. 데이터베이스 연결 확인
echo "3. Checking database connectivity..."
curl -s $PROD_URL/api/computers \
  -H "Authorization: Bearer $TEST_TOKEN" | grep -q "computers" || exit 1

# 4. WebSocket 연결 확인
echo "4. Checking WebSocket connectivity..."
node scripts/test-websocket.js

# 5. SSL 인증서 확인
echo "5. Checking SSL certificate..."
expiration=$(curl -s --connect-timeout 10 -I $PROD_URL | grep -i "strict-transport-security")
[ -n "$expiration" ] || exit 1

echo ""
echo "✅ All post-deployment checks passed!"
```

---

## 모니터링 및 로깅

### 1. 로그 수집 (ELK Stack)

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### 2. 메트릭 수집 (Prometheus)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'vooster-api'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'websocket-server'
    static_configs:
      - targets: ['localhost:3001']

  - job_name: 'agents'
    static_configs:
      - targets: ['localhost:9100']
```

### 3. 알림 설정 (Grafana)

```json
{
  "alert": {
    "name": "High Error Rate",
    "condition": "errors > 100 in 5m",
    "notification": {
      "channel": "slack",
      "message": "High error rate detected in production"
    }
  }
}
```

### 4. 로그 분석

```typescript
// 예제: 에러율 모니터링
async function analyzeErrorRate() {
  const query = `
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as errors,
      (SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_rate
    FROM request_logs
    WHERE timestamp > NOW() - INTERVAL '1 hour'
  `;

  const result = await elasticsearchClient.search(query);

  if (result.error_rate > 5) {
    await notifySlack('High error rate detected');
  }
}
```

---

## 보안 설정

### 1. HTTPS/TLS 설정

```bash
# Let's Encrypt 인증서 발급 (Certbot)
sudo apt-get install certbot
sudo certbot certonly --standalone -d vooster.app

# nginx에 인증서 설정
server {
    listen 443 ssl http2;
    server_name vooster.app;

    ssl_certificate /etc/letsencrypt/live/vooster.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vooster.app/privkey.pem;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
}
```

### 2. 환경 변수 관리

```bash
# 프로덕션 환경 변수 암호화
npm install -g @stormkit/cli

# 암호화된 환경 변수 저장
stormkit secret set SUPABASE_SERVICE_ROLE_KEY <value>

# .env.encrypted 파일 생성
npm run encrypt:env
```

### 3. 데이터베이스 보안

```sql
-- Row Level Security 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE computers ENABLE ROW LEVEL SECURITY;

-- 정책 예제
CREATE POLICY "Users can only access their own data"
  ON computers FOR SELECT
  USING (user_id = auth.uid());

-- 감사 로깅
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  record_id UUID,
  operation TEXT,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. API 보안

```typescript
// Rate Limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);

// CORS 설정
import cors from 'cors';

app.use(cors({
  origin: ['https://vooster.app', 'https://admin.vooster.app'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// CSRF 보호
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: false });
```

---

## 운영 절차

### 1. 정기 유지보수

```bash
#!/bin/bash
# scripts/maintenance.sh

echo "=== Weekly Maintenance ==="

# 1. 로그 정리
echo "1. Cleaning old logs..."
find /var/log/vooster -type f -mtime +30 -delete

# 2. 데이터베이스 백업
echo "2. Backing up database..."
pg_dump $PROD_DB_URL > backups/vooster-$(date +%Y%m%d).sql
gzip backups/vooster-$(date +%Y%m%d).sql

# 3. S3에 업로드
echo "3. Uploading to S3..."
aws s3 cp backups/ s3://vooster-backups/ --recursive

# 4. 의존성 업데이트 확인
echo "4. Checking for updates..."
npm outdated

# 5. 보안 취약점 스캔
echo "5. Running security audit..."
npm audit

echo "✅ Maintenance completed"
```

### 2. 백업 및 복구

```bash
# 수동 백업
pg_dump -h <host> -U <user> <database> > backup.sql

# 복구
psql -h <host> -U <user> <database> < backup.sql

# AWS S3 백업
aws s3 cp backup.sql s3://vooster-backups/
aws s3 cp s3://vooster-backups/backup.sql . --sse AES256
```

### 3. 버전 관리

```bash
# 버전 태그 생성
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 릴리스 노트 작성
npm run create:release-notes

# GitHub Releases에 게시
gh release create v1.0.0 --notes-file RELEASE_NOTES.md
```

### 4. 롤백 절차

```bash
#!/bin/bash
# scripts/rollback.sh

VERSION=$1

echo "Rolling back to version: $VERSION"

# 1. 이전 버전 배포
vercel deploy --prod \
  --target $VERSION

# 2. 데이터베이스 롤백
supabase db pull  # 마지막 마이그레이션 되돌리기

# 3. 캐시 무효화
cloudflare purge-cache --zone vooster.app

# 4. 알림 전송
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"Rollback to version $VERSION completed\"}"
```

---

## 문제 해결

### 1. 높은 응답 시간

```bash
# 원인 파악
curl -w "Connect: %{time_connect}, Response: %{time_starttransfer}, Total: %{time_total}\n" \
  https://vooster.app/api/health

# 데이터베이스 쿼리 성능 분석
EXPLAIN ANALYZE SELECT * FROM computers WHERE user_id = 'user-123';

# 캐시 확인
redis-cli INFO stats

# CDN 캐시 히트율 확인
curl -I https://vooster.app | grep "CF-Cache-Status"
```

### 2. 높은 CPU 사용률

```bash
# 프로세스 모니터링
top -p $(pgrep -f "node")

# Node.js 힙 프로파일
node --prof app.js
node --prof-process isolate-*.log > results.txt

# 메모리 누수 확인
npm install -g clinic
clinic doctor -- node app.js
```

### 3. 데이터베이스 연결 문제

```sql
-- 활성 연결 확인
SELECT pid, usename, application_name, state FROM pg_stat_activity;

-- 오래된 연결 종료
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'vooster'
AND state = 'idle'
AND query_start < NOW() - INTERVAL '30 minutes';

-- 커넥션 풀 상태 확인
SELECT count(*) FROM pg_stat_activity WHERE datname = 'vooster';
```

### 4. WebSocket 연결 문제

```bash
# WebSocket 연결 테스트
websocat wss://vooster.app/socket.io

# 포트 확인
netstat -tlnp | grep 3001

# 방화벽 규칙 확인
sudo ufw status
sudo ufw allow 3001/tcp
```

### 5. 메모리 누수 진단

```typescript
// src/backend/diagnostics.ts
import gc from 'gc-stats';
import heapdump from 'heapdump';

const stats = gc();

stats.on('stats', (data) => {
  if (data.diff.usedHeapSize > 50 * 1024 * 1024) {
    console.warn('Potential memory leak detected');
    heapdump.writeSnapshot(`./heap-${Date.now()}.heapsnapshot`);
  }
});
```

---

## 재해 복구 계획

### RPO & RTO 목표

| 항목 | 목표 |
|------|------|
| **RPO** (Recovery Point Objective) | 1시간 |
| **RTO** (Recovery Time Objective) | 30분 |

### 재해 복구 체크리스트

- [ ] 정기적인 백업 (매일)
- [ ] 백업 복구 테스트 (월 1회)
- [ ] 데이터 센터 다중화
- [ ] DNS Failover 설정
- [ ] 문제 상황 대응 팀 지정
- [ ] 통신 계획 수립

---

## 성능 최적화

### 1. 데이터베이스 최적화

```sql
-- 인덱스 생성
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
CREATE INDEX idx_computers_status ON computers(status);

-- 쿼리 분석
EXPLAIN ANALYZE SELECT * FROM commands WHERE computer_id = 'abc' ORDER BY created_at DESC LIMIT 10;

-- 정기 유지보수
VACUUM ANALYZE;
REINDEX DATABASE vooster;
```

### 2. 캐싱 전략

```typescript
// Redis 캐싱
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedComputers(userId: string) {
  const cached = await redis.get(`computers:${userId}`);
  if (cached) return JSON.parse(cached);

  const data = await fetchComputersFromDB(userId);
  await redis.setex(`computers:${userId}`, 3600, JSON.stringify(data));
  return data;
}
```

### 3. CDN 최적화

```javascript
// Next.js 이미지 최적화
<Image
  src="/screenshot.png"
  alt="Screenshot"
  width={1200}
  height={800}
  priority
/>

// 정적 자산 캐시 헤더
Cache-Control: public, max-age=31536000, immutable
```

---

**최종 점검**
- [ ] 모든 배포 스크립트 테스트 완료
- [ ] 롤백 절차 검증 완료
- [ ] 모니터링 대시보드 설정 완료
- [ ] 팀 전체가 운영 절차 숙지
- [ ] 재해 복구 계획 수립 완료

