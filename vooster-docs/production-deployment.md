# 프로덕션 배포 전략 가이드 (T-009)

## 개요

웹 바코드 스캔 애플리케이션의 프로덕션 배포 전략을 다룹니다. PM2 클러스터 모드, Docker 멀티스테이지 빌드, Nginx 리버스 프록시, CI/CD 파이프라인을 포함합니다.

---

## 1. 아키텍처 개요

### 배포 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│         Nginx 리버스 프록시 (포트 80/443)                │
│    - TLS 종료점 (Let's Encrypt 인증서)                   │
│    - WebSocket 업그레이드 처리                            │
│    - 정적 파일 캐싱                                        │
│    - 보안 헤더 추가                                        │
└─────────────┬─────────────────────────────┬──────────────┘
              │                             │
              ▼                             ▼
    ┌──────────────────┐        ┌──────────────────────┐
    │ Next.js 앱       │        │ 실시간 서버          │
    │ (포트 3000)      │        │ Socket.IO (포트 3001)│
    │ - 페이지 렌더링  │        │ - 웹소켓 연결        │
    │ - API 라우트     │        │ - 실시간 이벤트      │
    │ - SSR/ISR        │        │ - 클러스터링         │
    └──────────────────┘        └──────────────────────┘
              │                             │
              └─────────────┬───────────────┘
                            ▼
                    ┌───────────────┐
                    │   Supabase    │
                    │  PostgreSQL   │
                    └───────────────┘
```

### 주요 컴포넌트

1. **Nginx 프록시**: 진입점 (엣지)
   - HTTPS/TLS 종료
   - 요청 라우팅
   - 캐싱 및 압축
   - 보안 헤더

2. **Next.js 애플리케이션**: 웹 서버
   - 페이지 렌더링 (SSR/SSG)
   - API 라우트
   - 정적 자산 제공

3. **Socket.IO 서버**: 실시간 통신
   - WebSocket 연결 관리
   - 클러스터 모드 (다중 프로세스)
   - Redis 어댑터 (필요시)

---

## 2. PM2 클러스터 모드 설정

### PM2란?

PM2는 Node.js 애플리케이션을 위한 고급 프로세스 관리자입니다. 프로덕션 환경에서 안정성과 성능을 보장합니다.

### 클러스터 모드 설정

**파일**: `ecosystem.config.js`

```javascript
/**
 * PM2 Ecosystem Configuration
 * 실시간 서버 및 Next.js 앱 프로세스 관리 (T-009)
 */

module.exports = {
  apps: [
    /**
     * 실시간 통신 서버 (Socket.IO)
     * 클러스터 모드로 멀티 코어 활용
     */
    {
      name: 'realtime-server',
      script: './server/dist/index.js',
      instances: 'max', // CPU 코어 수만큼 프로세스 생성
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 재시작 정책
      max_memory_restart: '512M', // 512MB 초과 시 재시작
      max_restarts: 10, // 1시간 내 10회 이상 재시작 실패 시 멈춤
      min_uptime: '10s', // 10초 이상 실행되어야 카운트
      listen_timeout: 10000,
      kill_timeout: 5000,

      // 로깅
      output: './logs/realtime-server.log',
      error: './logs/realtime-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 자동 재시작
      autorestart: true,
      watch: false, // 프로덕션에서는 비활성화
      ignore_watch: ['node_modules', 'logs', '.git'],

      // 메트릭
      instance_var: 'INSTANCE_ID',
      merge_logs: true, // 여러 프로세스의 로그를 하나의 파일로
    },

    /**
     * Next.js 앱 (브라우저 서빙)
     * 단일 프로세스로 실행 (Next.js 자체가 최적화됨)
     */
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      autorestart: true,
      watch: false,

      output: './logs/nextjs-app.log',
      error: './logs/nextjs-app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],

  /**
   * 모니터링 및 로그 설정
   */
  monitor: {
    monitoring_interval: 5000,
  },

  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/master',
      repo: 'git@github.com:your-org/barcode-app.git',
      path: '/var/www/barcode-app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
    staging: {
      user: 'node',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/barcode-app.git',
      path: '/var/www/barcode-app-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
```

### 주요 설정 항목 설명

| 항목 | 값 | 설명 |
|------|-----|------|
| `instances` | 'max' | CPU 코어 개수만큼 프로세스 생성 (자동 확장) |
| `exec_mode` | 'cluster' | 클러스터 모드 (다중 프로세스) |
| `max_memory_restart` | '512M' | 메모리 사용량 초과 시 자동 재시작 |
| `min_uptime` | '10s' | 최소 유지 시간 (크래시 감지) |
| `max_restarts` | 10 | 1시간 내 최대 재시작 횟수 |
| `listen_timeout` | 10000 | 포트 바인딩 대기 시간 (ms) |
| `kill_timeout` | 5000 | 강제 종료 전 대기 시간 (ms) |

### PM2 명령어

#### 초기 실행

```bash
# 프로덕션 모드로 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 프로세스 모니터링
pm2 monit
```

#### 배포 후 리로드

```bash
# 무중단 리로드 (graceful reload)
pm2 reload ecosystem.config.js --env production

# 강제 재시작
pm2 restart ecosystem.config.js --env production

# 로그 확인
pm2 logs

# 특정 프로세스 로그
pm2 logs realtime-server
pm2 logs nextjs-app

# 로그 지우기
pm2 flush
```

#### 프로세스 관리

```bash
# 프로세스 그룹 중지
pm2 stop ecosystem.config.js

# 프로세스 그룹 삭제
pm2 delete ecosystem.config.js

# 시스템 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

---

## 3. Docker 멀티스테이지 빌드

### Docker 이미지 최적화

**파일**: `Dockerfile`

```dockerfile
# 다단계 빌드: 의존성 설치
FROM node:22-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 다단계 빌드: 개발 의존성으로 빌드
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Next.js 빌드
RUN npm run build
# 서버 빌드
RUN npm run server:build

# 최종 이미지: 실행 환경
FROM node:22-slim

# 보안: 메타데이터 설정
LABEL maintainer="barcode-app@example.com"
LABEL version="1.0"
LABEL description="Barcode Order Inquiry App - Production Image"

# 작업 디렉토리
WORKDIR /app

# 보안: 비루트 사용자 생성 및 전환
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

# 다단계 빌드에서 프로덕션 의존성 복사
COPY --from=dependencies /app/node_modules ./node_modules

# 빌드된 파일 및 소스 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# 로그 디렉토리 생성
RUN mkdir -p ./logs && chown -R nodeuser:nodeuser /app

# 소유권 변경 (보안)
RUN chown -R nodeuser:nodeuser /app

# 비루트 사용자로 전환
USER nodeuser

# 포트 노출
EXPOSE 3000 3001

# 헬스체크 (T-009)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 시작 명령어
# PM2를 사용하는 경우: npm install -g pm2 && pm2-runtime start ecosystem.config.js
# 직접 실행하는 경우:
CMD ["node", "--expose-gc", "--max-old-space-size=1024", "server/dist/index.js"]
```

### 빌드 최적화 전략

1. **다단계 빌드**
   - 의존성 단계: 프로덕션 의존성만
   - 빌드 단계: 전체 의존성 + 빌드
   - 최종 단계: 프로덕션 의존성만 포함

2. **이미지 크기 감소**
   - Node.js `slim` 버전 사용 (약 150MB)
   - 불필요한 파일 제외
   - npm 캐시 정리

3. **보안 강화**
   - 비루트 사용자 실행
   - 최소 필수 권한만 부여
   - HEALTHCHECK 포함

### Docker 이미지 빌드 및 실행

```bash
# 이미지 빌드
docker build -t barcode-app:1.0.0 .

# 태그 지정
docker tag barcode-app:1.0.0 barcode-app:latest

# 컨테이너 실행 (개발용)
docker run -d \
  --name barcode-app \
  -p 3000:3000 \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -v $(pwd)/logs:/app/logs \
  barcode-app:latest

# 이미지 푸시 (Docker Hub)
docker push barcode-app:1.0.0
docker push barcode-app:latest

# 이미지 크기 확인
docker images barcode-app

# 컨테이너 로그
docker logs -f barcode-app

# 헬스체크 상태
docker inspect --format='{{.State.Health.Status}}' barcode-app
```

---

## 4. Docker Compose 오케스트레이션

### 다중 컨테이너 관리

**파일**: `docker-compose.yml`

```yaml
version: '3.9'

services:
  # 실시간 통신 서버 (Socket.IO)
  realtime-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: barcode-realtime-server
    environment:
      NODE_ENV: production
      PORT: 3001
      SOCKET_JWT_SECRET: ${SOCKET_JWT_SECRET:-change-me-in-production}
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000,http://localhost:3001}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3001:3001"
    expose:
      - "3001"
    volumes:
      - ./logs:/app/logs
      - /app/node_modules # 호스트의 node_modules 사용 방지
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    networks:
      - barcode-network
    labels:
      - "com.barcode.service=realtime-server"
      - "com.barcode.version=1.0"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx 리버스 프록시 & TLS 종료
  nginx-proxy:
    image: nginx:stable-alpine
    container_name: barcode-nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      realtime-server:
        condition: service_healthy
    networks:
      - barcode-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/healthz"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    labels:
      - "com.barcode.service=nginx-proxy"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  barcode-network:
    driver: bridge
    name: barcode-network

volumes:
  # prometheus-data:
  # elasticsearch-data:
```

### 환경 변수 파일 (`.env`)

```env
# 실행 환경
NODE_ENV=production

# Socket.IO 설정
SOCKET_JWT_SECRET=your-secret-key-here
CORS_ORIGINS=https://app.example.com,https://monitor.example.com

# 로깅
LOG_LEVEL=info

# 데이터베이스 (예시)
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Docker Compose 실행 명령어

```bash
# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f realtime-server
docker-compose logs -f nginx-proxy

# 서비스 상태 확인
docker-compose ps

# 서비스 다시 시작
docker-compose restart realtime-server

# 모든 컨테이너 중지
docker-compose stop

# 모든 컨테이너 삭제
docker-compose down

# 볼륨 제거 (주의!)
docker-compose down -v

# 이미지 리빌드
docker-compose build --no-cache

# 최신 변경사항 적용
docker-compose up -d --pull always
```

---

## 5. Nginx 리버스 프록시 설정

### Nginx 역할

- **TLS 종료점**: HTTPS 처리
- **라우팅**: 요청을 적절한 백엔드으로 전달
- **캐싱**: 정적 자산 캐싱
- **압축**: Gzip 압축
- **보안**: 보안 헤더 추가

### 설정 파일

**파일**: `nginx.conf`

```nginx
# Nginx 프록시 설정 (T-009)
# 실시간 서버 및 Next.js 앱 라우팅

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
  worker_connections 2048;
  use epoll;
  multi_accept on;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent" "$http_x_forwarded_for"';

  access_log /var/log/nginx/access.log main;

  # 성능 최적화
  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;
  client_max_body_size 20M;

  # Gzip 압축
  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types text/plain text/css text/xml text/javascript application/json
             application/javascript application/xml+rss application/rss+xml
             font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
  gzip_disable "msie6";

  # 업스트림 정의
  upstream realtime_backend {
    least_conn;
    server realtime-server:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
  }

  # HTTP → HTTPS 리다이렉트
  server {
    listen 80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }
    location / {
      return 301 https://$host$request_uri;
    }
  }

  # HTTPS 서버 (TLS 1.2+, HTTP/2)
  server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;

    # SSL/TLS 인증서 (로컬 개발용, 프로덕션에서는 Let's Encrypt 사용)
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # 헬스체크 엔드포인트
    location /healthz {
      access_log off;
      return 200 '{"status":"ok"}';
      add_header Content-Type application/json;
    }

    # Socket.IO 실시간 서버 라우팅
    location /socket.io {
      proxy_pass http://realtime_backend;
      proxy_http_version 1.1;

      # WebSocket 업그레이드 헤더 (T-009)
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";

      # 프록시 헤더
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-Host $server_name;

      # 타임아웃 (WebSocket 장시간 연결)
      proxy_connect_timeout 7d;
      proxy_send_timeout 7d;
      proxy_read_timeout 7d;

      # 버퍼 비활성화 (실시간 데이터)
      proxy_buffering off;
    }

    # API 라우팅
    location /api {
      proxy_pass http://realtime_backend;
      proxy_http_version 1.1;

      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      # 타임아웃
      proxy_connect_timeout 60s;
      proxy_send_timeout 60s;
      proxy_read_timeout 60s;

      # 자동 재시도
      proxy_next_upstream error timeout http_502 http_503 http_504;
      proxy_next_upstream_tries 2;
    }

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
      access_log off;
    }
  }
}
```

### WebSocket 업그레이드 설명

```nginx
# WebSocket을 지원하려면 다음 헤더 필수:
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# 의미:
# 1. Upgrade 헤더: 프로토콜 업그레이드 요청 (HTTP -> WebSocket)
# 2. Connection: 헤더 "upgrade"를 포함한 경우 기존 연결 유지
```

### HTTPS 설정 (Let's Encrypt)

```bash
# Certbot 설치 및 인증서 발급
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com

