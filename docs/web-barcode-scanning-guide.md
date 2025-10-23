---
title: "웹 기반 바코드 스캔 시스템 개발 가이드"
description: "산업현장에서 실제로 사용 가능한 바코드 스캔 시스템을 만들기까지의 여정과 교훈"
category: "guide"
author: "신우진"
date: "2025-10-18"
public: true
order: 1
---

# 웹 기반 바코드 스캔 시스템 개발 가이드

> 산업현장에서 실제로 사용 가능한 바코드 스캔 시스템을 만들기까지의 여정과 교훈

**작성일**: 2025-10-18
**프로젝트**: Vooster 제작의뢰서 바코드 스캔 시스템
**기간**: Phase 1-11 (약 10시간)

---

## 📚 목차

### 기본편 (Phase 1-11: 바코드 스캔 최적화)
1. [왜 웹에서 바코드 스캔이 어려운가?](#1-왜-웹에서-바코드-스캔이-어려운가)
2. [프로젝트 요구사항과 산업현장 특성](#2-프로젝트-요구사항과-산업현장-특성)
3. [겪었던 문제들과 해결 과정](#3-겪었던-문제들과-해결-과정)
4. [최종 구현 결과](#4-최종-구현-결과)
5. [핵심 교훈과 Best Practices](#5-핵심-교훈과-best-practices)
6. [향후 유사 프로젝트를 위한 가이드](#6-향후-유사-프로젝트를-위한-가이드)

### 고급편 (T-004~T-010: 실시간 통신 및 동기화)
13. [실시간 통신 아키텍처 (Socket.IO 기반)](#13-실시간-통신-아키텍처-socketio-기반)
14. [세션 페어링 시스템 (QR 코드 기반)](#14-세션-페어링-시스템-qr-코드-기반)
15. [동기화 엔진 아키텍처](#15-동기화-엔진-아키텍처)

### 원격 디스플레이편 (T-012~T-021: 브라우저 확장 시스템)
16. [원격 디스플레이 시스템 개요](#16-원격-디스플레이-시스템-개요)
17. [브라우저 확장 설치 및 설정 가이드](#17-브라우저-확장-설치-및-설정-가이드)
18. [스마트폰 페어링 가이드 (WeChat 스타일)](#18-스마트폰-페어링-가이드-wechat-스타일)
19. [ngrok 개발 환경 및 실제 기기 테스트](#19-ngrok-개발-환경-및-실제-기기-테스트)
20. [데모데이 운영 가이드 (2025-10-27)](#20-데모데이-운영-가이드-2025-10-27)

### 관련 문서
- 📱 [React 고급 패턴 가이드](./react-advanced-guide.md) - 멀티 디스플레이, Socket.IO hooks, 성능 최적화
- 🚀 [프로덕션 배포 가이드](../vooster-docs/production-deployment.md) - PM2, Docker, Nginx, CI/CD
- 🔷 [TypeScript 타입 시스템 가이드](../vooster-docs/features/typescript-type-system-guide.md) - Zod, Generic, 타입 가드

---

## 1. 왜 웹에서 바코드 스캔이 어려운가?

### 1.1 모바일 앱과의 차이

**모바일 네이티브 앱** (Android/iOS):
```
✅ 카메라 API 직접 접근
✅ 하드웨어 가속 (GPU)
✅ 백그라운드 처리
✅ 최적화된 바코드 라이브러리
→ 결과: 즉시 인식 (0.1-0.3초)
```

**웹 브라우저**:
```
⚠️ 제한된 Camera API (getUserMedia)
⚠️ JavaScript 싱글 스레드 (메인 스레드 블로킹)
⚠️ 브라우저마다 다른 동작
⚠️ 성능 제약 (배터리, 메모리)
→ 결과: 느린 인식 (초기 5-10초)
```

### 1.2 웹 환경의 기술적 제약

#### A. 카메라 접근 복잡도
1. **보안 요구사항**: HTTPS 또는 localhost에서만 작동
2. **권한 요청**: 사용자가 매번 허용해야 함 (iOS Safari는 더 까다로움)
3. **브라우저 호환성**:
   - Chrome/Edge: 비교적 안정적
   - Safari: 특별 처리 필요
   - Firefox: 일부 API 미지원

#### B. 비디오 스트림 초기화
```
getUserMedia() 호출
→ 카메라 드라이버 초기화 (1-3초)
→ video 요소 준비 (readyState 체크)
→ video.play() 성공
→ 실제 프레임 데이터 준비
─────────────────────
총 2-5초 소요 (피할 수 없음)
```

#### C. 바코드 디코딩 성능
- **JavaScript로 이미지 처리**: 네이티브보다 10-100배 느림
- **매 프레임마다 디코딩**: CPU 집약적 작업
- **배터리/발열 문제**: 모바일 디바이스에서 심각

---

## 2. 프로젝트 요구사항과 산업현장 특성

### 2.1 산업현장 워크플로우

```
[작업자] 제품에 부착된 바코드 스캔
   ↓ (즉시 인식 필요)
[시스템] 제작의뢰서 페이지 표시
   ↓
[작업자] 이미지 확인 (제품 사진, 수량 등)
   ↓
[작업자] "다시 스캔" 버튼 클릭
   ↓
[시스템] 스캔 페이지로 복귀
   ↓ (즉시 재스캔 가능해야 함!)
[작업자] 다음 제품 바코드 스캔
   ↓
반복 (하루 100개 이상)
```

### 2.2 핵심 요구사항

#### 기능 요구사항
- ✅ QR 코드 + 1D 바코드 (CODE_128, CODE_39, EAN_13) 지원
- ✅ 주문번호 형식 검증 (정규식)
- ✅ 무효한 바코드 자동 무시
- ✅ 진동 피드백 (성공/실패)

#### 성능 요구사항
- ⚡ 첫 스캔: **1초 이내**
- ⚡ 연속 스캔: **0.5초 이내** (핵심!)
- 🔋 배터리 효율적
- 🌡️ 디바이스 발열 최소화

#### 사용성 요구사항
- 🎯 직관적인 UI (작업자 교육 최소화)
- 🔄 빠른 연속 작업 (작업 흐름 단절 없음)
- 📱 모바일 최적화 (현장에서 스마트폰/태블릿 사용)

---

## 3. 겪었던 문제들과 해결 과정

### 3.1 Phase 1-2: 초기 성능 문제

#### 문제
```
바코드 스캔 시작까지 5-20초 소요
→ 산업현장에서 실용 불가능
```

#### 원인 분석
1. **비디오 준비 검증 시간**: 15초 타임아웃
2. **ZXing 라이브러리 초기화**: 매번 200-500ms
3. **고해상도 처리**: 1920x1080 픽셀
4. **권한 요청 대기**: 사용자 수동 클릭

#### 해결 방법
```typescript
// 1. 타임아웃 단축: 15초 → 5초
const timeout = 5000;

// 2. ZXing 사전 초기화 (Provider mount 시)
const [zxingReader] = useState(() => initializeGlobalZXingReader());

// 3. 해상도 최적화: 1920x1080 → 1280x720
width: { ideal: 1280 }
height: { ideal: 720 }

// 4. 자동 권한 요청
<CameraProvider options={{ autoRequest: true }}>
```

**결과**: 5-20초 → **2-3초** (60-70% 개선)

---

### 3.2 Phase 3: 반복 스캔 시 속도 저하

#### 문제
```
1차 스캔: 빠름 (2-3초)
2차 스캔: 느림 (5초)
3차 스캔: 매우 느림 (10초+)
→ 사용할수록 느려짐
```

#### 원인 분석
1. **videoReadyRef 캐시 오작동**: 한 번 true가 되면 리셋 안 됨
2. **setTimeout cleanup 누락**: 메모리 누수
3. **Video stream 트랙 미정리**: 이전 스트림 누적
4. **ZXing reader 리소스 누적**

#### 해결 방법
```typescript
// 1. videoReadyRef 리셋 추가
const stopScanning = () => {
  // ...
  videoReadyRef.current = false; // 리셋
};

// 2. setTimeout 추적 및 정리
const pendingTimers = useRef([]);
const timer = setTimeout(...);
pendingTimers.current.push(timer);
// cleanup:
pendingTimers.current.forEach(t => clearTimeout(t));

// 3. Video stream 명시적 정리
if (currentStream) {
  currentStream.getTracks().forEach(t => t.stop());
}
video.srcObject = null;

// 4. ZXing reader cleanup
useEffect(() => {
  return () => {
    if (globalZXingReader) globalZXingReader = null;
  };
}, []);
```

**결과**: 모든 스캔이 일정한 속도 유지 ✅

---

### 3.3 Phase 4-10: 비디오 준비 타임아웃 (가장 어려웠던 문제)

#### 문제 (9번의 시도!)
```
❌ Video element failed to become ready within 10000ms

심지어:
readyState: 4 (HAVE_ENOUGH_DATA) ✅
videoWidth: 1280 ✅
videoHeight: 720 ✅
→ 그런데도 타임아웃!
```

#### 잘못된 접근들 (Phase 4-9)

**Phase 4**: 타임아웃 조정 (5초 → 10초)
- ❌ 실패: 10초도 부족

**Phase 5**: play() 재시도 강화 (3회 → 5회)
- ❌ 실패: play는 성공하는데 타임아웃

**Phase 6**: stream track 검증 추가
- ❌ 실패: track은 정상인데 타임아웃

**Phase 7**: useEffect dependency 안정화 (ref 패턴)
- ❌ 실패: cleanup/remount 여전히 발생

**Phase 8**: React.memo + useMemo
- ❌ 실패: 리렌더링 줄었지만 타임아웃

**Phase 9**: AnimatePresence 제거
- ⚠️ 부분 성공: unmount 방지, 하지만 타임아웃 계속

**공통점**: 모두 **증상만 치료**, 진짜 원인을 못 찾음

#### 진짜 원인 발견 (Phase 10)

**3개 전문 에이전트 동원** 후 로그 재분석:

```javascript
📊 Video 상태: {
  readyState: 4,
  networkState: 2,  // ← 이게 원인!
}

// networkState 값의 의미:
NETWORK_EMPTY = 0
NETWORK_IDLE = 1
NETWORK_LOADING = 2  ← 로그의 값
NETWORK_NO_SOURCE = 3
```

**isVideoReady() 함수**:
```typescript
const isNetworkStable =
  video.networkState !== video.NETWORK_LOADING  // ← FALSE!

return hasMetadata && isNetworkStable;  // → FALSE
```

**문제점**:
- MediaStream (실시간 카메라)은 **끝이 없는 스트림**
- 브라우저가 이를 "계속 로딩 중"으로 취급
- **networkState = NETWORK_LOADING (2)은 정상 상태**
- 하지만 코드는 이를 "준비 안 됨"으로 판단

#### 해결 방법 (1줄 수정!)
```typescript
// BEFORE: networkState 체크 포함
const isVideoReady = () => {
  return hasMetadata && isNetworkStable;  // networkState 체크
};

// AFTER: networkState 체크 제거
const isVideoReady = () => {
  return (
    video.readyState >= video.HAVE_METADATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
    // networkState 체크 제거 ✅
  );
};
```

**결과**: 타임아웃 **완전 해결** (100%)

**교훈**:
- 로그의 숫자 값을 정확히 확인해야 함
- 가정 대신 증거 기반 디버깅
- 전문가 의견 활용 (에이전트 동원)

---

### 3.4 Phase 11: 산업현장 성능 최적화

#### 문제
```
타임아웃은 해결되었지만:
- 첫 스캔: 여전히 느림 (3-5초)
- 연속 스캔: 점점 느려짐
- 작업자: "쓸 수가 없다"
```

#### 3개 에이전트 분석 결과

**TypeScript-Pro**:
- TRY_HARDER 힌트가 디코딩 50-60% 느리게 함
- 포맷 제한 권장

**React-Specialist**:
- 60fps 디코딩이 CPU 과부하 유발
- 프레임 스킵 권장 (15fps면 충분)

**Next.js-Developer**:
- videoReadyRef 리셋이 연속 스캔 느리게 함
- 캐시 유지 권장

#### 해결 방법

**1. TRY_HARDER 제거 + 포맷 제한**
```typescript
// BEFORE: 모든 포맷 + 높은 정확도 (느림)
hints.set(DecodeHintType.TRY_HARDER, true);

// AFTER: 주문번호 포맷만 (빠름)
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
]);
```

**2. 프레임 스킵 (CPU 절약)**
```typescript
let frameCount = 0;
const FRAME_SKIP = 3; // 4프레임 중 1프레임만

if (frameCount % (FRAME_SKIP + 1) !== 0) {
  return; // 이 프레임은 스킵
}
```

**3. videoReadyRef 캐시 유지**
```typescript
// Phase 9에서 ScannerViewMinimal을 항상 mount 상태로 유지
// → video element가 동일 인스턴스
// → 재검증 불필요
// videoReadyRef.current = false; ← 제거!
```

**결과**:
- 첫 스캔: 3-5초 → **0.8-1.2초** (75% 개선)
- 연속 스캔: 2-4초 → **0.3-0.5초** (90% 개선)

---

## 4. 최종 구현 결과

### 4.1 성능 지표

| 지표 | 초기 | 최종 | 개선율 |
|------|------|------|--------|
| 첫 스캔 속도 | 5-20초 | 0.8-1.2초 | **93%** |
| 연속 스캔 속도 | 2-4초 | 0.3-0.5초 | **90%** |
| CPU 사용률 | 100% | 25% | **75%** |
| 번들 크기 | 47.3kB | 10.2kB | **78%** |
| 배터리 수명 | 1시간 | 2시간 | **2배** |

### 4.2 기술 스택

**프론트엔드**:
- Next.js 15 (App Router)
- React 19
- TypeScript (strict mode)

**바코드 라이브러리**:
- @zxing/browser (최적화 적용)
- 향후: Native BarcodeDetector API 추가 예정

**카메라 관리**:
- MediaDevices API
- MediaStream API
- Custom hooks 기반 상태 관리

### 4.3 아키텍처 개선

#### Before (복잡함)
```
page.tsx (126줄)
└─ AnimatePresence (unmount 문제)
   └─ ScannerViewMinimal (464줄)
      └─ BarcodeScanner (438줄)
         └─ useBarcodeScanner (637줄)
            └─ CameraProvider (539줄)

총: 2,204줄
문제: 의존성 지옥, 생명주기 복잡
```

#### After (단순화)
```
page.tsx (130줄)
├─ CSS Transition (unmount 없음)
├─ ScannerViewMinimal (450줄, 항상 mount)
└─ BarcodeScanner (438줄, React.memo)
   └─ useBarcodeScanner (550줄, 최적화)
      └─ CameraProvider (540줄)

총: 2,108줄 (-96줄)
개선: 안정적 생명주기, 빠른 성능
```

---

## 5. 핵심 교훈과 Best Practices

### 5.1 문제 해결 접근법

#### ❌ 잘못된 접근 (Phase 1-9에서 했던 것)

1. **추측 기반 수정**
   ```
   "타임아웃이 짧은 것 같다" → 10초로 증가
   "재시도가 부족한 것 같다" → 5회로 증가
   "캐시 문제일 것 같다" → 리셋 추가
   ```
   → 모두 실패, 시간 낭비

2. **로그를 제대로 안 봄**
   ```javascript
   console.log('Video 상태:', { ...Object });
   // Object를 펼쳐보지 않음
   // networkState: 2의 의미를 모름
   ```

3. **단편적 수정**
   - 하나씩 패치 추가
   - 전체 구조 이해 부족
   - 근본 원인 파악 안 함

#### ✅ 올바른 접근 (Phase 10-11에서 한 것)

1. **증거 기반 분석**
   ```
   로그 상세 분석 → networkState: 2 발견
   → MDN 문서 확인 → NETWORK_LOADING의 의미 파악
   → HTMLVideoElement 스펙 이해
   → 1줄 수정으로 해결
   ```

2. **전문가 의견 활용**
   ```
   3개 전문 에이전트 동원:
   - TypeScript-Pro: 타입 안정성
   - React-Specialist: hooks 패턴
   - Next.js-Developer: 생명주기

   → 다각도 분석
   → 근본 원인 찾기
   ```

3. **성능 측정 기반 최적화**
   ```
   Performance API 사용
   → TRY_HARDER: 150-400ms 측정
   → 프레임 스킵: CPU 75% 감소 측정
   → 데이터 기반 의사결정
   ```

### 5.2 웹 바코드 스캔 Best Practices

#### A. 카메라 초기화

```typescript
// ✅ DO: 권한 사전 요청
<CameraProvider options={{ autoRequest: true }}>

// ✅ DO: 적절한 해상도 (성능/품질 균형)
width: { ideal: 1280 }   // Full HD는 과도함
height: { ideal: 720 }

// ✅ DO: 후면 카메라 우선
facingMode: { ideal: 'environment' }

// ❌ DON'T: 과도한 해상도
width: { ideal: 1920 }   // 처리 시간 증가
height: { ideal: 1080 }
```

#### B. 비디오 준비 검증

```typescript
// ✅ DO: 간단하고 확실한 체크
const isVideoReady = (video: HTMLVideoElement) => {
  return (
    video.readyState >= video.HAVE_METADATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
};

// ❌ DON'T: 과도한 조건 (networkState 체크)
// MediaStream은 networkState=NETWORK_LOADING이 정상!
```

#### C. 바코드 디코딩 최적화

```typescript
// ✅ DO: 포맷 제한 (필요한 것만)
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
]);

// ✅ DO: 프레임 스킵 (15fps면 충분)
if (frameCount % 4 !== 0) return;

// ❌ DON'T: TRY_HARDER (60% 느려짐)
hints.set(DecodeHintType.TRY_HARDER, true);

// ❌ DON'T: 60fps 디코딩 (CPU 과부하)
```

#### D. 컴포넌트 생명주기

```typescript
// ✅ DO: 카메라 컴포넌트 항상 mount 유지
<div className={viewMode === 'scanner' ? '' : '-translate-x-full'}>
  <ScannerView /> {/* 항상 DOM에 존재 */}
</div>

// ❌ DON'T: AnimatePresence mode="wait"
<AnimatePresence mode="wait">
  {viewMode === 'scanner' ? <Scanner /> : <Report />}
</AnimatePresence>
// → Scanner가 완전히 unmount됨
// → 카메라 재시작 필요
```

#### E. React Hooks 패턴

```typescript
// ✅ DO: useRef로 콜백 안정화
const callbackRef = useRef(callback);
useEffect(() => { callbackRef.current = callback; }, [callback]);

const stableCallback = useCallback(() => {
  callbackRef.current();
}, []); // 빈 배열 - 절대 재생성 안 됨

// ❌ DON'T: 함수를 dependency에 포함
useEffect(() => {
  startScanning();
}, [stream, videoElement, startScanning]); // ← 무한 루프 위험
```

---

## 6. 향후 유사 프로젝트를 위한 가이드

### 6.1 기획 단계

#### Step 1: 요구사항 명확화

**질문 리스트**:
- [ ] 어떤 바코드 포맷이 필요한가? (QR, 1D, 2D?)
- [ ] 스캔 빈도는? (1회? 연속 100회?)
- [ ] 사용 환경은? (실내? 야외? 조명?)
- [ ] 대상 디바이스는? (iOS? Android? 태블릿?)
- [ ] 성능 목표는? (1초? 5초?)

**Vooster 프로젝트 예시**:
```
✅ 포맷: QR + CODE_128/39 + EAN_13
✅ 빈도: 연속 100회/일
✅ 환경: 공장 내부 (안정적 조명)
✅ 디바이스: Android 스마트폰, iOS 태블릿
✅ 목표: 첫 1초, 연속 0.5초
```

#### Step 2: 기술 선택

**결정 트리**:
```
Q1: 네이티브 앱 가능한가?
  └─ Yes → React Native / Flutter 추천
  └─ No → 웹 기반 계속

Q2: Chrome/Edge만 지원하면 되는가?
  └─ Yes → Native BarcodeDetector API (최고 성능)
  └─ No → 라이브러리 필요

Q3: QR만 필요한가?
  └─ Yes → html5-qrcode 추천
  └─ No → 1D도 필요

Q4: 1D 바코드 종류는?
  └─ EAN, UPC 등 → @zxing/browser
  └─ CODE_128, CODE_39 등 → quagga2 (더 빠름)
```

**Vooster 선택**:
- ✅ 웹 기반 (PWA 가능성)
- ⚠️ Safari 지원 필요
- ✅ QR + 1D (CODE_128/39)
- → **@zxing/browser 선택 (최적화 적용)**

### 6.2 분석 단계

#### Step 1: 프로토타입 성능 측정

```typescript
// 성능 측정 유틸리티
class PerformanceTracker {
  measure(label: string, fn: () => void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
  }
}

// 사용 예시
tracker.measure('getUserMedia', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({...});
});
// 출력: getUserMedia: 1234.56ms
```

**측정 항목**:
- getUserMedia 시간
- video.play() 시간
- readyState 도달 시간
- 첫 디코딩 시간
- 평균 디코딩 시간

#### Step 2: 병목 지점 파악

**Chrome DevTools 사용**:
1. Performance 탭 → Record
2. 바코드 스캔 수행
3. Main Thread 분석
   - 긴 Task 찾기 (노란색/빨간색)
   - Bottom-Up으로 함수별 CPU 시간 확인

**Vooster 프로젝트에서 발견한 병목**:
1. ❌ TRY_HARDER: 150-400ms/프레임
2. ❌ 60fps 디코딩: CPU 100%
3. ❌ 1920x1080 해상도: 메모리 과다
4. ❌ AnimatePresence: unmount/remount

### 6.3 설계 단계

#### 핵심 설계 원칙

**1. 컴포넌트 생명주기 단순화**
```
❌ BAD: 복잡한 unmount/remount
└─ AnimatePresence mode="wait"
   └─ 전환 시 완전 파괴
   └─ 재초기화 필요

✅ GOOD: 항상 mount 유지
└─ CSS transform으로 숨기기
   └─ 리소스 유지
   └─ 즉시 재사용
```

**2. 상태 관리 명확화**
```typescript
// ❌ BAD: 여러 곳에 분산된 상태
const [state1, setState1] = useState();  // Component A
const [state2, setState2] = useState();  // Component B
const ref = useRef();                     // Hook C

// ✅ GOOD: 단일 책임
// CameraProvider: 카메라 상태만
// ScannerState: 스캔 결과만
// UI State: UI 상태만
```

**3. 의존성 체인 최소화**
```typescript
// ❌ BAD: 깊은 dependency chain
const a = useCallback(() => {...}, [b]);
const b = useCallback(() => {...}, [c]);
const c = useCallback(() => {...}, [d]);
// → 무한 재생성 위험

// ✅ GOOD: useRef로 안정화
const callbackRef = useRef(callback);
useEffect(() => { callbackRef.current = callback; }, [callback]);

const stable = useCallback(() => {
  callbackRef.current();
}, []); // 빈 배열
```

### 6.4 구현 단계

#### Phase by Phase 접근

**Phase 1: 기본 동작 구현**
- [ ] 카메라 권한 요청
- [ ] 비디오 스트림 표시
- [ ] 바코드 라이브러리 통합
- [ ] 기본 스캔 동작 확인
- **목표**: 일단 작동하게 만들기

**Phase 2: 타입 안정성**
- [ ] TypeScript strict mode 활성화
- [ ] null/undefined 처리
- [ ] 에러 타입 정의
- **목표**: 런타임 에러 방지

**Phase 3: 성능 최적화**
- [ ] 성능 측정 (Performance API)
- [ ] 병목 지점 파악
- [ ] 최적화 적용 (프레임 스킵 등)
- **목표**: 실용적인 속도

**Phase 4: 안정성 강화**
- [ ] 메모리 누수 제거
- [ ] cleanup 로직 검증
- [ ] 에러 복구 처리
- **목표**: 장시간 사용 가능

**Phase 5: 사용성 개선**
- [ ] 로딩 상태 시각화
- [ ] 에러 메시지 개선
- [ ] 접근성 (ARIA)
- **목표**: 사용자 친화적

### 6.5 디버깅 전략

#### 문제 발생 시 체크리스트

1. **로그 상세 확인**
   ```typescript
   // ❌ BAD
   console.log('Video 상태:', video);

   // ✅ GOOD
   console.log('Video 상태:', {
     readyState: video.readyState,
     readyStateName: ['HAVE_NOTHING', 'HAVE_METADATA', ...][video.readyState],
     networkState: video.networkState,
     networkStateName: ['NETWORK_EMPTY', 'NETWORK_IDLE', ...][video.networkState],
     videoWidth: video.videoWidth,
     videoHeight: video.videoHeight,
   });
   ```

2. **브라우저 스펙 확인**
   - MDN 문서 참조
   - W3C 표준 확인
   - 브라우저별 동작 차이 파악

3. **전문가 의견 활용**
   - GitHub Issues 검색
   - Stack Overflow
   - AI 에이전트 동원 (여러 관점)

4. **성능 프로파일링**
   - React DevTools Profiler
   - Chrome Performance Tab
   - 실제 디바이스 테스트

---

## 7. 웹 바코드 스캔 시 고려사항 체크리스트

### 7.1 기술적 고려사항

#### 브라우저 호환성
- [ ] Chrome/Edge 지원 (Native BarcodeDetector 가능)
- [ ] Safari 지원 (특별 처리 필요)
- [ ] Firefox 지원 (일부 제약)
- [ ] 모바일 브라우저 테스트

#### 성능 최적화
- [ ] 적절한 해상도 선택 (640x480 ~ 1280x720)
- [ ] 프레임레이트 제한 (15-30fps)
- [ ] 필요한 바코드 포맷만 지정
- [ ] TRY_HARDER 사용 최소화
- [ ] 프레임 스킵 적용

#### 메모리 관리
- [ ] 스트림 cleanup (tracks.forEach(t => t.stop()))
- [ ] video.srcObject = null
- [ ] setTimeout/setInterval cleanup
- [ ] 이벤트 리스너 제거

#### 배터리/발열
- [ ] 프레임 스킵으로 CPU 사용 감소
- [ ] 스캔 완료 후 카메라 정지 (선택)
- [ ] 백그라운드 탭에서 자동 정지

### 7.2 UX 고려사항

#### 사용자 피드백
- [ ] 로딩 상태 표시 (스피너, 프로그레스)
- [ ] 스캔 가이드 (프레임 오버레이)
- [ ] 성공/실패 피드백 (진동, 소리, 시각)
- [ ] 에러 메시지 (사용자 친화적)

#### 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원 (ARIA)
- [ ] 충분한 대비 (명암비)

#### 모바일 최적화
- [ ] 터치 친화적 UI
- [ ] Safe Area 고려 (노치, 홈 인디케이터)
- [ ] 가로/세로 모드 대응

### 7.3 보안 고려사항

#### 필수 요구사항
- [ ] HTTPS 또는 localhost만 (보안 컨텍스트)
- [ ] 권한 요청 명확한 설명
- [ ] 카메라 사용 중 표시 (브라우저 자동)

#### 개인정보 보호
- [ ] 스캔 이미지 저장 안 함
- [ ] 스트림 종료 시 완전 정리
- [ ] 불필요한 권한 요청 안 함

---

## 8. 성능 벤치마크 및 목표 설정

### 8.1 산업별 권장 성능 목표

| 산업 | 스캔 빈도 | 목표 속도 | CPU 제한 |
|------|----------|----------|----------|
| **물류/창고** | 초당 1-2개 | < 0.5초 | < 30% |
| **제조** | 분당 5-10개 | < 1초 | < 40% |
| **리테일** | 분당 1-5개 | < 2초 | < 50% |
| **행사** | 시간당 10-50개 | < 3초 | < 60% |

**Vooster (제조)**: 분당 5-10개 → **목표 0.5-1초** ✅ 달성!

### 8.2 라이브러리별 성능 비교

| 라이브러리 | QR | 1D | 속도 | 메모리 | 난이도 |
|----------|----|----|------|--------|--------|
| **Native BarcodeDetector** | ✅ | ✅ | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | ⭐ |
| **quagga2** | ❌ | ✅ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⭐⭐ |
| **html5-qrcode** | ✅ | ⚠️ | ⚡⚡⚡ | ⚡⚡⚡ | ⭐ |
| **@zxing/browser** | ✅ | ✅ | ⚡⚡ | ⚡⚡ | ⭐⭐⭐ |

**추천**:
- Chrome/Edge만: Native BarcodeDetector
- 1D 전용: quagga2
- QR 전용: html5-qrcode
- 모든 포맷 + 모든 브라우저: @zxing/browser (최적화 필수)

---

## 9. 트러블슈팅 가이드

### 9.1 흔한 문제와 해결책

#### 문제 1: "타임아웃 에러"
```
❌ Video element failed to become ready
```

**체크리스트**:
1. readyState 값 확인 (0-4)
2. networkState 값 확인 (0-3)
3. videoWidth/Height 확인
4. **networkState 체크 로직 확인** ← 이게 원인인 경우 많음!

**해결**:
```typescript
// networkState 체크 제거 (MediaStream은 LOADING이 정상)
const isReady = video.readyState >= 2 && video.videoWidth > 0;
```

#### 문제 2: "두 번째 스캔 느림"
```
첫 스캔: 빠름
두 번째: 느림
```

**원인**:
- 메모리 누수
- Reader 재초기화 필요
- cleanup 미흡

**해결**:
```typescript
const stopScanning = () => {
  // Reader cleanup
  reader.reset?.(); // 있으면 호출

  // Stream cleanup
  stream.getTracks().forEach(t => t.stop());

  // 캐시 유지 (videoReadyRef 리셋 안 함)
};
```

#### 문제 3: "CPU 100%, 디바이스 뜨거움"
```
배터리 빨리 닳음
디바이스 발열
```

**해결**:
```typescript
// 프레임 스킵 (60fps → 15fps)
if (frameCount % 4 !== 0) return;

// 해상도 낮추기
width: { ideal: 640 }
height: { ideal: 480 }
```

### 9.2 디버깅 팁

#### 로그 레벨 시스템
```typescript
enum LogLevel { ERROR, WARN, INFO, DEBUG }

const log = (level: LogLevel, message: string, data?: any) => {
  const currentLevel = process.env.NODE_ENV === 'development'
    ? LogLevel.DEBUG
    : LogLevel.WARN;

  if (level <= currentLevel) {
    console.log(`[${LogLevel[level]}]`, message, data);
  }
};

// 사용
log(LogLevel.DEBUG, 'Video 상태', { readyState: video.readyState });
log(LogLevel.ERROR, '타임아웃 발생', { duration: 10000 });
```

#### Performance 측정
```typescript
// React DevTools Profiler
<Profiler id="Scanner" onRender={(id, phase, actualDuration) => {
  if (actualDuration > 16) { // 60fps 기준
    console.warn(`${id} slow render: ${actualDuration}ms`);
  }
}}>
  <BarcodeScanner />
</Profiler>
```

---

## 10. 결론

### 10.1 핵심 성과

**Vooster 프로젝트**:
- ✅ 첫 스캔: 5-20초 → **0.8-1.2초** (93% 개선)
- ✅ 연속 스캔: 2-4초 → **0.3-0.5초** (90% 개선)
- ✅ 타임아웃 에러 100% 해결
- ✅ 번들 크기 78% 감소
- ✅ CPU 사용 75% 감소

**작업자 생산성**:
- 100개/일 기준: **14분/일 절약**
- 10명 기준: **2.3시간/일 절약**
- 1달 기준: **50시간 절약**

### 10.2 가장 중요한 교훈

1. **증거 기반 디버깅**
   - 추측하지 말고 로그를 상세히 확인
   - 숫자 값의 정확한 의미 파악
   - 브라우저 스펙 확인

2. **전문가 의견 활용**
   - 혼자 해결 안 되면 즉시 도움 요청
   - 다각도 분석 (TypeScript, React, Next.js)
   - GitHub Issues, Stack Overflow 검색

3. **성능 측정 기반 최적화**
   - 감으로 최적화하지 말기
   - Performance API로 측정
   - 데이터 기반 의사결정

4. **단순함이 최고**
   - 복잡한 패치보다 구조 개선
   - 캐시보다 명확한 검증
   - 의존성 체인보다 ref 패턴

### 10.3 향후 개선 방향

**단기 (1-2주)**:
- [ ] Native BarcodeDetector API 통합
- [ ] Chrome/Edge에서 10-50ms 인식

**중기 (1-2개월)**:
- [ ] Web Worker 기반 디코딩
- [ ] UI 블로킹 완전 제거
- [ ] PWA 변환 (오프라인 캐싱)

**장기 (3-6개월)**:
- [ ] 머신러닝 기반 바코드 영역 사전 탐지
- [ ] 적응형 성능 조정 (디바이스별)
- [ ] 통계 대시보드 (스캔 성공률, 평균 시간)

---

## 11. 참고 자료

### 11.1 공식 문서

- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN: HTMLVideoElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement)
- [W3C: Barcode Detection API](https://wicg.github.io/shape-detection-api/text.html#barcode-detection-api)
- [ZXing Documentation](https://github.com/zxing-js/browser)

### 11.2 라이브러리

- [@zxing/browser](https://www.npmjs.com/package/@zxing/browser) - 범용 바코드
- [quagga2](https://www.npmjs.com/package/@ericblade/quagga2) - 1D 바코드 전문
- [html5-qrcode](https://www.npmjs.com/package/html5-qrcode) - QR + 일부 1D

### 11.3 도구

- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Chrome Performance Profiler](https://developer.chrome.com/docs/devtools/performance/)
- [WebPageTest](https://www.webpagetest.org/) - 모바일 성능 테스트

---

## 12. 요약

**웹 기반 바코드 스캔은 어렵습니다.**

하지만:
1. ✅ 올바른 설계
2. ✅ 성능 측정
3. ✅ 증거 기반 디버깅
4. ✅ 지속적인 최적화

로 **산업현장에서 실용적으로 사용 가능한 시스템**을 만들 수 있습니다.

**Vooster 프로젝트의 핵심 성공 요인**:
- 11번의 Phase를 거치며 문제의 본질을 파악
- 3개 전문 에이전트의 다각도 분석
- networkState 체크 제거라는 1줄 수정으로 근본 해결
- 산업현장 워크플로우에 맞춘 최적화

**다음 프로젝트에서는**:
- 이 가이드를 참조하여 시행착오 최소화
- Phase 1에서부터 성능 측정 시작
- 초기부터 간단한 구조 유지
- 문제 발생 시 즉시 전문가 의견 활용

---

---

## 13. 실시간 통신 아키텍처 (Socket.IO 기반)

### 13.1 시스템 개요

Vooster는 스마트폰 웹앱과 세컨드 모니터(대시보드)간의 **양방향 실시간 통신**을 Socket.IO 기반으로 구현했습니다. 이를 통해 바코드 스캔 결과를 즉시 모니터에 반영할 수 있습니다.

```
┌─────────────────────────────────────────────────────────┐
│                   스마트폰 (스캔 앱)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  바코드 스캔                                       │  │
│  │  (카메라 + ZXing)                                │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │ Socket.IO emit('scanOrder')        │
└───────────────────┼──────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │   Socket.IO 서버         │
         │  (Node.js + Express)     │
         │                          │
         │  - 세션 관리             │
         │  - 메시지 라우팅         │
         │  - 실시간 동기화         │
         │                          │
         └──────────────┬───────────┘
                        │
        ┌───────────────┴──────────────┐
        │ emit('orderScanned')         │
        ▼                              ▼
    ┌────────────┐            ┌──────────────┐
    │  모니터 1   │            │   모니터 2    │
    │ (대시보드)  │            │  (대시보드)   │
    └────────────┘            └──────────────┘
```

### 13.2 서버 구조 설계

#### A. 기본 설정

```typescript
// server/src/index.ts
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,      // 하트비트 간격
  pingTimeout: 60000,       // 연결 끊김 판정 시간
  maxHttpBufferSize: 1e6,   // 1MB 메시지 크기 제한
});
```

**각 설정의 의미**:
- `transports`: WebSocket 우선, 폴백으로 HTTP long-polling
- `pingInterval/pingTimeout`: 연결 안정성 보장
- `maxHttpBufferSize`: 대용량 메시지 방지

#### B. 인증 미들웨어

```typescript
// Socket.IO 연결 시 JWT 검증
io.use(authMiddleware(config.jwtSecret));

// authMiddleware는 다음을 검증:
// 1. Authorization 헤더에서 JWT 추출
// 2. 토큰 서명 검증
// 3. 토큰 만료 시간 확인
// 4. socket.data에 사용자 정보 저장
```

### 13.3 세션 관리 전략

#### A. 세션 생성 (QR 페어링)

```typescript
// 세컨드 모니터에서 "스캔 준비" 클릭 시 QR 생성
socket.on('session:create', async (data) => {
  const session = pairingService.createSession(data.userId);
  const pairingUrl = pairingService.generatePairingUrl(session);

  // QR 코드 생성 (프론트엔드에서)
  // 데이터: pairingUrl (또는 sessionId + token)

  socket.emit('sessionCreated', {
    sessionId: session.sessionId,
    pairingUrl: pairingUrl,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

// 세션 객체 구조
interface PairingSession {
  sessionId: string;           // 8자 고유 ID (0-9A-Z)
  createdAt: number;          // 생성 시간 (타임스탬프)
  expiresAt: number;          // 만료 시간 (기본 15분)
  pairingToken: string;       // JWT (10분 유효)
  status: 'waiting' | 'paired'; // 상태
  mobileSocketId?: string;    // 스마트폰 소켓 ID
  monitorSocketId?: string;   // 모니터 소켓 ID
  pairedAt?: number;          // 페어링 완료 시간
}
```

#### B. QR 스캔 후 페어링

```typescript
// 스마트폰에서 QR 스캔 후 token + sessionId 전송
socket.on('session:join', (data: { sessionId: string; token: string }) => {
  // 1. 토큰 검증
  const verify = pairingService.verifyPairingToken(data.sessionId, data.token);
  if (!verify.valid) {
    socket.emit('error', { code: verify.error });
    return;
  }

  // 2. 페어링 완료
  const success = pairingService.completePairing(
    data.sessionId,
    socket.id,  // 스마트폰 소켓 ID 저장
  );

  if (success) {
    // 3. 소켓 룸에 추가
    socket.join(`session:${data.sessionId}`);

    // 4. 양쪽 클라이언트에 알림
    io.to(`session:${data.sessionId}`).emit('pairingComplete', {
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### 13.4 소켓 룸 기반 메시징

#### A. 소켓 룸 개념

```typescript
// Socket.IO 룸: 같은 sessionId를 가진 클라이언트들의 그룹

// 룸 추가 (페어링 시)
socket.join(`session:${sessionId}`);

// 룸으로 메시지 전송
io.to(`session:${sessionId}`).emit('orderScanned', {
  orderId: '2024001234',
  timestamp: new Date().toISOString(),
});

// 자신을 제외한 룸 전송
socket.broadcast.to(`session:${sessionId}`).emit('event', data);

// 룸에서 제거
socket.leave(`session:${sessionId}`);
```

**룸 구조**:
- `session:{sessionId}`: 특정 세션의 모든 클라이언트
- `user:{userId}`: 특정 사용자의 모든 클라이언트

#### B. 실제 메시지 흐름

```
스마트폰 (Socket A)              모니터 (Socket B)
      │                                │
      │──── emit('scanOrder') ────────▶│
      │      └─ orderId: '2024001234'  │
      │      └─ barcode: 'ABC123'      │
      │                                │
      │  ◀─── emit('orderConfirm') ───│
      │       └─ status: 'success'     │
      │       └─ timestamp: ...        │
      │                                │
      │  ◀─ emit('showDetails') ──────│
      │       └─ productName: ...      │
      │       └─ quantity: 100         │
      │                                │
```

### 13.5 인증 및 보안

#### A. JWT 기반 인증

```typescript
// 페어링 토큰 (QR 스캔용)
interface SessionPairingPayload {
  sid: string;        // Session ID
  sub: string;        // Subject (userId)
  iat?: number;       // 발급 시간
  exp?: number;       // 만료 시간
}

// 토큰 생성
const pairingToken = sign(
  { sid: sessionId, sub: userId },
  config.jwtSecret,
  { expiresIn: '10m' }  // 10분 유효
);

// 검증 (연결 시)
const authMiddleware = (jwtSecret: string) => {
  return (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const payload = verify(token, jwtSecret);
      socket.data.userId = payload.sub;
      socket.data.sessionId = payload.sid;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  };
};
```

#### B. 보안 체크리스트

```typescript
// 1. 토큰 검증
- sid와 token이 일치하는지 확인
- 토큰 만료 시간 확인
- 서명 검증 (JWT_SECRET)

// 2. 세션 권한
- 자신의 sessionId만 접근 가능
- 다른 세션의 메시지 거부
- disconnected 세션 정리

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 100,                   // 100 요청 제한
});

// 4. 메시지 검증
socket.on('scanOrder', (data) => {
  // 필수 필드 확인
  if (!data.orderId || !data.barcode) {
    socket.emit('error', { code: 'INVALID_PAYLOAD' });
    return;
  }
  // 형식 검증 (정규식)
  if (!/^\d{8,12}$/.test(data.orderId)) {
    return;
  }
});
```

### 13.6 세션 정리 및 타임아웃

#### A. 타임아웃 설정

```typescript
// 페어링 세션 (15분)
interface PairingServiceConfig {
  sessionTTL: 15 * 60 * 1000,  // 15분 후 자동 만료
  tokenExpiresIn: '10m',       // JWT 토큰 10분 유효
}

// 비활성 세션 정리 (30분)
sessionService.cleanupInactiveSessions(
  maxIdleTime: 30 * 60 * 1000
);

// 정기적 정리 (10분마다)
setInterval(() => {
  sessionService.cleanupInactiveSessions();
}, 10 * 60 * 1000);
```

#### B. 세션 라이프사이클

```
┌─────────────────────────────────────────────────────────────┐
│ 세션 생성 (Create)                                          │
│ - sessionId 발급                                            │
│ - pairingToken (JWT) 생성                                   │
│ - QR URL 생성                                               │
│ - 15분 TTL 타이머 시작                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             │ [QR 스캔]
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 페어링 (Pair)                                               │
│ - 토큰 검증                                                 │
│ - mobileSocketId, monitorSocketId 연결                      │
│ - 소켓 룸 생성 (session:{sessionId})                        │
│ - status 변경: 'waiting' → 'paired'                        │
└────────────┬────────────────────────────────────────────────┘
             │
             │ [실시간 메시지 교환]
             │ - scanOrder
             │ - orderConfirm
             │ - showDetails
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 완료 & 정리 (Release)                                       │
│ - 소켓 연결 해제                                            │
│ - 소켓 룸에서 제거                                          │
│ - 세션 레코드 삭제                                          │
│ - TTL 타이머 취소                                           │
└─────────────────────────────────────────────────────────────┘
```

#### C. 연결 해제 처리

```typescript
// 연결 해제 이벤트
socket.on('disconnect', () => {
  // 1. 세션에서 소켓 ID 제거
  const sessionId = pairingService.removeSocketFromSession(socket.id);

  if (!sessionId) return;

  // 2. 상태 확인
  const session = pairingService.getSession(sessionId);
  if (!session) return;

  // 3. 양쪽 모두 연결 해제되면 세션 삭제
  if (!session.mobileSocketId && !session.monitorSocketId) {
    pairingService.releaseSession(sessionId);
    logger.info('세션 자동 정리: %s', sessionId);
  }

  // 4. 상대방에 알림 (선택사항)
  io.to(`session:${sessionId}`).emit('peerDisconnected', {
    reason: 'peer_disconnected',
  });
});
```

---

## 14. 세션 페어링 시스템 (QR 코드 기반)

### 14.1 QR 생성 및 스캔 프로세스

#### A. QR 코드 생성

```typescript
// 1. 모니터에서 QR 생성 요청
const handleCreateSession = async () => {
  socket.emit('session:create', {
    userId: 'user-123',
  });
};

// 2. 서버에서 QR 데이터 생성
const pairingUrl = pairingService.generatePairingUrl(session);
// 결과: https://app.example.com/pair?sid=ABC123XY&t=eyJhbG...

// 3. QR 코드 렌더링 (프론트엔드)
// qrcode.react 라이브러리 사용
<QRCode
  value={pairingUrl}
  size={256}
  level="H"           // 높은 오류 정정 레벨
  includeMargin={true}
/>
```

**QR 설정 가이드**:
- **size**: 256 이상 권장 (산업현장에서 거리가 있을 수 있음)
- **level**: H (High) 권장 (30% 손상도 복구 가능)
- **margin**: true (코드 주변 여백 필요)

#### B. QR 스캔 후 페어링

```typescript
// 1. 스마트폰에서 QR 스캔
// ZXing이 QR 데이터 추출: "https://app.example.com/pair?sid=ABC123XY&t=eyJhbG..."

// 2. URL 파싱
const url = new URL(scannedBarcode);
const sessionId = url.searchParams.get('sid');   // ABC123XY
const token = url.searchParams.get('t');         // JWT 토큰

// 3. 페어링 요청
socket.emit('session:join', {
  sessionId: sessionId,
  token: token,
});

// 4. 서버 검증 및 연결
const verify = pairingService.verifyPairingToken(sessionId, token);
if (verify.valid) {
  // 페어링 성공
  pairingService.completePairing(sessionId, mobileSocketId);
  socket.emit('pairingSuccess');
}
```

### 14.2 세션 식별 및 매칭

#### A. 세션 ID 생성 전략

```typescript
// 8자 고유 ID (숫자 + 대문자)
// 예: ABC123XY, 0A9Z1BC5

import { customAlphabet } from 'nanoid';

const generateSessionId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  8  // 8자 길이
);

// 충돌 확률 계산
// 36^8 = 2.8 * 10^12 (약 2조)
// → 매일 1000개 세션 생성해도 충돌 없음
```

#### B. 매핑 저장소 (in-memory)

```typescript
// SessionPairingService 내부
private sessions: Map<string, PairingSession> = new Map();

// 조회 (sessionId 기준)
getSession(sessionId: string): PairingSession | undefined {
  const session = this.sessions.get(sessionId);

  // 만료 확인
  if (Date.now() > session.expiresAt) {
    this.sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

// 조회 (remoteId 기준) - 원격 태스크 연결용
getByRemoteId(remoteId: string): MappingRecord | null {
  // SQLite 매핑 스토어에서 조회
  const stmt = this.db.prepare(
    'SELECT * FROM mappings WHERE remoteId = ?'
  );
  return stmt.get(remoteId);
}
```

#### C. 소켓-세션 매핑

```typescript
// 역매핑: 소켓 ID → 세션 ID
private socketToSession: Map<string, string> = new Map();

// 등록
registerMobileSocket(sessionId: string, socketId: string): boolean {
  const session = this.getSession(sessionId);
  if (!session) return false;

  session.mobileSocketId = socketId;
  this.socketToSession.set(socketId, sessionId);
  return true;
}

// 조회
getSessionIdBySocketId(socketId: string): string | undefined {
  return this.socketToSession.get(socketId);
}

// 제거
removeSocket(socketId: string): void {
  const sessionId = this.socketToSession.get(socketId);
  if (sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.mobileSocketId === socketId) {
        session.mobileSocketId = undefined;
      }
      if (session.monitorSocketId === socketId) {
        session.monitorSocketId = undefined;
      }
      // 양쪽 모두 연결 해제되면 삭제
      if (!session.mobileSocketId && !session.monitorSocketId) {
        this.sessions.delete(sessionId);
      }
    }
    this.socketToSession.delete(socketId);
  }
}
```

### 14.3 타임아웃 및 정리 메커니즘

#### A. 자동 만료

```typescript
// 세션 생성 시
const expiresAt = now + this.config.sessionTTL;  // 15분

// 자동 만료 타이머
setTimeout(() => {
  if (this.sessions.has(sessionId)) {
    const sess = this.sessions.get(sessionId)!;

    // paired 상태가 아니면 삭제
    if (sess.status !== 'paired') {
      this.sessions.delete(sessionId);
      logger.info('세션 자동 만료: %s', sessionId);
    }
  }
}, this.config.sessionTTL);  // 15분 후 실행
```

**문제점 해결**:
- `setTimeout` 저장하지 않으면 나중에 취소 불가
- 대량의 세션에서 메모리 누수 위험
- → 프로덕션 환경에서는 Redis로 관리 권장

#### B. 모니터링 API

```typescript
// 활성 세션 조회
app.get('/api/sessions/active', (req, res) => {
  const sessions = pairingService.getAllActiveSessions();

  res.json({
    total: sessions.length,
    paired: sessions.filter(s => s.status === 'paired').length,
    waiting: sessions.filter(s => s.status === 'waiting').length,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      status: s.status,
      hasMobile: !!s.mobileSocketId,
      hasMonitor: !!s.monitorSocketId,
      createdAt: new Date(s.createdAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
    })),
  });
});

// 헬스 체크
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const sessions = sessionService.getAllSessions();

  res.json({
    status: 'ok',
    uptime,
    sessions: {
      total: sessions.length,
      active: sessions.filter(s => s.mobileSocketId || s.monitorSocketId).length,
    },
  });
});
```

---

## 15. 동기화 엔진 아키텍처

### 15.1 양방향 실시간 동기화 개요

#### A. 동기화 방향

```
┌───────────────────────────────────────┐
│        로컬 파일 시스템                 │
│  (워치 디렉터리: .vooster/tasks)       │
└──────────┬────────────────────────────┘
           │
           │ chokidar (파일 워처)
           │ add/change/unlink 감지
           ▼
┌───────────────────────────────────────┐
│        SyncEngine                      │
│  - 파일 변경 처리                      │
│  - 충돌 해결                           │
│  - API 호출                            │
└──────────┬────────────────────────────┘
           │
           │ (로컬 → 원격)
           │ create/update/delete
           ▼
┌───────────────────────────────────────┐
│    Vooster API (원격)                 │
│  /tasks (CRUD 엔드포인트)             │
└──────────┬────────────────────────────┘
           │
           │ polling (매 30초)
           │ listUpdatedSince()
           ▼
┌───────────────────────────────────────┐
│   원격 변경 감지 & 로컬 동기화          │
│   (원격 → 로컬)                       │
└───────────────────────────────────────┘
```

#### B. 동기화 흐름

```typescript
// 파일 변경 감지 → 큐 추가 → 처리

// 1. 파일 변경 감지
this.watcher = chokidar.watch(watchDir, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,  // 300ms 동안 변경 없으면 처리
    pollInterval: 100,
  },
});

// 2. 이벤트 핸들러
this.watcher.on('add', (filePath) =>
  this.enqueue('create', filePath)
);
this.watcher.on('change', (filePath) =>
  this.enqueue('update', filePath)
);
this.watcher.on('unlink', (filePath) =>
  this.enqueue('delete', filePath)
);

// 3. 큐에 추가
private enqueue(kind: 'create' | 'update' | 'delete', filePath: string) {
  const event: FileChangeEvent = {
    kind,
    path: filePath,
    timestamp: new Date().toISOString(),
  };

  // p-queue를 사용한 동시성 제어 (기본 5개)
  this.queue.add(() => this.processLocalChange(event));
}

// 4. 처리 (로컬 → 원격)
private async processLocalChange(event: FileChangeEvent) {
  // 파일 파싱
  const task = await parseTaskFile(event.path);

  // 매핑 스토어에서 기존 매핑 조회
  const mapping = this.store.get(task.id);

  // 원격 태스크 조회
  const remoteTask = mapping?.remoteId
    ? await this.api.getTask(mapping.remoteId)
    : await this.api.findByExternalId(task.id);

  if (!remoteTask) {
    // 새로운 태스크 생성
    return await this.createRemoteTask(task, event.path);
  }

  // 기존 태스크 업데이트 (충돌 해결 포함)
  return await this.updateRemoteTask(task, remoteTask, event.path);
}
```

### 15.2 SQLite 매핑 스토어

#### A. 스키마

```sql
CREATE TABLE IF NOT EXISTS mappings (
  -- 기본 키
  localId TEXT PRIMARY KEY,          -- 로컬 파일 ID (파일명)
  filePath TEXT NOT NULL UNIQUE,     -- 파일 경로
  remoteId TEXT,                     -- 원격 태스크 ID

  -- 버전 관리
  etag TEXT,                         -- HTTP ETag (낙관적 잠금)
  remoteVersion INTEGER,             -- 원격 버전 번호

  -- 시간 추적
  lastSyncedAt TEXT NOT NULL,        -- 마지막 동기화 시간
  lastLocalUpdatedAt TEXT NOT NULL,  -- 로컬 마지막 수정 시간
  lastRemoteUpdatedAt TEXT,          -- 원격 마지막 수정 시간

  -- 메타데이터
  deletionPolicy TEXT NOT NULL DEFAULT 'archive',  -- archive|delete|ignore
  createdAt TEXT NOT NULL,           -- 레코드 생성 시간
  syncCount INTEGER NOT NULL DEFAULT 0,  -- 동기화 횟수

  -- 인덱스
  CREATE INDEX idx_remoteId ON mappings(remoteId);
  CREATE INDEX idx_filePath ON mappings(filePath);
  CREATE INDEX idx_lastSyncedAt ON mappings(lastSyncedAt);
);
```

#### B. 주요 작업

```typescript
// 1. 매핑 조회
get(localId: string): MappingRecord | null {
  const stmt = this.db.prepare('SELECT * FROM mappings WHERE localId = ?');
  return stmt.get(localId);
}

// 2. 매핑 저장
upsert(record: Partial<MappingRecord>) {
  const now = new Date().toISOString();
  const existing = this.get(record.localId);

  if (existing) {
    // UPDATE: 기존 레코드 갱신
    const stmt = this.db.prepare(`
      UPDATE mappings
      SET filePath = ?, remoteId = ?, etag = ?,
          lastSyncedAt = ?, lastLocalUpdatedAt = ?,
          lastRemoteUpdatedAt = ?, syncCount = syncCount + 1
      WHERE localId = ?
    `);
    stmt.run(...params);
  } else {
    // INSERT: 새 레코드 생성
    const stmt = this.db.prepare(`
      INSERT INTO mappings (
        localId, filePath, remoteId, etag, lastSyncedAt,
        lastLocalUpdatedAt, lastRemoteUpdatedAt, createdAt, syncCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(...params);
  }
}

// 3. 시간 갱신 (로컬 변경 시)
touchLocal(
  localId: string,
  lastLocalUpdatedAt: string,
  lastRemoteUpdatedAt?: string,
  etag?: string
) {
  const stmt = this.db.prepare(`
    UPDATE mappings
    SET lastLocalUpdatedAt = ?, lastRemoteUpdatedAt = ?, etag = ?, lastSyncedAt = ?
    WHERE localId = ?
  `);
  stmt.run(lastLocalUpdatedAt, lastRemoteUpdatedAt, etag, now, localId);
}

// 4. 폴링 기준점 조회 (마지막 동기화 이후 변경 감지)
async getMaxRemoteUpdatedAt(): Promise<string | null> {
  const stmt = this.db.prepare(`
    SELECT MAX(lastRemoteUpdatedAt) as maxDate
    FROM mappings
    WHERE lastRemoteUpdatedAt IS NOT NULL
  `);
  const row = stmt.get();
  return row?.maxDate || null;
}
```

**WAL 모드 최적화**:
```typescript
this.db.pragma('journal_mode = WAL');  // Write-Ahead Logging

// 장점:
// - 읽기와 쓰기가 동시에 가능
// - 충돌 감소
// - 더 빠른 성능
// - 멀티 스레드/프로세스 안전
```

### 15.3 충돌 해결 전략

#### A. 타임스탬프 기반 LWW (Last-Write-Wins)

```typescript
// 충돌 감지
const localTime = new Date(localTask.updatedAt).getTime();
const remoteTime = new Date(remoteTask.updatedAt).getTime();
const diff = localTime - remoteTime;

// 허용 드리프트 내 동시 변경: 로컬 우선
if (Math.abs(diff) <= config.clockDriftMs) {  // 기본 5초
  return 'local';  // 로컬 변경 우선 적용
}

// 명확한 시간 차이: 최신 우선
return localTime > remoteTime ? 'local' : 'remote';
```

**흐름도**:
```
두 버전 모두 변경됨?
├─ Yes: 타임스탬프 비교
│  ├─ 차이 < 5초: 로컬 우선
│  ├─ 로컬이 최신: 원격 업데이트
│  └─ 원격이 최신: 로컬 덮어쓰기
└─ No: 해당 버전 적용
```

#### B. 낙관적 잠금 (ETag)

```typescript
// 1. 원격 태스크 조회 시 ETag 받음
const remoteTask = await this.api.getTask(taskId);
// { id, title, ..., etag: "abc123" }

// 2. 업데이트 시 ETag 포함
const updated = await this.api.updateTask(
  taskId,
  newPayload,
  { ifMatch: remoteTask.etag }  // 조건부 업데이트
);

// 서버가 ETag 검증:
// - 일치: 업데이트 성공, 새 ETag 반환
// - 불일치: 409 Conflict 반환
// → 다시 조회 후 재시도
```

#### C. 충돌 로그

```typescript
const conflictResolver = new ConflictResolver(logger);

const resolution = conflictResolver.resolve({
  localTask: localTask,
  remoteTask: remoteTask,
  clockDriftMs: 5000,
});

// 결과
{
  winner: 'local',           // 승리자
  reason: 'latest_timestamp', // 이유
  localTimestamp: 1700000000,
  remoteTimestamp: 1699999990,
  driftMs: 10,               // 시간 차이
}

// 로그 기록
conflictResolver.logConflict(context, resolution);
// [WARN] 충돌 해결됨: localId=task-001, winner=local, driftMs=10
```

### 15.4 파일 감시 및 폴링

#### A. Chokidar 설정

```typescript
this.watcher = chokidar.watch(watchDir, {
  ignoreInitial: true,                      // 시작 시 기존 파일 무시
  awaitWriteFinish: {
    stabilityThreshold: 300,                // 300ms 동안 변경 없으면 처리
    pollInterval: 100,                      // 100ms마다 확인
  },
  ignored: /(^|[\/\\])\../,                 // .으로 시작하는 파일 무시
});

// 이벤트 핸들러
this.watcher.on('add', (filePath) => {
  this.enqueue('create', filePath);
});

this.watcher.on('change', (filePath) => {
  this.enqueue('update', filePath);
});

this.watcher.on('unlink', (filePath) => {
  this.enqueue('delete', filePath);
});

// 에러 처리
this.watcher.on('error', (error) => {
  this.logger.error({ error }, '파일 워처 에러');
});
```

**설정 주의사항**:
- `stabilityThreshold`: 너무 작으면 미완성 파일 처리, 너무 크면 지연
- `ignored`: 로그 파일, 임시 파일 제외 권장

#### B. 폴링 루프 (정기적 동기화)

```typescript
private startPolling(): void {
  this.pollInterval = setInterval(
    async () => {
      try {
        // 마지막 동기화 시점 이후 변경 조회
        const since = await this.store.getMaxRemoteUpdatedAt();
        const changed = await this.api.listUpdatedSince(since);

        if (changed.length === 0) {
          return;  // 변경 없음
        }

        // 원격 변경을 로컬 파일로 적용
        for (const remoteTask of changed) {
          try {
            const mapping = this.store.getByRemoteId(remoteTask.id);
            const filePath = mapping?.filePath || path.join(
              this.config.watchDir,
              pathFromTitle(remoteTask.title)
            );

            // 파일 쓰기
            await writeTaskFile(filePath, fromRemotePayload(remoteTask));

            // 매핑 업데이트
            this.store.linkOrUpdate(remoteTask, filePath);
          } catch (error) {
            this.logger.error({ remoteId: remoteTask.id, error }, '동기화 실패');
          }
        }
      } catch (error) {
        this.logger.error({ error }, '폴링 동기화 실패');
      }
    },
    this.config.pollIntervalMs  // 기본 30초
  );
}
```

**폴링 설계 고려사항**:
- **간격 설정**: 30-60초 권장 (API 부하 vs 지연 균형)
- **동시성**: 파일 워처와 폴링이 동시에 실행 가능
- **순서 보장**: 파일 워처가 우선, 폴링은 백업
- **API 호출**: 변경 없을 때도 호출 (가볍게 최적화)

### 15.5 트러블슈팅 및 Best Practices

#### A. 흔한 문제와 해결

**문제 1: 파일이 동기화되지 않음**

```typescript
// 체크리스트:
1. 파일 포맷 확인 (.json 또는 .md)
   └─ parseTaskFile이 지원하는 형식인가?

2. 감시 디렉터리 확인
   └─ SYNC_WATCH_DIR이 올바른 경로인가?

3. 스키마 검증
   └─ 필수 필드가 있는가? (id, title, updatedAt)

4. 로그 확인
   └─ LOG_LEVEL=debug로 상세 로그 확인

// 디버깅 예시
console.log('파일 감시 중:', {
  watchDir: resolveAbsolutePath(config.watchDir),
  watcherActive: !!this.watcher,
  queueSize: this.queue.size,
  pendingOperations: this.queue.pending,
});
```

**문제 2: 충돌이 계속 발생**

```typescript
// 원인:
1. 시스템 시간 동기화 문제
   └─ NTP 설정 확인
   └─ `date` 명령으로 시간 확인

2. clockDriftMs 값이 너무 작음
   └─ SYNC_CLOCK_DRIFT_MS=5000 (기본)
   └─ SYNC_CLOCK_DRIFT_MS=10000으로 증가

3. 로컬와 원격이 거의 동시에 변경됨
   └─ 정상 동작 (LWW로 자동 해결)
```

#### B. 성능 최적화

```typescript
// 1. 동시성 제어
this.queue = new PQueue({
  concurrency: config.concurrency,  // 기본 5
});
// 너무 높으면 API 부하, 너무 낮으면 처리 지연

// 2. 배치 처리
const batch = changed.slice(0, 10);  // 10개씩 처리
await Promise.all(batch.map(task => this.sync(task)));

// 3. 캐싱
const mapping = this.mappingCache.get(localId) || this.store.get(localId);

// 4. 폴링 간격 동적 조정
if (changed.length > 50) {
  // 변경 많음: 폴링 간격 단축
  pollIntervalMs = 15000;
} else if (changed.length === 0) {
  // 변경 없음: 폴링 간격 연장
  pollIntervalMs = 60000;
}
```

#### C. 모니터링

```typescript
// 헬스 체크
const health = engine.getHealth();
console.log('동기화 엔진 상태:', {
  healthy: health.healthy,
  lastSyncAt: health.lastSyncAt,
  pendingOperations: health.pendingOperations,
  stats: health.stats,
});

// 결과
{
  healthy: true,
  lastSyncAt: "2025-01-22T10:30:00.000Z",
  lastErrorAt: null,
  pendingOperations: 0,
  stats: {
    created: 10,
    updated: 5,
    deleted: 2,
    conflicts: 1,
    errors: 0,
    skipped: 0,
  }
}

// 커스텀 메트릭
class SyncMetrics {
  recordSync(operation: SyncOperation, durationMs: number) {
    // Prometheus에 푸시
    syncDuration.observe(durationMs);
    syncCount.inc({ operation });
  }
}
```

---

## 16. 원격 디스플레이 시스템 개요

### 16.1 왜 원격 디스플레이가 필요한가?

**산업 현장의 문제**:
```
작업자: 스마트폰으로 바코드 스캔
문제: 작은 화면에서 제작의뢰서 확인 어려움
해결: 큰 모니터에 자동으로 표시!
```

**시나리오**:
1. **커팅 라인**: 작업자가 바코드 스캔 → 커팅기 옆 모니터에 도면 표시
2. **코팅 라인**: 다른 작업자가 스캔 → 코팅기 모니터에 사양 표시
3. **검수 라인**: 검수원이 스캔 → 검수대 모니터에 체크리스트 표시

**기대 효과**:
- ✅ 작업 효율 **30% 향상** (확인 시간 단축)
- ✅ 오류 **80% 감소** (큰 화면으로 명확히 확인)
- ✅ 다중 라인 동시 운영 가능

---

### 16.2 시스템 아키텍처

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ 스마트폰     │         │ Next.js +    │         │ 원격 PC      │
│ (바코드 스캔)│  HTTPS  │ Socket.IO    │  WSS    │ (브라우저    │
│              │───────>│ 서버         │<───────│  확장)       │
└──────────────┘         └──────────────┘         └──────────────┘
       ↓                         ↓                        ↓
  주문번호 스캔            메시지 라우팅            탭 자동 생성
  POST /api/trigger    screenId 채널 전송      제작의뢰서 표시
```

**핵심 컴포넌트**:
1. **Socket.IO 서버**: 실시간 양방향 통신 (T-012, T-013)
2. **페어링 API**: WeChat 스타일 QR 페어링 (T-014)
3. **브라우저 확장**: Manifest V3, Service Worker (T-015~T-017)
4. **스마트폰 UI**: 디스플레이 선택 및 관리 (T-020)

**데이터 흐름**:
```
1. 스마트폰: 바코드 스캔 (J2025-001)
2. POST /api/trigger { screenId: "screen:본사:커팅라인", jobNo: "J2025-001" }
3. 서버: WebSocket으로 "screen:본사:커팅라인" 채널에 navigate 이벤트 전송
4. 브라우저 확장: 이벤트 수신 → chrome.tabs.create({ url: "/orders/J2025-001" })
5. 원격 PC: 새 탭에 제작의뢰서 자동 표시
```

---

## 17. 브라우저 확장 설치 및 설정 가이드

### 17.1 시스템 요구사항

**하드웨어**:
- PC/Mac/Linux (Chrome/Edge 지원)
- 디스플레이 (모니터, TV 등)
- 네트워크 (Wi-Fi 또는 유선)

**소프트웨어**:
- Chrome 93+ 또는 Edge 93+
- 인터넷 연결

**권장 사양**:
- RAM: 4GB 이상
- 화면: 24인치 이상 (작업자가 잘 보이도록)

---

### 17.2 확장 설치 방법

#### A. Chrome Web Store에서 설치 (프로덕션)

```
1. Chrome 브라우저 열기
2. https://chrome.google.com/webstore → "Vooster Display" 검색
3. [Chrome에 추가] 버튼 클릭
4. 권한 승인:
   - 탭 생성 및 관리
   - 저장소 사용
   - 알림 표시
5. 설치 완료 → Options 페이지 자동 오픈
```

#### B. Unpacked Extension 로드 (개발/테스트)

```bash
# 1. 확장 파일 다운로드 또는 빌드
cd extension/
npm install
npm run build
# → dist/ 폴더 생성

# 2. Chrome 확장 관리
chrome://extensions

# 3. 개발자 모드 활성화 (우상단 토글)

# 4. "압축해제된 확장 프로그램을 로드합니다" 클릭

# 5. extension/dist 폴더 선택

# 6. 설치 완료!
```

---

### 17.3 디스플레이 정보 설정

**Options 페이지 접속**:
```
방법 1: chrome://extensions → Vooster Display → [세부정보] → [확장 프로그램 옵션]
방법 2: 브라우저 우상단 확장 아이콘 클릭 → [설정]
```

**필수 입력 항목**:

| 항목 | 예시 | 설명 |
|------|------|------|
| **디스플레이 이름** | 커팅기-A3 | 작업자가 식별할 수 있는 이름 |
| **용도/라인** | 커팅 라인 | 어느 라인에서 사용하는지 |
| **조직** | 본사 | 조직 또는 지점 이름 (기본값 가능) |

**입력 완료 후**:
1. [저장] 버튼 클릭
2. 서버에 자동 등록
3. `screenId` 자동 생성 (예: `screen:본사:커팅라인`)
4. QR 코드 자동 표시 → 다음 단계

---

### 17.4 QR 코드 표시 및 승인 대기

**화면 구성**:
```
┌──────────────────────────────────────┐
│                                      │
│       Vooster 디스플레이 페어링      │
│                                      │
│       ┌────────────────────┐        │
│       │                    │        │
│       │   [QR CODE]        │        │
│       │   300x300px        │        │
│       │                    │        │
│       └────────────────────┘        │
│                                      │
│   스마트폰으로 이 QR을 스캔하세요    │
│                                      │
│   남은 시간: 4분 30초                │
│   ⏳ 승인 대기 중...                 │
│                                      │
└──────────────────────────────────────┘
```

**대기 중 동작**:
- 3초마다 서버 폴링 (GET /api/pair/poll/:sessionId)
- 카운트다운 표시 (300초부터 감소)
- 승인 감지 시 자동으로 다음 화면 전환

**승인 완료 후**:
```
✅ 페어링 완료!
   연결 중...

→ 3초 후 대시보드로 자동 전환
```

---

### 17.5 연결 상태 대시보드

**메인 화면**:
```
┌──────────────────────────────────────┐
│ 🟢 연결됨                      [⚙️]  │
├──────────────────────────────────────┤
│                                      │
│  디스플레이 정보                     │
│  ━━━━━━━━━━━━━━━━                    │
│  이름: 커팅기-A3                     │
│  용도: 커팅 라인                     │
│  조직: 본사                          │
│  Screen ID: screen:본사:커팅라인     │
│                                      │
│  연결 상태                           │
│  ━━━━━━━━━━━━━━━━                    │
│  WebSocket: 연결됨 ✅                │
│  마지막 동기화: 5초 전               │
│  Heartbeat: 정상 ✅                  │
│                                      │
│  [페어링 해제]                       │
│                                      │
└──────────────────────────────────────┘
```

**상태 배지**:
- 🟢 **연결됨**: WebSocket 정상, heartbeat 60초 이내
- 🟡 **재연결 중**: 일시적 네트워크 단절
- ⚪ **연결 안됨**: WebSocket 끊김
- 🔴 **오류**: 인증 실패 또는 서버 오류

**Heartbeat**:
- 30초마다 POST /api/displays/register 자동 전송
- 서버가 last_seen_at 업데이트
- 60초 이상 미갱신 시 "offline" 처리

---

### 17.6 문제 해결

| 문제 | 원인 | 해결 방법 |
|------|------|---------|
| QR 코드가 표시되지 않음 | 서버 연결 실패 | 네트워크 확인, API URL 확인 |
| 5분 대기 후 만료됨 | 스마트폰에서 승인 안함 | QR 재생성 (새로고침) |
| 연결 안됨 상태 | WebSocket 연결 실패 | WS URL 확인, 방화벽 확인 |
| Heartbeat 실패 | 서버 응답 없음 | 서버 로그 확인, 재시작 |
| 페어링 해제 안됨 | Storage 권한 문제 | chrome://extensions → 권한 확인 |

---

## 18. 스마트폰 페어링 가이드 (WeChat 스타일)

### 18.1 페어링 플로우 전체

```
[원격 PC]                          [스마트폰]
─────────────────────────          ─────────────────────────
1. 확장 설치
2. 디스플레이 정보 입력
3. QR 코드 표시
   ⏳ 대기 중...                    4. 설정 → 디스플레이 추가
                                    5. 기존 바코드 스캐너로 QR 스캔
                                    6. "커팅기-A3 추가?" 확인
                                    7. [추가] 버튼 클릭
                                       ↓
                                    POST /api/pair/approve
                                       ↓
8. 승인 감지! ✅                    8. "페어링 완료!" 토스트
9. 토큰 저장                       9. screenId 저장
10. WebSocket 연결
11. 대시보드 표시                  10. 디스플레이 목록으로 복귀

→ 이제 바코드 스캔 시 자동으로 원격 PC에 표시됩니다!
```

**소요 시간**: 약 30초

---

### 18.2 스마트폰 UI 상세

#### A. 설정 메뉴 접근

**바코드 스캔 페이지**:
```
┌──────────────────────────────────────┐
│  Vooster               [⚙️ 설정]    │
├──────────────────────────────────────┤
│                                      │
│      [카메라 뷰]                     │
│                                      │
│      바코드를 스캔하세요             │
│                                      │
└──────────────────────────────────────┘
```

우상단 [⚙️ 설정] 클릭 →  설정 메뉴 표시

---

#### B. 디스플레이 관리 화면

```
┌──────────────────────────────────────┐
│  ← 디스플레이 관리                   │
├──────────────────────────────────────┤
│                                      │
│  현재 연결:                          │
│  📟 커팅기-A3 (커팅 라인)           │
│  [연결 끊기]                         │
│                                      │
│  ──────────────────────                │
│                                      │
│  사용 가능한 디스플레이:             │
│                                      │
│  ┌────────────────────────┐         │
│  │ 📟 커팅기-A3           │         │
│  │ 커팅 라인              │         │
│  │ 🟢 온라인 · 5초 전     │         │
│  └────────────────────────┘         │
│                                      │
│  ┌────────────────────────┐         │
│  │ 💻 후가공-B2           │         │
│  │ 코팅 라인              │         │
│  │ ⚪ 오프라인 · 2분 전    │         │
│  └────────────────────────┘         │
│                                      │
│  [+ 새 디스플레이 추가 (QR)]        │
│                                      │
└──────────────────────────────────────┘
```

---

#### C. QR 스캔 모드

**[+ 새 디스플레이 추가] 버튼 클릭 시**:

```
1. 바코드 스캔 페이지로 이동 (?mode=pairing 파라미터)
2. 안내 메시지: "PC 화면의 QR을 스캔하세요"
3. QR 인식 → 자동으로 페어링 데이터 추출
4. 확인 모달 표시
```

**확인 모달**:
```
┌──────────────────────────────────────┐
│                                      │
│   디스플레이 추가                     │
│                                      │
│   📟 커팅기-A3                       │
│   커팅 라인 · 본사                   │
│                                      │
│   이 디스플레이를 추가하시겠습니까?   │
│                                      │
│   [취소]             [추가하기]      │
│                                      │
└──────────────────────────────────────┘
```

[추가하기] 클릭 → POST /api/pair/approve → 완료!

---

### 18.3 페어링 완료 후 사용

**일상 사용 플로우**:
```
1. 스마트폰: 바코드 스캔 (J2025-001)
2. 자동 전송: pairedScreenId로 POST /api/trigger
3. 원격 PC: 탭 자동 생성
4. 작업자: 큰 화면 확인 후 작업 진행
```

**페어링 정보는 localStorage에 영구 저장**:
- 앱 재시작해도 유지
- 로그아웃해도 유지 (디바이스 단위)
- 수동으로 연결 끊기 전까지 계속 사용

---

## 19. ngrok 개발 환경 및 실제 기기 테스트

### 19.1 왜 ngrok이 필요한가?

**문제**:
```
로컬 개발: http://localhost:3000
스마트폰: localhost에 접근 불가 ❌
카메라 권한: HTTPS에서만 허용 ❌
```

**해결**:
```
ngrok: https://abc123.ngrok.io (HTTPS 터널)
스마트폰: 외부에서 접속 가능 ✅
카메라 권한: HTTPS이므로 허용 ✅
```

---

### 19.2 ngrok 설치 및 실행

#### Mac/Linux
```bash
# Homebrew로 설치
brew install ngrok

# 계정 가입 (무료)
https://dashboard.ngrok.com/signup

# 인증 토큰 설정
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Next.js 서버 실행
npm run dev

# 별도 터미널에서 ngrok 실행
ngrok http 3000

# 출력:
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

#### Windows
```powershell
# Chocolatey로 설치
choco install ngrok

# 또는 수동 다운로드
https://ngrok.com/download

# 나머지 동일
ngrok http 3000
```

---

### 19.3 환경변수 설정

**`.env.local` 파일 업데이트**:
```bash
# ngrok URL로 변경
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io

# WebSocket URL (WSS로 자동 업그레이드)
WS_URL=wss://abc123.ngrok.io/display

# 재시작
npm run dev
```

**주의사항**:
- ngrok 재시작 시 URL 변경됨 (무료 플랜)
- 고정 도메인 원하면 유료 플랜 ($8/월)

---

### 19.4 스마트폰 실제 기기 테스트

#### 체크리스트

**[ ] 1단계: 기본 접속**
```
1. 스마트폰 브라우저에서 ngrok URL 접속
2. HTTPS 인증서 확인 (🔒 표시)
3. 메인 페이지 로딩 확인
```

**[ ] 2단계: 카메라 권한**
```
1. 바코드 스캔 페이지 접속
2. 카메라 권한 요청 팝업 표시 확인
3. [허용] 클릭
4. 카메라 프리뷰 표시 확인
```

**[ ] 3단계: 바코드 스캔**
```
1. 샘플 바코드 준비 (인쇄 또는 화면)
2. 카메라로 바코드 조준
3. 자동 인식 확인 (1-3초 이내)
4. 주문 상세 페이지 표시 확인
```

**[ ] 4단계: 디스플레이 페어링**
```
1. 설정 메뉴 접근
2. 디스플레이 목록 조회 (GET /api/displays)
3. QR 스캔 모드 전환
4. PC 확장 QR 스캔
5. 승인 모달 표시 → [추가] 클릭
6. 페어링 완료 토스트 확인
```

**[ ] 5단계: 원격 탭 생성**
```
1. 바코드 스캔
2. POST /api/trigger 호출 확인 (Network 탭)
3. 원격 PC 브라우저에 탭 자동 생성 확인
4. 제작의뢰서 내용 일치 확인
```

---

### 19.5 성능 측정

```javascript
// src/lib/performance.ts
export function measureE2E() {
  const start = performance.now()

  // 바코드 스캔
  scanner.onDetected = async (code) => {
    const detected = performance.now()
    console.log(`스캔 인식: ${detected - start}ms`)

    // API 호출
    const apiStart = performance.now()
    await fetch('/api/trigger', { body: { jobNo: code } })
    const apiEnd = performance.now()
    console.log(`API 응답: ${apiEnd - apiStart}ms`)

    // 원격 탭 생성 (ACK 대기)
    // ...

    console.log(`전체 E2E: ${performance.now() - start}ms`)
  }
}

// 목표:
// 스캔 인식: < 2000ms
// API 응답: < 200ms
// E2E: < 500ms (로컬), < 2000ms (ngrok)
```

---

### 19.6 문제 해결

**Q: ngrok URL에 접속이 안됨**
```
A1: ngrok이 실행 중인지 확인 (터미널에 Forwarding 표시)
A2: Next.js 서버가 실행 중인지 확인 (npm run dev)
A3: 방화벽 확인 (Mac: 시스템 설정 → 보안 → 방화벽)
```

**Q: 카메라 권한이 계속 거부됨 (iOS Safari)**
```
A: 설정 → Safari → 카메라 → "허용" 선택
   브라우저 재시작 후 다시 시도
```

**Q: ngrok 대역폭 초과 (1GB/월)**
```
A: 유료 플랜으로 업그레이드 ($8/월, 무제한)
   또는 이미지 최적화 (WebP, lazy load)
```

---

## 20. 데모데이 운영 가이드 (2025-10-27)

### 20.1 사전 준비 체크리스트 (10/26)

**[ ] 하드웨어 준비**
- [ ] 디스플레이 PC 1대 (Chrome 설치)
- [ ] 대형 모니터 또는 TV (24인치 이상)
- [ ] HDMI 케이블 및 전원
- [ ] Wi-Fi 또는 LTE 핫스팟

**[ ] 소프트웨어 설정**
- [ ] 브라우저 확장 빌드 (npm run build)
- [ ] 확장 설치 및 페어링 완료
- [ ] ngrok 실행 및 URL 확인
- [ ] 환경변수 업데이트 (.env.local)
- [ ] Next.js 서버 실행 확인

**[ ] 콘텐츠 준비**
- [ ] 샘플 바코드 10개 생성 (scripts/generate-barcodes.js)
- [ ] A4 용지에 인쇄 (또는 PDF)
- [ ] 참가자용 QR 코드 (ngrok URL) 인쇄
- [ ] 튜토리얼 화면 준비 (3초 자동 닫힘)

**[ ] 테스트**
- [ ] 스마트폰으로 앱 접속 확인
- [ ] 샘플 바코드 스캔 → 원격 탭 생성 확인
- [ ] 동시 스캔 시나리오 (5대 동시)
- [ ] 네트워크 안정성 확인

---

### 20.2 샘플 바코드 생성

```bash
# scripts/generate-barcodes.js 실행
npm install jsbarcode canvas
node scripts/generate-barcodes.js

# 출력:
생성: J2025-001.png (명함)
생성: J2025-002.png (전단지)
생성: J2025-003.png (포스터)
...
생성: J2025-010.png (스티커)

# PDF로 변환 (인쇄용)
node scripts/barcodes-to-pdf.js
# → public/demo-barcodes.pdf
```

**바코드 레이아웃**:
```
┌─────────────────────────────────────┐
│  [바코드 이미지]                     │
│  |||||| |||| |||||                  │
│                                     │
│  J2025-001                          │
│  명함 인쇄                           │
│  수량: 1,000장 · 양면 컬러          │
└─────────────────────────────────────┘
```

---

### 20.3 데모 시나리오

#### 시나리오 1: 기본 체험 (5분)

```
1. 진행자: "스마트폰으로 이 QR을 스캔해주세요"
   → 참가자용 QR 코드 (앱 접속)

2. 참가자: QR 스캔 → 앱 열림
   → "Vooster에 오신 것을 환영합니다!"

3. 진행자: "테이블의 바코드 중 하나를 스캔해보세요"
   → 샘플 바코드 10개 제시

4. 참가자: 바코드 스캔 (예: J2025-001)

5. [Magic Moment! ✨]
   → 큰 화면에 제작의뢰서 자동 표시!

6. 진행자: "스마트폰에서도 확인할 수 있습니다"
   → 스마트폰 화면 확대해서 보여주기

7. 피드백 수집
```

---

#### 시나리오 2: 다중 사용자 (10분)

```
1. 참가자 5명 동시 체험

2. 각자 다른 바코드 스캔:
   - 참가자 A: J2025-001
   - 참가자 B: J2025-002
   - 참가자 C: J2025-003
   ...

3. 큰 화면이 순차적으로 전환:
   A의 주문 → B의 주문 → C의 주문 ...

4. 진행자: "실제 현장에서는 각 라인마다 전용 디스플레이가 있어서
             동시에 작업해도 충돌이 없습니다"

5. 피드백: "현장에서 어떻게 활용할 수 있을까요?"
```

---

### 20.4 문제 발생 시 대응

| 상황 | 대응 방법 |
|------|---------|
| **앱 접속 안됨** | ngrok 재시작, URL 재확인 |
| **바코드 인식 안됨** | 조명 켜기, 바코드 재인쇄 |
| **화면에 안뜸** | PC 확장 상태 확인, 재페어링 |
| **느림** | 네트워크 확인, 서버 재시작 |
| **동시 스캔 충돌** | "한 명씩 순서대로" 안내 |

---

### 20.5 피드백 수집

**질문 리스트**:
1. 바코드 인식 속도는 만족스러웠나요? (1-5점)
2. 큰 화면에 표시되는 것이 도움이 되나요?
3. 실제 현장에서 사용하고 싶으신가요?
4. 개선이 필요한 부분은 무엇인가요?
5. 추가로 필요한 기능은 무엇인가요?

**피드백 기록**:
- Google Forms 또는 종이 설문지
- 즉석 인터뷰 및 녹음 (동의 하에)
- 사진/영상 촬영 (SNS 업로드용)

---

### 20.6 데모 후 정리

**[ ] 데이터 백업**
- [ ] 로그 파일 저장
- [ ] 피드백 데이터 정리
- [ ] 사진/영상 아카이빙

**[ ] 서버 종료**
- [ ] ngrok 중단
- [ ] Next.js 서버 중단
- [ ] PC 확장 비활성화 (선택적)

**[ ] 보고서 작성**
- [ ] 참가자 수 및 만족도
- [ ] 발견된 버그 및 이슈
- [ ] 개선 아이디어
- [ ] 다음 단계 계획

---

**작성자**: 신우진
**프로젝트**: Vooster
**버전**: 2.0
**최종 업데이트**: 2025-10-23
