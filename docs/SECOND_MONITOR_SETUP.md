# 세컨드 모니터 설치 및 설정 가이드

> 별도 프로그램 설치 없이 웹 브라우저만으로 세컨드 모니터를 사용할 수 있습니다

**작성일**: 2025-10-22
**프로젝트**: Vooster 바코드 주문 조회

---

## 📋 목차

1. [시스템 요구사항](#1-시스템-요구사항)
2. [빠른 시작 (5분)](#2-빠른-시작-5분)
3. [상세 설정 가이드](#3-상세-설정-가이드)
4. [사용 방법](#4-사용-방법)
5. [문제 해결](#5-문제-해결)
6. [고급 설정](#6-고급-설정)

---

## 1. 시스템 요구사항

### 하드웨어
- **세컨드 모니터**: 일반 모니터 또는 태블릿/PC (추가 디바이스)
- **스캔 디바이스**: 스마트폰 또는 태블릿 (바코드 스캔용)
- **연결**: 같은 네트워크 (Wi-Fi 또는 LAN)

### 소프트웨어
- **브라우저**: Chrome, Edge, Safari (최신 버전)
- **서버**: Node.js 실시간 서버 실행 중
- **설치 필요 없음**: 모든 기능이 웹 기반

### 네트워크
```
세컨드 모니터 PC ─┐
                  ├─ 같은 Wi-Fi/LAN ─ Socket.IO 서버
스캔 스마트폰 ────┘
```

---

## 2. 빠른 시작 (5분)

### Step 1: 서버 시작

```bash
# 개발 환경
npm run server:dev

# 프로덕션 환경
npm run server:start
```

**서버 주소 확인**:
```
Socket.IO 서버 실행 중: http://localhost:3001
또는
Socket.IO 서버 실행 중: http://192.168.1.100:3001
```

### Step 2: 세컨드 모니터 열기

#### 방법 A: 로컬 개발
```bash
# 브라우저에서 접속
http://localhost:3000/monitor
```

#### 방법 B: 프로덕션 배포
```bash
# 브라우저에서 접속
https://your-domain.com/monitor
```

### Step 3: QR 코드 스캔

1. **세컨드 모니터 화면**에 QR 코드가 표시됨
2. **스마트폰**으로 QR 코드를 스캔
3. **자동 페어링** 완료! (3초 이내)

### Step 4: 바코드 스캔 시작

- 스마트폰에서 바코드 스캔
- 세컨드 모니터에 **자동으로 제작의뢰서 표시**

---

## 3. 상세 설정 가이드

### 3.1 환경 변수 설정

`.env.local` 파일 생성:

```bash
# 1. Socket.IO 서버 URL (필수)
NEXT_PUBLIC_SOCKET_IO_URL=http://192.168.1.100:3001

# 2. 인증 토큰 (필수)
NEXT_PUBLIC_SOCKET_IO_TOKEN=your-secret-token-here

# 3. 앱 베이스 URL (필수)
NEXT_PUBLIC_APP_BASE_URL=http://192.168.1.100:3000

# 4. 제작의뢰서 URL 템플릿 (옵션)
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=https://intra.yourcompany.com/orders/{orderNo}/workorder
```

#### 네트워크 설정별 예시

**같은 PC에서 테스트**:
```env
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
```

**로컬 네트워크 (Wi-Fi)**:
```bash
# 1. PC의 IP 주소 확인
# Windows
ipconfig
# macOS/Linux
ifconfig

# 2. .env.local 설정
NEXT_PUBLIC_SOCKET_IO_URL=http://192.168.1.100:3001
NEXT_PUBLIC_APP_BASE_URL=http://192.168.1.100:3000
```

**프로덕션 환경**:
```env
NEXT_PUBLIC_SOCKET_IO_URL=https://api.yourcompany.com
NEXT_PUBLIC_APP_BASE_URL=https://app.yourcompany.com
```

### 3.2 서버 설정 (server/.env)

```bash
# JWT 시크릿 키 (중요!)
JWT_SECRET=your-jwt-secret-key-here

# 서버 포트
PORT=3001

# CORS 허용 도메인
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000

# 세션 타임아웃 (초)
SESSION_TIMEOUT=900
```

### 3.3 브라우저 설정

#### Chrome/Edge (권장)
1. **팝업 허용**
   - 설정 → 개인정보 및 보안 → 사이트 설정 → 팝업 및 리디렉션
   - 세컨드 모니터 URL을 허용 목록에 추가

2. **다중 모니터 지원**
   - 자동으로 Window Management API 사용

#### Safari
1. **팝업 허용**
   - Safari → 환경설정 → 웹사이트 → 팝업 윈도우
   - 세컨드 모니터 도메인 허용

2. **Cross-Origin 쿠키 허용**
   - 개인정보 보호 → "모든 쿠키 차단" 해제

---

## 4. 사용 방법

### 4.1 일반 워크플로우

```
1. [세컨드 모니터] 브라우저로 /monitor 접속
   → QR 코드 표시됨

2. [스마트폰] QR 코드 스캔
   → 앱이 열림
   → 자동 페어링 (3초)

3. [세컨드 모니터] "페어링 완료됨" 표시

4. [스마트폰] 바코드 스캔
   → 주문 정보 표시

5. [세컨드 모니터] 제작의뢰서 자동 표시
   → 팝업 창 또는 세컨드 모니터에 표시

6. [작업자] 제작의뢰서 확인

7. 반복 (다음 바코드 스캔)
```

### 4.2 페이징 상태 확인

세컨드 모니터 화면에 표시되는 정보:

```
┌─────────────────────────────────┐
│     세컨드 모니터                │
│                                 │
│  연결 상태: ✅ 연결됨             │
│  페어링 상태: ✅ 완료됨           │
│  세션 ID: ABC12345               │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │      QR 코드            │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  💡 스마트폰으로 QR 스캔         │
└─────────────────────────────────┘
```

### 4.3 실제 사용 예시

**시나리오**: 인쇄 공장에서 100개 주문 처리

```
[작업자 김씨]
09:00 - 세컨드 모니터 켜기
      → http://192.168.1.100:3000/monitor 접속
      → QR 코드 표시됨

09:01 - 스마트폰으로 QR 스캔
      → 페어링 완료

09:02 - 첫 번째 제품 바코드 스캔
      → 세컨드 모니터에 제작의뢰서 표시
      → 이미지 확인 후 작업 시작

09:05 - 두 번째 제품 바코드 스캔
      → 세컨드 모니터 자동 업데이트
      → 이전 작업 기록 유지

...반복...

12:00 - 100개 처리 완료
      → 평균 0.5초/스캔 (90% 개선)
```

---

## 5. 문제 해결

### 5.1 연결 안 됨

**증상**: "연결 실패" 또는 "서버에 연결할 수 없습니다"

**해결책**:
```bash
1. 서버가 실행 중인지 확인
   → npm run server:dev 또는 pm2 status

2. 방화벽 확인
   → 포트 3001이 열려있는지 확인
   → Windows: netstat -an | find "3001"
   → macOS: lsof -i :3001

3. 네트워크 확인
   → 스마트폰과 PC가 같은 Wi-Fi에 연결되었는지 확인
   → ping 192.168.1.100

4. CORS 설정 확인
   → server/.env의 CORS_ORIGINS 확인
```

### 5.2 QR 코드 표시 안 됨

**증상**: QR 코드가 화면에 나타나지 않음

**해결책**:
```bash
1. 브라우저 콘솔 확인 (F12)
   → 에러 메시지 확인

2. 환경 변수 확인
   → NEXT_PUBLIC_SOCKET_IO_TOKEN이 설정되었는지 확인

3. 브라우저 캐시 삭제
   → Ctrl+Shift+Del (캐시 삭제)
   → 페이지 새로고침 (Ctrl+F5)

4. 서버 로그 확인
   → pm2 logs 또는 콘솔 출력 확인
```

### 5.3 페어링 실패

**증상**: QR 스캔 후 "페어링 실패" 또는 계속 로딩

**해결책**:
```bash
1. QR 코드 유효 시간 확인
   → QR 코드는 10분 후 만료됨
   → 페이지 새로고침해서 새 QR 생성

2. 토큰 확인
   → 스마트폰과 세컨드 모니터의 토큰이 동일한지 확인

3. 세션 ID 충돌
   → 다른 디바이스가 같은 세션을 사용 중인지 확인
   → 페이지 새로고침해서 새 세션 생성

4. 서버 재시작
   → pm2 restart all
```

### 5.4 팝업 안 열림

**증상**: 바코드 스캔 후 제작의뢰서 창이 안 열림

**해결책**:
```bash
1. 팝업 차단 해제
   Chrome/Edge:
   → 주소창 오른쪽 차단 아이콘 클릭
   → "항상 팝업 및 리디렉션 허용" 선택

   Safari:
   → Safari → 환경설정 → 웹사이트 → 팝업
   → 해당 도메인 "허용"으로 변경

2. 브라우저 권한 확인
   → 사이트 설정에서 팝업 권한 확인

3. 대체 방법: 같은 탭에서 열기
   → MonitorController에서 popupMode={false} 설정
```

### 5.5 멀티 모니터 미작동

**증상**: 두 번째 모니터에 창이 안 열림

**해결책**:
```bash
1. 브라우저 확인
   → Chrome/Edge 사용 (Window Management API 지원)
   → Safari는 지원 안 함

2. 권한 요청 확인
   → 주소창의 "모니터 접근" 권한 허용

3. Fallback 동작 확인
   → 권한이 없으면 팝업 창으로 대체됨
   → 팝업 창을 수동으로 두 번째 모니터로 이동

4. 브라우저 플래그 확인 (고급)
   chrome://flags/#enable-experimental-web-platform-features
   → Enabled로 설정
```

---

## 6. 고급 설정

### 6.1 커스텀 제작의뢰서 URL

```env
# 방법 1: 환경 변수
NEXT_PUBLIC_ORDER_FORM_URL_TEMPLATE=https://erp.company.com/orders/{orderNo}

# 방법 2: 코드 수정
# src/app/monitor/page.tsx
const orderFormUrlTemplate = (orderNo: string) => {
  return `https://custom-system.com/work/${orderNo}?view=full`;
};
```

### 6.2 여러 세컨드 모니터 동시 사용

```bash
# 각 모니터마다 별도 세션 사용
Monitor 1: http://localhost:3000/monitor
Monitor 2: http://localhost:3000/monitor

# 각각 다른 QR 코드가 생성됨
# 각 스마트폰이 원하는 모니터와 페어링
```

### 6.3 자동 재연결 설정

MonitorController props:

```typescript
<MonitorController
  serverUrl={serverUrl}
  token={token}
  reconnect={true}              // 자동 재연결 활성화
  reconnectAttempts={5}          // 재시도 횟수
  reconnectDelay={2000}          // 재시도 간격 (ms)
/>
```

### 6.4 보안 강화

```env
# 1. JWT 시크릿 강화
JWT_SECRET=$(openssl rand -base64 32)

# 2. HTTPS 사용
NEXT_PUBLIC_SOCKET_IO_URL=https://secure.company.com

# 3. 토큰 로테이션 (서버 코드 수정 필요)
# server/src/middleware/auth.ts에서 토큰 만료 시간 설정
```

### 6.5 로깅 및 모니터링

```bash
# PM2 로그 확인
pm2 logs realtime-server

# 실시간 모니터링
pm2 monit

# 세션 통계 API
curl http://localhost:3001/api/sessions/stats

# 출력 예시:
{
  "totalSessions": 5,
  "activePairings": 3,
  "queuedEvents": 2
}
```

---

## 7. 체크리스트

### 설치 전
- [ ] Node.js 설치 확인 (`node -v`)
- [ ] 프로젝트 다운로드 및 `npm install`
- [ ] 환경 변수 설정 (`.env.local`)
- [ ] 서버 환경 변수 설정 (`server/.env`)

### 설치 후
- [ ] 서버 시작 (`npm run server:dev`)
- [ ] 웹앱 시작 (`npm run dev`)
- [ ] 방화벽 포트 열기 (3000, 3001)
- [ ] 같은 네트워크 연결 확인

### 사용 전
- [ ] 브라우저 팝업 허용
- [ ] 세컨드 모니터 연결 (물리적)
- [ ] 세컨드 모니터 `/monitor` 접속
- [ ] QR 코드 표시 확인

### 사용 중
- [ ] QR 스캔 및 페어링
- [ ] 바코드 스캔 테스트
- [ ] 제작의뢰서 표시 확인
- [ ] 연속 스캔 테스트 (10회)

---

## 8. FAQ

### Q1: 꼭 세컨드 모니터가 필요한가요?
**A**: 아니요. 같은 모니터에 팝업 창으로도 사용 가능합니다. 세컨드 모니터는 **작업 효율 향상**을 위한 선택사항입니다.

### Q2: 태블릿을 세컨드 모니터로 사용할 수 있나요?
**A**: 네! 태블릿 브라우저에서 `/monitor` 접속하면 됩니다. iPad, Galaxy Tab 등 모두 가능합니다.

### Q3: 인터넷 연결이 필요한가요?
**A**: 로컬 네트워크(Wi-Fi)만 있으면 됩니다. 인터넷은 필요 없습니다. (단, 제작의뢰서 URL이 외부 시스템인 경우 인터넷 필요)

### Q4: 여러 작업자가 동시에 사용할 수 있나요?
**A**: 네! 각 작업자마다:
- 별도 스마트폰 + 세컨드 모니터 준비
- 각각 `/monitor` 접속
- 각각 다른 QR 코드로 페어링

### Q5: 페어링이 끊기면 어떻게 되나요?
**A**:
- 자동 재연결 시도 (5회)
- 실패 시: 페이지 새로고침 → QR 재스캔

### Q6: 비용이 드나요?
**A**:
- 소프트웨어: **무료** (오픈소스)
- 하드웨어: 기존 모니터/태블릿 사용
- 서버: 자체 서버 또는 클라우드 (필요 시)

---

## 9. 다음 단계

### 프로덕션 배포
1. [프로덕션 배포 가이드](../vooster-docs/production-deployment.md) 참고
2. PM2, Docker, Nginx 설정
3. HTTPS 인증서 설정
4. 모니터링 설정

### 커스터마이징
1. [React 고급 패턴 가이드](./react-advanced-guide.md) 참고
2. Socket.IO Hooks 커스터마이징
3. UI/UX 개선
4. 비즈니스 로직 추가

---

## 📞 지원

**문서**: [docs/README.md](./README.md)
**이슈**: GitHub Issues
**커뮤니티**: Discord (준비 중)

---

**최종 업데이트**: 2025-10-22
**버전**: 1.0.0
**작성자**: Vooster Team