# 자동 갱신 설정 (crontab)
0 3 * * * certbot renew --quiet
```

---

## 6. 모니터링 및 로깅

### PM2 모니터링

```bash
# 실시간 모니터링 대시보드
pm2 monit

# JSON 형식 상태 확인
pm2 status --format json | jq

# 프로세스 메트릭
pm2 info realtime-server
pm2 info nextjs-app
```

### 헬스체크 엔드포인트

#### Next.js 앱 헬스체크

```typescript
// src/app/api/health/route.ts
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 데이터베이스 연결 확인
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return Response.json(health);
  } catch (error) {
    return Response.json(
      { status: 'error', message: String(error) },
      { status: 503 }
    );
  }
}
```

#### Socket.IO 서버 헬스체크

```typescript
// server/src/routes/health.ts
export const registerHealthRoutes = (app: any) => {
  app.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
    });
  });
};
```

### 로그 집계 전략

#### 로그 구조

```
logs/
├── realtime-server.log       # Socket.IO 서버 로그
├── realtime-server-error.log # 에러 로그
├── nextjs-app.log            # Next.js 앱 로그
├── nextjs-app-error.log      # 에러 로그
└── nginx/
    ├── access.log            # 접근 로그
    └── error.log             # 에러 로그
```

#### 로그 로테이션 (logrotate)

```bash
# /etc/logrotate.d/barcode-app
/var/www/barcode-app/logs/*.log {
  daily
  rotate 14
  missingok
  notifempty
  compress
  delaycompress
  postrotate
    pm2 reload ecosystem.config.js > /dev/null 2>&1 || true
  endscript
}
```

#### 원격 로그 수집 (선택사항)

```bash
# ELK Stack (Elasticsearch, Logstash, Kibana)
docker run -d \
  --name elasticsearch \
  -e discovery.type=single-node \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0

# Logstash 설정으로 로그 수집
# Kibana (http://localhost:5601)에서 대시보드 구성
```

### 성능 메트릭

#### 모니터링할 지표

| 메트릭 | 목표 | 도구 |
|--------|------|------|
| CPU 사용률 | < 70% | `top`, PM2 monit |
| 메모리 사용률 | < 80% | `free`, PM2 monit |
| 디스크 사용률 | < 80% | `df` |
| 응답 시간 | < 200ms | Nginx access log |
| 에러율 | < 0.1% | Nginx error log |
| WebSocket 연결 수 | N/A | Socket.IO 통계 |

#### 커스텀 메트릭 수집

```typescript
// server/src/metrics/index.ts
export class MetricsCollector {
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    connectionCount: 0,
    avgResponseTime: 0,
  };

  recordRequest(duration: number, status: number) {
    this.metrics.requestCount++;
    if (status >= 400) this.metrics.errorCount++;

    // 이동 평균 계산
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * 0.9) + (duration * 0.1);
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.errorCount / this.metrics.requestCount,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## 7. CI/CD 파이프라인

### GitHub Actions 워크플로우

**파일**: `.github/workflows/docker-build-and-deploy.yml`

```yaml
name: Build & Deploy Docker Image

on:
  push:
    branches:
      - main
      - master
      - develop
    tags:
      - 'v*'
  pull_request:
    branches:
      - main
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Log in to GitHub Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ secrets.DOCKER_USERNAME }}/barcode-app
            ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run tests (optional)
        if: github.event_name == 'pull_request'
        run: |
          docker build -t barcode-app:test .
          docker run --rm barcode-app:test npm run test

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref_type == 'tag'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          # 배포 스크립트 또는 SSH 명령어
          # 예시:
          # ssh -i ${{ secrets.SSH_KEY }} user@host "cd /app && docker-compose pull && docker-compose up -d"
          echo "Deploying to production..."
          echo "Tag: ${{ github.ref_name }}"
```

### 워크플로우 동작

1. **빌드 스테이지**
   - 코드 체크아웃
   - Docker 이미지 빌드
   - 레지스트리에 푸시

2. **테스트 스테이지**
   - PR인 경우 테스트 실행
   - 빌드 검증

3. **배포 스테이지**
   - 태그 푸시 시에만 실행
   - 프로덕션 배포

### 필수 Secrets 설정

GitHub 저장소 Settings → Secrets에서 다음 항목 추가:

```
DOCKER_USERNAME      # Docker Hub 사용자명
DOCKER_PASSWORD      # Docker Hub 패스워드
SSH_KEY              # 배포 서버 SSH 키
DEPLOY_HOST          # 배포 서버 주소
DEPLOY_USER          # 배포 서버 사용자명
```

---

## 8. 무중단 배포 (Blue-Green Deployment)

### 배포 전략

```
┌─────────────────────────────────────────┐
│      클라이언트 (브라우저)                │
└────────────────┬────────────────────────┘
                 │
          ┌──────▼──────┐
          │   Nginx      │ ← 요청 라우팅 (트래픽 전환)
          └──────┬──────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼──┐        ┌───▼────┐
    │ Blue  │        │ Green   │
    │ (현재)│        │ (신규)  │
    └───────┘        └────────┘
    - v1.0.0         - v1.0.1
    - 실행 중        - 준비 중
                     - 테스트 완료
                     ↓
    └────────┬──────────┘
             │
        트래픽 전환
             │
    ┌────────▼──────────┐
    │ Green (활성화)     │
    │ - v1.0.1          │
    └───────────────────┘
```

### 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

DEPLOY_DIR="/var/www/barcode-app"
BACKUP_DIR="${DEPLOY_DIR}/backups"
NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Starting deployment of version $NEW_VERSION..."

# 1. 현재 상태 저장
CURRENT_CONTAINER=$(docker-compose -f "${DEPLOY_DIR}/docker-compose.yml" ps -q realtime-server)
CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' "$CURRENT_CONTAINER")

echo "Current image: $CURRENT_IMAGE"
echo "New version: $NEW_VERSION"

# 2. 새로운 이미지 풀
cd "$DEPLOY_DIR"
docker pull "barcode-app:${NEW_VERSION}"

# 3. 백업 생성
mkdir -p "$BACKUP_DIR"
docker-compose down --volumes > /dev/null 2>&1 || true
cp -r .next "backups/next-${NEW_VERSION}.bak" 2>/dev/null || true

# 4. 새 이미지로 업데이트
sed -i "s|image: barcode-app:.*|image: barcode-app:${NEW_VERSION}|g" docker-compose.yml

# 5. 새 컨테이너 시작
docker-compose up -d --no-deps --build realtime-server

# 6. 헬스체크 대기
echo "Waiting for service to become healthy..."
for i in {1..30}; do
  if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Service is healthy!"
    break
  fi
  echo "Attempt $i/30..."
  sleep 2
done

# 7. 배포 성공 확인
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
  echo "Deployment successful!"
  # 로그에 기록
  echo "$(date): Deployed version $NEW_VERSION" >> "$DEPLOY_DIR/deployment.log"
  exit 0
else
  echo "Deployment failed! Rollback..."
  # 8. 롤백
  git checkout docker-compose.yml
  docker-compose up -d --no-deps realtime-server
  exit 1
fi
```

### 롤백 전략

```bash
#!/bin/bash
# scripts/rollback.sh

DEPLOY_DIR="/var/www/barcode-app"
BACKUP_DIR="${DEPLOY_DIR}/backups"

# 마지막 백업 버전 찾기
LAST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)

if [ -z "$LAST_BACKUP" ]; then
  echo "No backup found!"
  exit 1
fi

echo "Rolling back to: $LAST_BACKUP"

cd "$DEPLOY_DIR"

# 백업 복원
cp -r "backups/$LAST_BACKUP/.next" .

# 이미지 태그 복원
docker-compose restart realtime-server

echo "Rollback complete!"
```

---

## 9. 환경별 설정 관리

### 환경 변수 구조

```
.env.production      # 프로덕션
.env.staging         # 스테이징
.env.development     # 개발
.env.local          # 로컬 (커밋하지 않음)
```

### 예제: 프로덕션 환경 설정

```env
# .env.production

# 실행 환경
NODE_ENV=production

# Next.js
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SOCKET_URL=wss://api.example.com

# Socket.IO
SOCKET_JWT_SECRET=your-production-secret-key-here-change-this
CORS_ORIGINS=https://app.example.com
LOG_LEVEL=warn

# 데이터베이스
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/barcode_prod

# 모니터링
SENTRY_DSN=https://...@sentry.io/...

# 이메일
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=xxxxxxxxxxxx
```

### 환경 변수 로딩

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  SOCKET_JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

---

## 10. 배포 체크리스트

### 배포 전 확인사항

- [ ] 모든 테스트 통과 (`npm run test:all`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 타입 체크 통과 (`npm run typecheck`)
- [ ] 환경 변수 확인 (`npm run env:check`)
- [ ] 보안 취약점 검사 (`npm audit`)
- [ ] 데이터베이스 마이그레이션 준비
- [ ] 롤백 계획 수립

### 배포 중 확인사항

- [ ] Docker 이미지 빌드 성공
- [ ] 레지스트리 푸시 확인
- [ ] 프로덕션 서버 SSH 접근 확인
- [ ] 헬스체크 엔드포인트 응답 확인
- [ ] 로그 모니터링 실시

### 배포 후 확인사항

- [ ] 서비스 정상 실행 확인
- [ ] 헬스체크 성공
- [ ] 로그에 에러 없음
- [ ] 성능 메트릭 정상
- [ ] 사용자 피드백 모니터링
- [ ] 배포 로그 기록

---

## 11. 성능 최적화 팁

### Next.js 성능 최적화

```typescript
// 1. 동적 임포트 (코드 분할)
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <div>Loading...</div> }
);

// 2. 이미지 최적화
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false}
  placeholder="blur"
  blurDataURL="data:image/..."
/>

// 3. 폰트 최적화
import { Inter } from '@next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

// 4. 스크립트 최적화
<Script
  src="https://example.com/analytics.js"
  strategy="afterInteractive"
/>
```

### 서버 성능 최적화

```typescript
// 1. 메모리 최적화
// Dockerfile에서 GC 활성화
// CMD ["node", "--expose-gc", "--max-old-space-size=1024", ...]

// 2. 연결 풀 설정
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 3. 캐싱 전략
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10분 TTL
```

### Nginx 성능 최적화

```nginx
# 1. 압축 최적화
gzip_comp_level 6;  # 1-9, 높을수록 느림
gzip_min_length 1000; # 1000바이트 이상만 압축

# 2. 캐시 설정
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
location / {
  proxy_cache my_cache;
  proxy_cache_valid 200 10m;
  add_header X-Cache-Status $upstream_cache_status;
}

# 3. 연결 최적화
keepalive_timeout 65;
keepalive_requests 100;
```

---

## 12. 트러블슈팅 가이드

### 일반적인 문제

#### 1. PM2 프로세스가 자주 재시작됨

```bash
# 원인 확인
pm2 logs realtime-server

# 메모리 누수 확인
pm2 info realtime-server | grep memory

# 해결: 메모리 제한 증가
# ecosystem.config.js에서 max_memory_restart 조정
max_memory_restart: '1G'  # 512M → 1G로 증가
```

#### 2. WebSocket 연결 끊김

```bash
# Nginx 설정 확인
# 다음 항목이 모두 있는지 확인:
# - proxy_set_header Upgrade $http_upgrade;
# - proxy_set_header Connection "upgrade";
# - proxy_buffering off;

# 타임아웃 설정 확인
proxy_connect_timeout 7d;
proxy_send_timeout 7d;
proxy_read_timeout 7d;
```

#### 3. Docker 이미지 빌드 실패

```bash
# 1. 빌드 캐시 초기화
docker build --no-cache -t barcode-app:latest .

# 2. 디스크 공간 확인
docker system df

# 3. 미사용 이미지/컨테이너 정리
docker system prune -a
```

#### 4. 높은 CPU 사용률

```bash
# 1. 실시간 모니터링
pm2 monit

# 2. 프로세스별 CPU 사용률 확인
ps aux | grep node

# 3. 단일 코어 문제 확인
# ecosystem.config.js에서 instances 설정 확인
instances: 'max'  # auto로 설정되어 있는지 확인

# 4. Node.js 플래그 최적화
# Dockerfile에서 --expose-gc 추가
CMD ["node", "--expose-gc", "--max-old-space-size=1024", ...]
```

### 배포 문제

#### 1. 배포 중 서비스 중단

```bash
# 무중단 배포 사용
pm2 reload ecosystem.config.js --env production

# 또는 docker-compose
docker-compose up -d --no-deps realtime-server
```

#### 2. 롤백 후 데이터 손실

```bash
# 데이터베이스 마이그레이션 실패 확인
npm run db:migrate:status

# 마이그레이션 되돌리기
npm run db:migrate:down
```

---

## 13. 보안 모범 사례

### 환경 변수 보안

```bash
# 1. 민감한 정보는 환경 변수로 관리
# .env.local은 .gitignore에 포함
echo ".env.local" >> .gitignore

# 2. 프로덕션 환경 변수는 안전한 저장소 사용
# GitHub Secrets, AWS Secrets Manager, HashiCorp Vault 등

# 3. 정기적으로 시크릿 로테이션
# - API 키 갱신
# - JWT 시크릿 변경
```

### Docker 보안

```bash
# 1. 이미지 취약점 스캔
docker scout cves barcode-app:latest

# 2. 최신 Node.js 버전 사용
FROM node:22-slim  # 최신 LTS

# 3. 비루트 사용자 실행
USER nodeuser  # root 사용 금지

# 4. 불필요한 패키지 제거
RUN apt-get purge -y curl wget  # 배포 후 불필요한 도구 제거
```

### Nginx 보안

```nginx
# 1. SSL/TLS 설정
ssl_protocols TLSv1.2 TLSv1.3;  # 구형 버전 비활성화
ssl_prefer_server_ciphers on;

# 2. 보안 헤더
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;

# 3. HSTS 활성화
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

---

## 14. 참고 자료

### 공식 문서

- [Next.js 배포 가이드](https://nextjs.org/docs/app/building-your-application/deploying)
- [PM2 문서](https://pm2.keymetrics.io/)
- [Docker 문서](https://docs.docker.com/)
- [Nginx 문서](https://nginx.org/en/docs/)

### 추가 도구

- [Turbo Repo](https://turbo.build/) - 모노레포 관리
- [PNPM](https://pnpm.io/) - 빠른 패키지 관리자
- [SWC](https://swc.rs/) - Rust 기반 번들러
- [Vercel CLI](https://vercel.com/docs/cli) - Vercel 배포

---

## 요약

웹 바코드 스캔 애플리케이션의 프로덕션 배포는 다음 구성요소로 이루어집니다:

1. **PM2**: 프로세스 관리 및 모니터링
2. **Docker**: 컨테이너화 및 이미지 관리
3. **Docker Compose**: 다중 서비스 오케스트레이션
4. **Nginx**: 리버스 프록시 및 TLS 종료
5. **GitHub Actions**: CI/CD 자동화
6. **모니터링**: 헬스체크 및 로그 수집
7. **보안**: 환경 변수 관리 및 접근 제어

이 가이드를 따르면 안정적이고 확장 가능하며 보안이 강화된 프로덕션 환경을 구축할 수 있습니다.
