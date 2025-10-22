# Socket.IO 실시간 통신 서버

스마트폰 웹앱과 세컨드 모니터(브라우저) 간의 실시간 양방향 통신을 제공하는 Socket.IO 기반 Node.js 서버입니다.

## 기능

- **실시간 양방향 통신**: Socket.IO를 통한 모바일과 모니터 간 통신
- **JWT 기반 인증**: 안전한 토큰 검증
- **세션 관리**: 룸 기반의 세션 관리
- **이벤트 라우팅**: 클라이언트 역할별 이벤트 처리
- **헬스체크 & 모니터링**: 서버 상태 모니터링 엔드포인트
- **레이트 리밋**: DDoS 방지를 위한 요청 제한
- **보안**: Helmet, CORS 설정

## 설치

1. **환경변수 설정**

```bash
cp server/.env.example server/.env
```

`.env` 파일을 열어 다음 항목을 설정하세요:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000,https://example.com
SOCKET_JWT_SECRET=your-secret-key-min-8-chars
```

> **중요**: 프로덕션 환경에서는 `SOCKET_JWT_SECRET`을 안전한 값으로 변경해야 합니다.

2. **서버 실행**

```bash
# 개발 모드 (핫 리로딩)
npm run server:dev

# 프로덕션 모드
npm run server:build
npm run server:start

# 또는 직접 실행
npm run server
```

## 아키텍처

### 디렉토리 구조

```
server/
├── src/
│   ├── middleware/          # 인증 미들웨어
│   ├── events/              # 이벤트 핸들러
│   ├── services/            # 비즈니스 로직 (세션 관리)
│   ├── types/               # TypeScript 타입 정의
│   ├── utils/               # 설정, 로깅 유틸리티
│   ├── __tests__/           # 통합 테스트
│   ├── middleware/__tests__/ # 미들웨어 단위 테스트
│   └── services/__tests__/  # 서비스 단위 테스트
├── .env.example             # 환경변수 예제
├── tsconfig.json            # TypeScript 설정
└── README.md               # 이 파일
```

### 통신 흐름

```
클라이언트1 (모바일)          클라이언트2 (모니터)
     |                            |
     |--- JWT 토큰으로 연결 ------|
     |                            |
     |--- registerClient -------> Socket.IO 서버
     |                            |
     |--- joinSession ----------> Socket.IO 서버
     |                            |
     |--- scanOrder (이벤트) -------|
     |                            |
     |<---- navigate (응답) ------|
```

## 이벤트 명세

### 클라이언트에서 서버로

#### `registerClient`
클라이언트 역할을 등록합니다.

```typescript
socket.emit('registerClient', { role: 'mobile' | 'monitor' })

// 응답
socket.on('registered', (data) => {
  // { success: true, socketId: string }
})
```

#### `joinSession`
세션(룸)에 참여합니다.

```typescript
socket.emit('joinSession', { sessionId: string })

// 응답
socket.on('joinedSession', (data) => {
  // { sessionId: string, status: { isActive, hasMobile, hasMonitor } }
})
```

#### `scanOrder`
바코드 스캔 데이터를 전송합니다.

```typescript
socket.emit('scanOrder', {
  sessionId: string,
  orderNo: string,
  ts: number,
  nonce?: string
})
```

#### `heartbeat`
연결 상태 확인 신호를 전송합니다.

```typescript
socket.emit('heartbeat')

// 응답
socket.on('heartbeat:ack', (timestamp: number) => {
  // 서버의 현재 시간
})
```

### 서버에서 클라이언트로

#### `navigate`
주문 네비게이션 이벤트 (스캔된 주문 정보 브로드캐스트)

```typescript
socket.on('navigate', (data) => {
  // {
  //   orderNo: string,
  //   ts: number,
  //   nonce?: string,
  //   from: 'mobile' | 'monitor',
  //   fromSocketId: string
  // }
})
```

#### `clientJoined`
새 클라이언트가 세션에 참여했을 때

```typescript
socket.on('clientJoined', (data) => {
  // {
  //   socketId: string,
  //   role: 'mobile' | 'monitor',
  //   status: { isActive, hasMobile, hasMonitor }
  // }
})
```

#### `clientLeft`
클라이언트가 세션을 떠났을 때

```typescript
socket.on('clientLeft', (data) => {
  // {
  //   socketId: string,
  //   status: { isActive, hasMobile, hasMonitor }
  // }
})
```

#### `error`
에러 발생

```typescript
socket.on('error', (data) => {
  // { message: string }
})
```

## JWT 토큰 생성

클라이언트 연결 시 JWT 토큰이 필요합니다. 서버에서 토큰을 발급하는 예:

```typescript
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.SOCKET_JWT_SECRET || 'dev-secret-key';

