# displayHandlers 구현 가이드

## 개요

`displayHandlers.ts`는 Socket.IO의 `/display` 네임스페이스에서 브라우저 확장 클라이언트의 연결, 인증, 및 세션 관리를 담당합니다.

## 파일 구조

```
server/src/events/displayHandlers.ts    // 핸들러 구현
server/src/events/__tests__/displayHandlers.test.ts             // 단위 테스트
server/src/events/__tests__/displayHandlers.integration.test.ts // 통합 테스트
server/src/examples/displayHandlersExample.ts                   // 사용 예제
```

## 핸들러 구성

### 1. `handleDisplayAuth(io, socket, payload)`

클라이언트의 JWT 토큰을 검증하고 세션을 초기화합니다.

**입력 파라미터:**
- `io`: Socket.IO 서버 인스턴스
- `socket`: 클라이언트 소켓
- `payload`: `{ token, deviceId, screenId }`

**동작:**
```
1. 입력값 검증 (token, deviceId, screenId 필수)
2. JWT 토큰 검증 (verifyDisplayToken 함수 사용)
3. 기존 연결 정리 (동일 deviceId의 이전 소켓 강제 해제)
4. socket.data에 인증 정보 저장
5. 클라이언트에 auth_success 이벤트 전송
6. 로깅
```

**성공 응답:**
```json
{ "auth_success": { "screenId": "screen-1" } }
```

**실패 응답:**
```json
{ "auth_failed": { "reason": "invalid_token" | "invalid_payload" } }
```

### 2. `handleDisplayDisconnect(io, socket)`

클라이언트 연결 해제 시 세션을 정리하고 로깅합니다.

**입력 파라미터:**
- `io`: Socket.IO 서버 인스턴스
- `socket`: 연결이 해제된 소켓

**동작:**
```
1. socket.data에서 deviceId, screenId 추출
2. 연결 해제 정보 로깅
3. 필요한 정리 작업 수행 (향후 확장)
```

### 3. `setupDisplayNamespace(io)`

/display 네임스페이스를 설정하고 이벤트 핸들러를 등록합니다.

**입력 파라미터:**
- `io`: Socket.IO 서버 인스턴스

**동작:**
```
1. /display 네임스페이스 생성
2. connection 이벤트에서:
   - 5초 인증 타임아웃 설정
   - auth 이벤트 리스너 등록 (타임아웃 clearTimeout)
   - disconnect 이벤트 리스너 등록
   - error 이벤트 리스너 등록
```

## 사용 방법

### 서버 초기화 (Next.js API Route 예제)

```typescript
// pages/api/socket.ts
import { Server } from 'socket.io';
import { setupDisplayNamespace } from '@/server/src/events/displayHandlers';

export default async function handler(req, res) {
  // Socket.IO 서버가 이미 초기화되었으면 재사용
  if (res.socket.server.io) {
    res.status(200).json({ message: 'Socket.IO 서버가 이미 초기화됨' });
    return;
  }

  // 새로운 Socket.IO 서버 생성
  const io = new Server(res.socket.server, {
    path: '/socket.io',
    cors: {
      origin: process.env.NODE_ENV === 'development' ? '*' : process.env.ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  // /display 네임스페이스 설정
  setupDisplayNamespace(io);

  // 다른 네임스페이스 설정...

  res.socket.server.io = io;
  res.status(200).json({ message: 'Socket.IO 서버 초기화 완료' });
}
```

### 클라이언트 연결 (브라우저 확장 예제)

```typescript
// popup.ts 또는 content-script.ts
import { io, Socket } from 'socket.io-client';

// Socket.IO 클라이언트 생성
const socket: Socket = io('http://localhost:3000/display', {
  transports: ['websocket'],
  reconnection: true,
});

// 연결 성공
socket.on('connect', () => {
  console.log('서버에 연결됨');

  // 인증 이벤트 전송
  socket.emit('auth', {
    token: 'JWT_TOKEN',
    deviceId: 'chrome-ext-device-123',
    screenId: 'screen-1',
  });
});

// 인증 성공
socket.on('auth_success', (data) => {
  console.log('인증 완료:', data.screenId);
  // 이제 원격 명령을 수신할 준비
});

// 인증 실패
socket.on('auth_failed', (data) => {
  console.error('인증 실패:', data.reason);
  socket.disconnect();
});

// 인증 타임아웃 (5초 내 인증하지 않음)
socket.on('auth_timeout', () => {
  console.error('인증 타임아웃: 5초 내 인증하지 못했습니다');
});

// 기기 교체 (다른 곳에서 같은 deviceId로 연결됨)
socket.on('device:replaced', (data) => {
  console.warn('기기가 다른 곳에서 연결됨:', data.reason);
  // 이전 연결이 자동으로 종료됨
});

// 연결 해제
socket.on('disconnect', () => {
  console.log('서버와의 연결 해제됨');
});

// 에러
socket.on('error', (error) => {
  console.error('소켓 에러:', error);
});
```

## JWT 토큰 구조

클라이언트가 전송하는 JWT 토큰의 페이로드 형식:

```typescript
{
  sub: string;           // 사용자 ID
  deviceId: string;      // 디바이스 고유 ID
  screenId: string;      // 화면 ID
  scopes: string[];      // 권한 배열 (예: 'display:screen-1', 'display:all')
  iat: number;           // 발급 시간 (Unix 타임스탐프)
  exp: number;           // 만료 시간 (Unix 타임스탐프)
}
```

