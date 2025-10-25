# Vooster 로컬 개발 환경 가이드

바코드 스캔으로 원격 디스플레이를 제어하는 시스템의 로컬 개발 환경 설정 가이드입니다.

---

## 📚 목차

1. [시스템 구조](#시스템-구조)
2. [사전 요구사항](#사전-요구사항)
3. [빠른 시작](#빠른-시작)
4. [개발 워크플로우](#개발-워크플로우)
5. [문제 해결](#문제-해결)
6. [테스트](#테스트)

---

## 시스템 구조

```
┌─────────────────────────────────────────────────┐
│         호스트 (macOS/Windows/Linux)            │
├────────────────────┬────────────────────────────┤
│   Next.js          │  Docker Compose            │
│   (포트: 3000)     ├─────────────┬──────────────┤
│   npm run dev      │ Socket.IO   │   Redis      │
│                    │ (포트: 3001)│  (6379)      │
└────────────────────┴─────────────┴──────────────┘
       ↑                    ↑             ↑
       │                    │             │
   브라우저          Chrome Extension  캐시/메시지
```

### 주요 컴포넌트

| 컴포넌트 | 역할 | 포트 | 실행 방식 |
|----------|------|------|----------|
| **Next.js 앱** | 프론트엔드 UI 서버 | 3000 | 호스트 (npm run dev) |
| **Socket.IO 서버** | 실시간 통신 서버 | 3001 | Docker (socketio 서비스) |
| **Redis** | 메시지 브로커 / 캐시 | 6379 | Docker (redis 서비스) |
| **Chrome Extension** | 원격 디스플레이 제어 | - | 호스트 (빌드 후 로드) |

---

## 사전 요구사항

### 필수 소프트웨어

- **Node.js**: v20 이상 ([다운로드](https://nodejs.org/))
- **npm**: Node.js와 함께 설치됨
- **Docker Desktop**: ([다운로드](https://www.docker.com/products/docker-desktop/))
- **Chrome 브라우저**: ([다운로드](https://www.google.com/chrome/))

### 설치 확인

```bash
node --version    # v20.0.0 이상
npm --version     # 9.0.0 이상
docker --version  # 20.10.0 이상
docker-compose --version  # 2.0.0 이상
```

---

## 빠른 시작

### 1. 리포지토리 클론 및 의존성 설치

```bash
# 리포지토리 클론
git clone <repository-url>
cd vooster

# 루트 의존성 설치 (Next.js + Socket.IO 공통)
npm install

# Extension 의존성 설치
cd extension
npm install
cd ..
```

### 2. 환경변수 설정

#### 2.1 Next.js 환경변수

```bash
# 루트 디렉토리에서 템플릿 복사
cp .env.local.example .env.local

# .env.local 파일을 편집기로 열어 설정
# - NEXT_PUBLIC_SUPABASE_URL: Supabase 프로젝트 URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase Anon Key
# - NEXT_PUBLIC_SOCKET_IO_URL: http://localhost:3001 (Docker Compose 사용 시)
```

#### 2.2 Socket.IO 서버 환경변수

```bash
# server/.env.example 복사
cp server/.env.example server/.env

# server/.env 파일 편집
# - SOCKET_JWT_SECRET: 강력한 시크릿 키로 변경 (최소 32자)
# - CORS_ORIGINS: 필요한 origin 추가
```

### 3. Docker Compose 실행 (Socket.IO + Redis)

```bash
# Docker Compose 서비스 시작 (백그라운드)
docker-compose up -d

# 로그 확인 (선택)
docker-compose logs -f socketio
```

**서비스 확인:**
- Socket.IO 서버: http://localhost:3001/health
- Redis: `docker exec vooster-redis redis-cli ping` → `PONG`

### 4. Next.js 앱 실행 (호스트)

```bash
# 새 터미널에서 실행
npm run dev
```

**앱 접속:**
- 메인 앱: http://localhost:3000
- API 헬스체크: http://localhost:3001/health (Socket.IO)

### 5. Chrome Extension 로드

```bash
# Extension 빌드
cd extension
npm run build

# Chrome 브라우저에서:
# 1. chrome://extensions/ 접속
# 2. 우측 상단 "개발자 모드" 활성화
# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭
# 4. extension/ 폴더 선택
# 5. "Vooster Display Launcher" 확장이 로드됨
```

### 6. 페어링 테스트

```bash
# 1. Extension 아이콘 클릭 → "확장 프로그램 옵션" 클릭
# 2. 디스플레이 이름 입력 (예: "테스트-디스플레이")
# 3. "페어링 시작" 버튼 클릭
# 4. QR 코드가 표시되는지 확인
# 5. (모바일 앱 없이도) 폴링이 시작되는지 확인
```

---

## 개발 워크플로우

### Hot Reload (자동 재시작)

#### Next.js (프론트엔드)
- **파일 변경 감지**: `src/` 디렉토리 내 모든 파일
- **자동 재로드**: HMR (Hot Module Replacement)
- **브라우저 자동 새로고침**: 변경 즉시 반영

#### Socket.IO 서버 (백엔드)
- **파일 변경 감지**: `server/src/` 디렉토리
- **자동 재시작**: tsx --watch
- **재시작 시간**: 약 2-3초

#### Chrome Extension
- **자동 재로드 없음**: 수동 빌드 및 재로드 필요
- **빌드 명령**: `cd extension && npm run build`
- **재로드 방법**: chrome://extensions/ → 확장 재로드 버튼 클릭

### 로그 확인

#### Socket.IO 서버 로그
```bash
# 실시간 로그 스트림
docker-compose logs -f socketio

# 최근 100줄
docker-compose logs --tail=100 socketio

# 타임스탬프 포함
docker-compose logs -f --timestamps socketio
```

#### Redis 로그
```bash
docker-compose logs -f redis
```

#### Next.js 로그
- 터미널에서 `npm run dev` 실행 중인 콘솔 확인

#### Chrome Extension 로그
```
# 1. chrome://extensions/ 접속
# 2. "Vooster Display Launcher" 확장 찾기
# 3. "Service Worker" 옆 "service worker" 링크 클릭
# 4. DevTools 콘솔에서 로그 확인
```

### 서비스 관리

#### 재시작
```bash
# Socket.IO 서버만 재시작
docker-compose restart socketio

# 전체 재시작
docker-compose restart

# 컨테이너 재빌드 (Dockerfile 변경 시)
docker-compose up -d --build socketio
```

#### 중지
```bash
# 서비스 중지 (컨테이너 유지)
docker-compose stop

# 서비스 중지 및 컨테이너 삭제
docker-compose down

# 볼륨까지 삭제 (Redis 데이터 포함)
docker-compose down -v
```

#### 상태 확인
```bash
# 실행 중인 컨테이너 확인
docker-compose ps

# 서비스 상태 상세 정보
docker-compose ps --format json

# 특정 서비스 상태
docker-compose ps socketio
```

---

## 문제 해결

### Q1: 포트 3001이 이미 사용 중

**증상:**
```
Error: bind: address already in use
```

**해결:**
```bash
# 포트 사용 중인 프로세스 확인
lsof -ti:3001

# 프로세스 종료
lsof -ti:3001 | xargs kill -9

# 또는 docker-compose.yml에서 포트 변경
# ports:
#   - "3002:3000"  # 외부 3002로 변경
```

### Q2: WebSocket 연결 실패

**증상:**
```
WebSocket connection failed
CORS error
```

**원인**: CORS 설정 또는 WS_URL 불일치

**해결:**
```bash
# 1. server/.env 파일 확인
cat server/.env
# CORS_ORIGINS에 http://localhost:3000, chrome-extension://* 포함되어야 함

# 2. .env.local 파일 확인
cat .env.local
# NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001 확인

# 3. Socket.IO 서버 재시작
docker-compose restart socketio

# 4. 서버 로그에서 CORS 원본 확인
docker-compose logs socketio | grep "CORS 원본"
```

### Q3: Extension에서 QR 코드 안 보임

**증상:**
```
Canvas가 DOM에 없음
페어링 실패 메시지
```

**원인**: API 응답 필드명 불일치 또는 Extension 빌드 문제

**해결:**
```bash
# 1. Extension 재빌드
cd extension
npm run build

# 2. Chrome 확장 재로드
# chrome://extensions/ → "Vooster Display Launcher" → 재로드 버튼

# 3. 서버 로그 확인 (QR 생성 성공 여부)
docker-compose logs socketio | grep "QR 생성"

# 4. 브라우저 DevTools → Network 탭에서 /api/pair/qr 응답 확인
# 응답에 pairingToken, expiresAt 필드가 있어야 함
```

### Q4: Redis 연결 실패

**증상:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**해결:**
```bash
# 1. Redis 컨테이너 상태 확인
docker-compose ps redis

# 2. Redis 헬스체크
docker exec vooster-redis redis-cli ping
# 응답: PONG

# 3. Redis 재시작
docker-compose restart redis

# 4. Redis 로그 확인
docker-compose logs redis
```

### Q5: Hot Reload가 작동 안 함

**증상:**
```
파일 변경했는데 서버가 재시작되지 않음
```

**해결:**
```bash
# 1. 볼륨 마운트 확인
docker-compose exec socketio ls -la /app/server/src
# 파일 목록이 호스트와 동일해야 함

# 2. 컨테이너 재빌드
docker-compose down
docker-compose up -d --build

# 3. 볼륨 삭제 후 재생성
docker-compose down -v
docker-compose up -d
```

### Q6: npm install 후 Docker 오류

**증상:**
```
Error: Cannot find module 'better-sqlite3'
```

**원인**: 호스트(macOS)와 컨테이너(Linux)의 네이티브 바이너리 차이

**해결:**
```bash
# 컨테이너 내에서 npm install 실행
docker-compose exec socketio npm install

# 또는 컨테이너 재빌드
docker-compose up -d --build socketio
```

---

## 테스트

### 1. 환경 구성 테스트

```bash
# Docker Compose 실행
docker-compose up -d

# 모든 서비스 정상 시작 확인
docker-compose ps
# 출력: socketio (healthy), redis (healthy)

# 헬스체크 엔드포인트 호출
curl http://localhost:3001/health
# 응답: {"status":"ok","uptime":123,"timestamp":"..."}
```

### 2. Hot Reload 테스트

```bash
# 1. Socket.IO 서버 로그 모니터링
docker-compose logs -f socketio

# 2. 서버 파일 수정
# server/src/index.ts 파일을 열어 주석 추가

# 3. 자동 재시작 확인
# 로그에 "서버 시작" 메시지가 다시 나타나야 함
```

### 3. 통합 테스트 (E2E 플로우)

```bash
# E2E 테스트 스크립트 실행
node test-e2e-full-flow.mjs

# 예상 결과:
# ✅ Step 1: 디스플레이 등록 성공
# ✅ Step 2: QR 생성 성공
# ✅ Step 3: 페어링 승인 성공 (모의)
# ✅ Step 4: WebSocket 연결 확인
# ✅ Step 5: 트리거 전송 성공
```

### 4. Chrome Extension 테스트

```bash
# 1. Extension 빌드
cd extension && npm run build

# 2. Chrome 확장 로드 (위 빠른 시작 참고)

# 3. Options 페이지 테스트
# - Extension 아이콘 클릭 → "확장 프로그램 옵션"
# - 디스플레이 이름 입력
# - "페어링 시작" 클릭
# - QR 코드 표시 확인
```

### 5. 단위 테스트

```bash
# 서버 단위 테스트
npm run test:server

# 프론트엔드 단위 테스트
npm run test

# 커버리지 리포트
npm run test:coverage
```

---

## 유용한 명령어

### Docker Compose

```bash
# 서비스 시작 (포그라운드)
docker-compose up

# 서비스 시작 (백그라운드)
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d socketio

# 로그 스트리밍
docker-compose logs -f

# 컨테이너 셸 접속
docker-compose exec socketio sh

# 컨테이너 내부 파일 확인
docker-compose exec socketio ls -la /app/server/src
```

### 개발 스크립트

```bash
# Next.js 개발 서버
npm run dev

# Socket.IO 서버 (Docker 없이 로컬)
npm run server:dev

# TypeScript 타입 체크
npm run typecheck

# Extension 빌드
cd extension && npm run build

# Extension 타입 체크
cd extension && npm run typecheck
```

---

## 환경 정리

### 일시 중지
```bash
# 컨테이너만 중지 (데이터 유지)
docker-compose stop
```

### 완전 삭제
```bash
# 컨테이너 + 네트워크 삭제 (볼륨 유지)
docker-compose down

# 컨테이너 + 네트워크 + 볼륨 모두 삭제
docker-compose down -v

# 이미지까지 삭제
docker-compose down --rmi all
```

---

## 디버깅 팁

### 1. 네트워크 연결 확인

```bash
# Socket.IO 서버로 ping
curl http://localhost:3001/health

# Redis로 ping
docker exec vooster-redis redis-cli ping

# Docker 네트워크 확인
docker network ls
docker network inspect vooster_network
```

### 2. 환경변수 확인

```bash
# 컨테이너 내부 환경변수 출력
docker-compose exec socketio env | grep SOCKET

# Next.js 환경변수 (빌드 시 주입됨)
npm run build && cat .next/cache/env.json
```

### 3. 로그 레벨 조정

```bash
# server/.env 파일 수정
LOG_LEVEL=debug

# 서비스 재시작
docker-compose restart socketio

# 디버그 로그 확인
docker-compose logs -f socketio
```

---

## 참고 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Socket.IO 공식 문서](https://socket.io/docs/v4/)
- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)

---

## 문의 및 지원

문제 발생 시:
1. 위 문제 해결 섹션 참고
2. 로그 확인 (`docker-compose logs -f`)
3. GitHub Issues에 로그와 함께 문의

---

**최종 업데이트**: 2025-10-25