// 토큰 발급
const token = jwt.sign(
  {
    sub: 'user-123',        // 사용자 ID
    role: 'mobile'          // 'mobile' | 'monitor'
  },
  jwtSecret,
  { expiresIn: '24h' }
);

// 클라이언트로 전송
```

클라이언트 연결:

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt-token-here'
  }
});
```

## REST API 엔드포인트

### 헬스체크

```bash
GET /health
```

응답:

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2025-10-22T03:00:00.000Z",
  "sessions": {
    "total": 5,
    "active": 3
  }
}
```

### 상태 모니터링

```bash
GET /status
```

응답:

```json
{
  "status": "running",
  "timestamp": "2025-10-22T03:00:00.000Z",
  "uptime": 1234.56,
  "memory": {
    "rss": 67108864,
    "heapTotal": 33554432,
    "heapUsed": 16777216
  },
  "sessions": {
    "total": 5,
    "active": 3,
    "details": [
      {
        "sessionId": "session-123",
        "hasMobile": true,
        "hasMonitor": true,
        "createdAt": "2025-10-22T02:50:00.000Z"
      }
    ]
  }
}
```

## 테스트

### 단위 테스트 실행

```bash
npm run test:server
```

### 단위 테스트 감시 모드

```bash
npm run test:server:watch
```

### 통합 테스트

통합 테스트는 `server/src/__tests__/integration.test.ts`에 포함되어 있습니다.

테스트 내용:
- JWT 토큰 검증
- 클라이언트 등록 및 세션 참여
- 이벤트 브로드캐스트
- 하트비트 통신

## 보안 고려사항

1. **HTTPS 필수**: 프로덕션 환경에서는 Nginx 또는 다른 프록시를 통해 HTTPS로 제공하세요.

2. **JWT 비밀키**: 환경변수에서 안전하게 관리하고 정기적으로 변경하세요.

3. **CORS 설정**: `CORS_ORIGINS`을 신뢰할 수 있는 도메인만으로 제한하세요.

4. **레이트 리밋**: 기본값은 15분에 100요청입니다. 필요에 따라 조정하세요.

5. **토큰 만료**: JWT 토큰에 만료 시간을 설정하세요.

## 성능 최적화

### Redis 어댑터 (선택사항)

분산 서버 환경에서 여러 인스턴스 간에 메시지를 공유하려면 Redis를 사용하세요:

```bash
npm install socket.io-redis-adapter redis
```

그리고 `server/src/index.ts`에서:

```typescript
import { createAdapter } from 'socket.io-redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 문제 해결

### 연결 실패

1. 포트가 올바른지 확인하세요
2. CORS 설정을 확인하세요
3. JWT 토큰이 유효한지 확인하세요
4. 로그 레벨을 `debug`로 설정해 상세 로그를 확인하세요

### 메모리 누수

세션 정리는 10분마다 자동으로 실행됩니다. 30분 이상 비활성 세션은 자동 삭제됩니다.

## 배포

### Docker로 배포

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server ./server

EXPOSE 3000

CMD ["npm", "run", "server"]
```

### 환경변수 설정

배포 환경에서 다음 환경변수를 설정하세요:

```
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://app.example.com,https://monitor.example.com
SOCKET_JWT_SECRET=<strong-secret-key>
LOG_LEVEL=info
REDIS_URL=redis://redis-host:6379 (선택사항)
```

## 참고 자료

- [Socket.IO 공식 문서](https://socket.io/docs/)
- [JWT 소개](https://jwt.io/introduction)
- [Express 보안 가이드](https://expressjs.com/en/advanced/best-practice-security.html)

## 라이선스

MIT