## 이벤트 흐름

### 정상 흐름

```
Client                          Server
  |                               |
  |------ connect ------->|        |
  |                       |        |
  |<----- connected ------|        |
  |                               |
  |------ auth {data} ------>|    |
  |                          | 1. JWT 검증
  |                          | 2. 기존 세션 정리
  |                          | 3. socket.data 저장
  |<----- auth_success ------|   |
  |                               |
  |<----- remote:command ---------|
  |       (원격 명령 수신)          |
  |                               |
  |------ disconnect ----->|      |
  |                        | 로깅 및 정리
```

### 실패 흐름

```
Client                          Server
  |                               |
  |------ connect ------->|        |
  |                       |        |
  |<----- connected ------|        |
  |                               |
  |------ auth {data} ------>|    |
  |                          | JWT 검증 실패
  |<----- auth_failed --------|   |
  |                               |
  |<----- disconnect -------------|
```

### 타임아웃 흐름

```
Client                          Server
  |                               |
  |------ connect ------->|        |
  |                       |        |
  |<----- connected ------|        |
  |                    (5초 대기)   |
  |                               |
  |                        <--- 5초 경과 (미인증)
  |<----- auth_timeout -----|     |
  |                               |
  |<----- disconnect -------------|
```

## 로깅 메시지

### info 레벨
- `디스플레이 클라이언트 인증 성공`: 인증 완료
- `기존 기기 연결 정리`: 재연결 시 기존 연결 정리
- `디스플레이 클라이언트 연결 해제`: 연결 정상 해제
- `/display 네임스페이스 설정 완료`: 초기화 완료

### warn 레벨
- `인증 데이터 누락`: 필수 필드 부재
- `토큰 검증 실패`: JWT 검증 실패
- `인증 타임아웃`: 5초 내 인증하지 않음
- `인증되지 않은 클라이언트 연결 해제`: 미인증 상태에서 연결 해제

### error 레벨
- `디스플레이 소켓 에러`: 소켓 에러 발생

## 타입 정의

### DisplayClientPayload
```typescript
interface DisplayClientPayload {
  deviceId: string;    // 디바이스 고유 ID
  screenId: string;    // 화면 ID
  token: string;       // JWT 토큰
}
```

### DisplaySocketData
```typescript
interface DisplaySocketData {
  deviceId: string;        // 디바이스 고유 ID
  screenId: string;        // 화면 ID
  authenticatedAt: number; // 인증 완료 시간
}
```

### DisplayAuthClaims
```typescript
interface DisplayAuthClaims {
  sub: string;        // 사용자 ID
  deviceId: string;   // 디바이스 ID
  screenId: string;   // 화면 ID
  scopes: string[];   // 권한 배열
  iat: number;        // 발급 시간
  exp: number;        // 만료 시간
}
```

## 주요 특징

### 1. JWT 기반 인증
- jose 라이브러리를 사용한 토큰 검증
- 발급 시간(iat) 및 만료 시간(exp) 검증
- scopes 배열을 통한 세밀한 권한 제어

### 2. 5초 인증 타임아웃
- 연결 후 5초 내 인증하지 않으면 자동 해제
- 타임아웃 시 `auth_timeout` 이벤트 발송
- 인증 이벤트 수신 시 타임아웃 자동 취소

### 3. 재연결 처리
- 동일 deviceId로 재접속 시 기존 세션 자동 정리
- `device:replaced` 이벤트로 이전 클라이언트에 알림
- 새로운 연결이 우선순위를 가짐

### 4. 상세 로깅
- 모든 인증 시도 기록 (성공/실패)
- deviceId, screenId, IP, userId 포함
- 민감 정보는 마스킹 처리

## 테스트

### 단위 테스트 실행
```bash
npm test -- server/src/events/__tests__/displayHandlers.test.ts
```

### 통합 테스트 실행
```bash
npm test -- server/src/events/__tests__/displayHandlers.integration.test.ts
```

### 모든 테스트 실행
```bash
npm test -- server/src/events/__tests__/displayHandlers*
```

## 성능 최적화

### 재연결 최소화
- 클라이언트에서 연결 설정 시 `reconnectionDelay` 조정
- 토큰 만료 전 갱신 권장

### 메모리 관리
- disconnect 이벤트에서 타임아웃 정리
- 인증 완료 후 타임아웃 제거

### 확장성
- 다중 namespaces 지원
- Redis adapter로 다중 서버 구성 가능

## 문제 해결

### "auth_timeout" 이벤트 수신
**원인**: 클라이언트가 5초 내 인증하지 못함
**해결책**:
1. 네트워크 연결 확인
2. JWT 토큰 생성 및 전달 지연 확인
3. 서버 시간 동기화 확인

### "auth_failed" with "invalid_token"
**원인**: 토큰 검증 실패
**해결책**:
1. 토큰 만료 여부 확인
2. JWT_SECRET 일치 확인
3. scopes 배열에 필요한 권한 포함 확인

### "device:replaced" 이벤트 수신
**원인**: 같은 deviceId로 다른 곳에서 연결
**해결책**:
1. 정상 동작 (재연결 시 이전 연결 정리)
2. 기존 연결에서 대사용자에게 알림 표시
3. UI에서 재연결 옵션 제공

## 참고 자료

- Socket.IO 공식 문서: https://socket.io/docs/
- JWT (JSON Web Token): https://jwt.io/
- TypeScript 타입: @types/node, @types/socket.io
