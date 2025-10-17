# 바코드 스캔 페이지 리팩토링 설계 문서

> 바코드 스캔 ↔ 제작의뢰서 완전 분리 설계
> **작성일**: 2025-10-17
> **버전**: 1.0
> **작성자**: Claude Code

---

## 목차

1. [현재 구조 분석](#1-현재-구조-분석)
2. [User Flow & 시나리오](#2-user-flow--시나리오)
3. [와이어프레임](#3-와이어프레임)
4. [기술 설계](#4-기술-설계)
5. [구현 계획](#5-구현-계획)
6. [체크리스트](#6-체크리스트)

---

# 1. 현재 구조 분석

## 1.1 페이지 계층 구조

```
/src/app/scan/page.tsx (Main Page)
│
├── 상태 관리 (useState)
│   ├── scannedBarcode: string | null
│   ├── isScannerCollapsed: boolean
│   ├── scanHistory: BarcodeResult[]
│   ├── continuousScanMode: boolean
│   ├── scanStatus: 'idle' | 'waiting' | 'success' | 'error'
│   ├── lastScanTime: number
│   ├── scanCooldown: boolean
│   └── lastScannedBarcode: string | null
│
├── BarcodeSection (_components/BarcodeSection.tsx)
│   ├── CameraProvider (카메라 Context)
│   │   ├── CollapsedScanner (접힌 상태)
│   │   │   ├── 헤더 (타이틀, 상태, 버튼)
│   │   │   └── 최근 스캔 내역 (3개)
│   │   │
│   │   └── ExpandedScanner (펼쳐진 상태)
│   │       ├── 헤더 (타이틀, 타임아웃, 버튼)
│   │       ├── 경고 배너
│   │       ├── BarcodeScannerFlow
│   │       │   ├── CameraPermissionPrompt
│   │       │   ├── CameraDeviceSelector
│   │       │   ├── Video Preview
│   │       │   ├── BarcodeScanner
│   │       │   └── 스캔 시작/중지 버튼
│   │       └── 타임아웃 카운트다운
│   │
│   └── Props Flow
│       ├── onBarcodeDetected
│       ├── onToggleCollapse
│       ├── onSelectFromHistory
│       ├── onOpenScanner
│       └── onStopContinuousScan
│
└── JobOrderSection (_components/JobOrderSection.tsx)
    ├── React Query (데이터 fetching)
    │   ├── queryKey: ['jobOrderReport', barcode]
    │   ├── staleTime: 5분
    │   └── fetchJobOrderReport()
    │
    ├── 로딩 상태
    │   ├── 스켈레톤 UI
    │   └── 스피너
    │
    ├── 에러 상태
    │   ├── 에러 메시지
    │   └── 재시도 버튼
    │
    └── 성공 상태
        ├── 핵심 정보 요약 카드
        ├── 상세 정보 Accordion
        ├── ThumbnailGrid (이미지)
        └── 인쇄용 숨겨진 콘텐츠
```

---

## 1.2 현재 동작 방식

### 바코드 스캔 프로세스
```
1. 사용자가 카메라 권한 허용
   ↓
2. 카메라 디바이스 선택
   ↓
3. [스캔 시작] 버튼 클릭
   ↓
4. BarcodeScanner가 실시간으로 바코드 감지
   ↓
5. 바코드 감지 → handleBarcodeDetected()
   ├─ 형식 검증 (정규식: ^\d{6}-[A-Z]{3}-\d{4}_\d{2}$)
   ├─ 중복 검사 (쿨다운 1.5초)
   ├─ 스캔 내역 업데이트
   ├─ 연속 스캔 모드 활성화
   └─ JobOrderSection으로 스크롤 (smooth)
   ↓
6. JobOrderSection 렌더링
   ├─ API 호출 (/api/orders/job-order-report)
   ├─ React Query 캐싱
   └─ 제작의뢰서 표시
```

### 연속 스캔 모드
```
활성화:
- 첫 바코드 스캔 시 자동
- 스캐너를 접지 않고 유지

타임아웃:
- 30초 미사용 시 자동 해제
- 매초 카운트다운 표시 (10초 이하일 때)
- lastScanTime 기준으로 계산

쿨다운:
- 1.5초 중복 스캔 방지
- 동일 바코드 연속 스캔 무시
```

---

## 1.3 현재 문제점

### UX 문제
1. **스크롤 기반 네비게이션**: 스캐너와 제작의뢰서가 같은 페이지에 있어 혼란
2. **집중도 저하**: 두 가지 작업이 한 화면에 공존
3. **스크롤 불편**: 스마트폰에서 스크롤로 이동하는 것이 비효율적
4. **설정 불가**: 카메라, 스캔 옵션을 변경할 수 없음
5. **제한적 히스토리**: 최근 3개만 표시

### 기술적 문제
1. **상태 분산**: 8개의 상태가 한 컴포넌트에 집중
2. **복잡한 타이머 관리**: 3개의 타이머 ref 관리
3. **props drilling**: 깊은 컴포넌트 계층에 props 전달
4. **설정 하드코딩**: 쿨다운, 타임아웃 등이 코드에 박혀있음

---

# 2. User Flow & 시나리오

## 2.1 개선된 User Flow

### 전체 흐름도
```
┌─────────────────┐
│  앱 실행/접속   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│   🎯 바코드 스캔 화면 (초기)    │ ← 전체 화면
│                                 │
│  - 카메라 실시간 영상 (75%)     │
│  - 카메라 설정 영역 (25%)       │
│  - 헤더: [⚙️ 설정] [🔄 히스토리]│
│                                 │
└───────┬────────────┬────────────┘
        │            │
        │            │ [⚙️] 클릭
        │            ↓
        │      ┌─────────────┐
        │      │ 설정 모달   │
        │      │ - 플래시    │
        │      │ - 자동초점  │
        │      │ - 쿨다운    │
        │      │ - 테마      │
        │      └─────────────┘
        │
        │ 바코드 감지 ✅
        ↓
┌─────────────────────────────────┐
│ 📄 제작의뢰서 화면 (전체 화면)  │ ← 뷰 전환
│                                 │
│  - 핵심 정보 요약               │
│  - 상세 정보 Accordion          │
│  - 이미지 썸네일 그리드         │
│  - 헤더: [← 스캔] [인쇄]        │
│                                 │
└───────┬─────────────────────────┘
        │
        │ [← 스캔] 클릭
        ↓
  다시 바코드 스캔 화면으로
```

---

## 2.2 사용자 시나리오

### 시나리오 A: 신규 사용자 (첫 스캔)
```
1. 앱 접속
   → 바코드 스캔 화면 표시

2. 카메라 권한 요청 팝업
   → [허용] 클릭

3. 카메라 선택 (자동: 후면 카메라)
   → 실시간 영상 표시

4. [📸 스캔 시작] 버튼 클릭
   → 바코드 감지 시작

5. 바코드를 카메라에 비춤
   → ✅ 감지 성공 (진동)

6. 자동으로 제작의뢰서 화면으로 전환
   → 제작의뢰서 전체 화면 표시

7. 상세 정보 확인
   → Accordion 펼치기

8. 이미지 확인
   → 썸네일 클릭 → Swiper 줌

9. [← 스캔] 버튼 클릭
   → 다시 스캔 화면으로
```

### 시나리오 B: 숙련 사용자 (연속 스캔)
```
1. 앱 접속
   → 바코드 스캔 화면

2. 카메라 자동 활성화 (이전 설정 기억)
   → 바로 스캔 가능

3. 첫 번째 바코드 스캔
   → 제작의뢰서 화면 전환

4. 빠르게 확인 후 [← 스캔] 클릭
   → 스캔 화면 복귀 (연속 모드 유지)

5. 두 번째 바코드 스캔
   → 제작의뢰서 화면 전환

6. 반복...

7. [🔄 히스토리] 클릭
   → 최근 20개 스캔 목록 확인
   → 원하는 항목 클릭
   → 해당 제작의뢰서로 이동
```

### 시나리오 C: 설정 변경
```
1. 스캔 화면에서 [⚙️ 설정] 클릭
   → 설정 모달 열림

2. 플래시 ON 설정
   → 저장

3. 쿨다운 2초로 변경
   → 저장

4. 테마 다크모드 선택
   → 저장 및 모달 닫기

5. 변경된 설정으로 스캔 진행
   → 플래시 켜진 상태로 스캔
```

---

## 2.3 상태 머신 (State Machine)

```
┌──────────────┐
│   SCANNER    │ ← 초기 상태
│    (idle)    │
└──────┬───────┘
       │ [스캔 시작]
       ↓
┌──────────────┐
│   SCANNER    │
│  (scanning)  │
└──────┬───────┘
       │ 바코드 감지
       ↓
┌──────────────┐
│   SCANNER    │
│  (success)   │ ← 0.3초 피드백
└──────┬───────┘
       │ 뷰 전환 (viewMode)
       ↓
┌──────────────┐
│    REPORT    │
│  (loading)   │ ← API 호출
└──────┬───────┘
       │ 데이터 로드 완료
       ↓
┌──────────────┐
│    REPORT    │
│   (loaded)   │
└──────┬───────┘
       │ [← 스캔] 클릭
       ↓
┌──────────────┐
│   SCANNER    │ ← 순환
│  (waiting)   │
└──────────────┘

이벤트:
- scan_start: 스캔 시작
- barcode_detected: 바코드 감지
- view_report: 제작의뢰서 보기
- back_to_scanner: 스캔 화면 복귀
- open_settings: 설정 열기
- open_history: 히스토리 열기
```

---

# 3. 와이어프레임

## 3.1 모바일 - 바코드 스캔 화면 (초기)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚙️ 설정      바코드 스캐너     🔄 히스토리 ┃ ← Header (56px)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃
┃   ┌──────────────────────────────┐    ┃
┃   │                              │    ┃
┃   │   📹 카메라 실시간 영상      │    ┃
┃   │                              │    ┃
┃   │   ┌────────────────────┐    │    ┃
┃   │   │                    │    │    ┃
┃   │   │  [스캔 영역 가이드] │    │    ┃ 75%
┃   │   │  "바코드를 여기에"  │    │    ┃ viewport
┃   │   │                    │    │    ┃
┃   │   └────────────────────┘    │    ┃
┃   │                              │    ┃
┃   └──────────────────────────────┘    ┃
┃                                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃
┃  📹 후면 카메라                [변경]  ┃
┃  🔦 플래시: OFF [ON]  🎯 자동초점 ON  ┃ 25%
┃                                        ┃ viewport
┃  ┌────────────────────────────────┐   ┃
┃  │       📸 스캔 시작하기          │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  최근 스캔: 202509-FUJ-0020_00        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 3.2 모바일 - 제작의뢰서 화면 (전환 후)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ← 스캔        제작의뢰서       인쇄 🖨️  ┃ ← Header (56px)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ↓ 스크롤 가능 영역                     ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 📄 202509-FUJ-0020_00          │   ┃
┃  │                                │   ┃
┃  │ 품목: 명함                     │   ┃
┃  │ 수량: 1,000매                  │   ┃
┃  │ 거래처: (주)ABC                │   ┃
┃  │ 긴급: 🔴 긴급                  │   ┃
┃  │ 배송일: 2025-09-15             │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ ▶ 📋 상세 정보 보기            │   ┃ ← Accordion
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  🖼️ 이미지 미리보기 (6장)            ┃
┃  ┌─────┐ ┌─────┐ ┌─────┐           ┃
┃  │  1  │ │  2  │ │  3  │           ┃
┃  │ P.1 │ │ P.2 │ │ P.3 │           ┃
┃  └─────┘ └─────┘ └─────┘           ┃
┃  ┌─────┐ ┌─────┐ ┌─────┐           ┃
┃  │  4  │ │  5  │ │  6  │           ┃
┃  │ P.4 │ │ P.5 │ │ P.6 │           ┃
┃  └─────┘ └─────┘ └─────┘           ┃
┃                                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │        ← 다시 스캔하기          │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 3.3 설정 모달 (⚙️ 클릭 시)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              ⚙️ 스캔 설정               ┃
┃                                   [✕]  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                        ┃
┃  📹 카메라 설정                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 🔦 플래시                      │   ┃
┃  │ ○ 자동  ● OFF  ○ ON            │   ┃
┃  └────────────────────────────────┘   ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 🎯 자동 초점                   │   ┃
┃  │ ● 활성화  ○ 비활성화           │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  📸 스캔 설정                          ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 중복 방지 쿨다운               │   ┃
┃  │ ━━●━━━━━━━━━━ 1.5초           │   ┃
┃  │ 1초          2초          3초  │   ┃
┃  └────────────────────────────────┘   ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 자동 종료 타임아웃             │   ┃
┃  │ ━━━━━━●━━━━━━━ 30초           │   ┃
┃  │ 15초         30초         60초 │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  🔔 피드백 설정                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ ☑️ 진동 피드백 (성공 시)        │   ┃
┃  │ ☑️ 소리 피드백 (성공 시)        │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  🎨 테마 설정                          ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ ○ 라이트  ○ 다크  ● 시스템     │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ┌──────────┐         ┌───────────┐  ┃
┃  │  취소    │         │   저장    │  ┃
┃  └──────────┘         └───────────┘  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 3.4 히스토리 드로어 (🔄 클릭 시) - 모바일

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                        ┃
┃         (배경: 스캔 화면)               ┃
┃                                        ┃
┃                                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ ← 하단에서 올라옴
┃ ━━━━━━                          [✕]   ┃ ← Drag Handle
┃                                        ┃
┃  🔄 스캔 내역 (20개)                   ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 🔍 검색...                     │   ┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 202509-FUJ-0020_00             │   ┃
┃  │ 방금 전 · 명함                 │ →┃
┃  └────────────────────────────────┘   ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 202509-ABC-0015_01             │   ┃
┃  │ 5분 전 · 브로셔                │ →┃
┃  └────────────────────────────────┘   ┃
┃  ┌────────────────────────────────┐   ┃
┃  │ 202509-XYZ-0032_00             │   ┃
┃  │ 1시간 전 · 전단지              │ →┃
┃  └────────────────────────────────┘   ┃
┃                                        ┃
┃  ... (17개 더)                         ┃
┃                                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │      🗑️ 전체 삭제               │   ┃
┃  └────────────────────────────────┘   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 3.5 데스크톱 - 바코드 스캔 화면

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚙️ 설정            바코드 스캐너              🔄 히스토리      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                ┃
┃         ┌────────────────────────────────────────┐            ┃
┃         │                                        │            ┃
┃         │         📹 카메라 실시간 영상          │            ┃
┃         │                                        │            ┃
┃         │        ┌──────────────────┐           │            ┃
┃         │        │                  │           │            ┃
┃         │        │ [스캔 영역 가이드]│           │            ┃
┃         │        │ "바코드를 여기에" │           │            ┃
┃         │        │                  │           │            ┃
┃         │        └──────────────────┘           │            ┃
┃         │                                        │            ┃
┃         └────────────────────────────────────────┘            ┃
┃                                                                ┃
┃         📹 후면 카메라                           [변경]        ┃
┃         🔦 플래시: OFF [ON]  🎯 자동초점: ON [OFF]            ┃
┃                                                                ┃
┃         ┌────────────────────────────────────────┐            ┃
┃         │             📸 스캔 시작하기            │            ┃
┃         └────────────────────────────────────────┘            ┃
┃                                                                ┃
┃         최근 스캔: [202509-FUJ-0020_00] [202509-ABC-0015_01]  ┃
┃                                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 3.6 화면 전환 애니메이션 시나리오

### 스캔 → 제작의뢰서
```
Frame 1 (0ms):
┌─────────────┐
│   Scanner   │ ← opacity: 1, x: 0
│   (visible) │
└─────────────┘

Frame 2 (100ms):
┌─────────────┐  ┌─────────────┐
│   Scanner   │  │   Report    │ ← opacity: 0.3, x: 100
│  (fading)   │  │  (entering) │
└─────────────┘  └─────────────┘

Frame 3 (200ms):
  ┌─────────────┐  ┌─────────────┐
  │   Scanner   │  │   Report    │ ← opacity: 0.7, x: 50
  │   (exiting) │  │  (sliding)  │
  └─────────────┘  └─────────────┘

Frame 4 (300ms):
                   ┌─────────────┐
                   │   Report    │ ← opacity: 1, x: 0
                   │  (visible)  │
                   └─────────────┘

애니메이션:
- Duration: 300ms
- Easing: ease-in-out
- Effect: Fade + Slide
- 진동: 200ms (성공 시)
```

---

# 4. 기술 설계

## 4.1 새로운 컴포넌트 구조

```
src/app/scan/
├── page.tsx (Orchestrator)
│   ├── viewMode: 'scanner' | 'report'
│   ├── scannerSettings: ScannerSettings
│   ├── scanHistory: BarcodeResult[]
│   └── 뷰 전환 로직
│
├── _components/
│   ├── ScannerView.tsx (NEW)
│   │   ├── Header (설정, 히스토리)
│   │   ├── CameraProvider
│   │   ├── BarcodeScanner
│   │   ├── 카메라 컨트롤
│   │   └── 최근 스캔 표시
│   │
│   ├── ReportView.tsx (NEW)
│   │   ├── Header (뒤로, 인쇄)
│   │   ├── 핵심 정보 카드
│   │   ├── Accordion (상세 정보)
│   │   └── ThumbnailGrid
│   │
│   ├── SettingsModal.tsx (NEW)
│   │   ├── 카메라 설정
│   │   ├── 스캔 설정
│   │   ├── 피드백 설정
│   │   └── 테마 설정
│   │
│   ├── HistoryDrawer.tsx (NEW)
│   │   ├── 검색 입력
│   │   ├── 스캔 내역 리스트
│   │   └── 삭제 기능
│   │
│   ├── BarcodeSection.tsx (기존, 통합됨)
│   └── JobOrderSection.tsx (기존, 통합됨)
│
├── _hooks/
│   ├── useScannerSettings.ts (NEW)
│   │   └── LocalStorage 기반 설정 관리
│   │
│   └── useScanHistory.ts (NEW)
│       └── LocalStorage 기반 히스토리 관리
│
└── _types/
    └── settings.ts (NEW)
        └── ScannerSettings 인터페이스
```

---

## 4.2 상태 관리 전략

### 뷰 상태
```typescript
// page.tsx
type ViewMode = 'scanner' | 'report';
const [viewMode, setViewMode] = useState<ViewMode>('scanner');

// 뷰 전환 함수
const switchToReport = (barcode: string) => {
  setScannedBarcode(barcode);
  setViewMode('report');
};

const switchToScanner = () => {
  setViewMode('scanner');
  setContinuousScanMode(true);
};
```

### 설정 상태 (Custom Hook)
```typescript
// _hooks/useScannerSettings.ts
export interface ScannerSettings {
  // 카메라
  flashMode: 'auto' | 'on' | 'off';
  autoFocus: boolean;

  // 스캔
  cooldownMs: number; // 1000, 1500, 2000
  timeoutSeconds: number; // 15, 30, 60

  // 피드백
  vibrationEnabled: boolean;
  soundEnabled: boolean;

  // 기타
  rememberLastCamera: boolean;
}

export function useScannerSettings() {
  const [settings, setSettings] = useState<ScannerSettings>(() => {
    // LocalStorage에서 로드
    const saved = localStorage.getItem('scanner-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const saveSettings = (newSettings: ScannerSettings) => {
    setSettings(newSettings);
    localStorage.setItem('scanner-settings', JSON.stringify(newSettings));
  };

  return { settings, saveSettings };
}
```

### 히스토리 상태 (Custom Hook)
```typescript
// _hooks/useScanHistory.ts
export interface ScanHistoryItem {
  barcode: string;
  timestamp: number;
  format: string;
  itemName?: string; // API 응답에서 추가 가능
}

export function useScanHistory(maxItems = 20) {
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    const saved = localStorage.getItem('scan-history');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = (item: ScanHistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.barcode !== item.barcode);
      const newHistory = [item, ...filtered].slice(0, maxItems);
      localStorage.setItem('scan-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scan-history');
  };

  const removeItem = (barcode: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.barcode !== barcode);
      localStorage.setItem('scan-history', JSON.stringify(filtered));
      return filtered;
    });
  };

  return { history, addToHistory, clearHistory, removeItem };
}
```

---

## 4.3 애니메이션 설계

### Framer Motion 사용
```typescript
// page.tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  {viewMode === 'scanner' ? (
    <motion.div
      key="scanner"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <ScannerView />
    </motion.div>
  ) : (
    <motion.div
      key="report"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <ReportView />
    </motion.div>
  )}
</AnimatePresence>
```

### 애니메이션 옵션
```typescript
const slideVariants = {
  scannerEnter: { opacity: 0, x: -100 },
  scannerCenter: { opacity: 1, x: 0 },
  scannerExit: { opacity: 0, x: -100 },
  reportEnter: { opacity: 0, x: 100 },
  reportCenter: { opacity: 1, x: 0 },
  reportExit: { opacity: 0, x: 100 },
};

const transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier
};
```

---

## 4.4 LocalStorage 스키마

### 저장 구조
```typescript
// scanner-settings
{
  flashMode: 'off',
  autoFocus: true,
  cooldownMs: 1500,
  timeoutSeconds: 30,
  vibrationEnabled: true,
  soundEnabled: false,
  rememberLastCamera: true
}

// scan-history (최대 20개)
[
  {
    barcode: '202509-FUJ-0020_00',
    timestamp: 1729155600000,
    format: 'CODE_128',
    itemName: '명함'
  },
  ...
]

// last-camera-device
{
  deviceId: 'abc123...',
  label: '후면 카메라'
}
```

---

# 5. 구현 계획

## 5.1 단계별 구현 순서

### Phase 1: 뷰 분리 기반 구축 (2-3시간)

#### Step 1-1: 타입 정의
**파일**: `src/app/scan/_types/settings.ts`
```typescript
export interface ScannerSettings { ... }
export type ViewMode = 'scanner' | 'report';
export interface ScanHistoryItem { ... }
```

#### Step 1-2: Custom Hooks 구현
**파일**:
- `src/app/scan/_hooks/useScannerSettings.ts`
- `src/app/scan/_hooks/useScanHistory.ts`

#### Step 1-3: 뷰 전환 로직 추가
**파일**: `src/app/scan/page.tsx`
- viewMode 상태 추가
- 뷰 전환 함수 구현
- AnimatePresence 래퍼 추가

---

### Phase 2: ScannerView 컴포넌트 (3-4시간)

#### Step 2-1: ScannerView 기본 구조
**파일**: `src/app/scan/_components/ScannerView.tsx`
- BarcodeSection 로직 통합
- 전체 화면 레이아웃
- 25:75 비율 (카메라:컨트롤)

#### Step 2-2: 카메라 컨트롤 UI 개선
- 플래시 토글 버튼
- 자동초점 토글
- 카메라 변경 버튼
- 설정에서 불러온 값 적용

#### Step 2-3: 최근 스캔 표시
- 수평 스크롤 리스트
- 클릭 시 즉시 제작의뢰서로 전환

---

### Phase 3: ReportView 컴포넌트 (2시간)

#### Step 3-1: ReportView 기본 구조
**파일**: `src/app/scan/_components/ReportView.tsx`
- JobOrderSection 로직 통합
- 전체 화면 레이아웃
- 헤더 (← 스캔, 인쇄)

#### Step 3-2: UI 재구성
- 핵심 정보 카드 (기존 유지)
- Accordion (기존 유지)
- ThumbnailGrid (이미 적용됨)
- 하단 CTA (다시 스캔)

---

### Phase 4: 설정 시스템 (3-4시간)

#### Step 4-1: SettingsModal 구현
**파일**: `src/app/scan/_components/SettingsModal.tsx`
- Radix UI Dialog 사용
- 섹션별 설정 UI
- 저장 로직

#### Step 4-2: 설정 적용
- flashMode → CameraTorch Hook
- autoFocus → Camera constraints
- cooldownMs → BarcodeScanner config
- timeoutSeconds → 타이머 로직
- vibration/sound → 피드백 함수

---

### Phase 5: 히스토리 시스템 (2-3시간)

#### Step 5-1: HistoryDrawer 구현
**파일**: `src/app/scan/_components/HistoryDrawer.tsx`
- Radix UI Sheet 사용
- 모바일: Bottom Sheet
- 데스크톱: Side Panel

#### Step 5-2: 히스토리 기능
- 검색 필터
- 개별 삭제
- 전체 삭제
- 클릭 시 제작의뢰서로 전환

---

### Phase 6: 통합 및 테스트 (2-3시간)

#### Step 6-1: 전체 통합
- 모든 컴포넌트 연결
- 상태 흐름 검증
- 애니메이션 조정

#### Step 6-2: 테스트
- 단위 테스트 (Vitest)
- E2E 테스트 (Playwright)
- 수동 테스트 (실기기)

#### Step 6-3: 성능 최적화
- 번들 크기 확인
- 렌더링 성능 측정
- 메모이제이션 추가

---

## 5.2 작업 파일 목록

### 생성 (7개)
```
src/app/scan/
├── _types/
│   └── settings.ts (NEW)
├── _hooks/
│   ├── useScannerSettings.ts (NEW)
│   └── useScanHistory.ts (NEW)
└── _components/
    ├── ScannerView.tsx (NEW)
    ├── ReportView.tsx (NEW)
    ├── SettingsModal.tsx (NEW)
    └── HistoryDrawer.tsx (NEW)
```

### 수정 (3개)
```
src/app/scan/
├── page.tsx (수정 - 뷰 전환 로직)
├── _components/
│   ├── BarcodeSection.tsx (수정 - ScannerView로 통합)
│   └── JobOrderSection.tsx (수정 - ReportView로 통합)
```

---

## 5.3 예상 코드 변경량

| 파일 | 라인 수 | 변경 |
|------|---------|------|
| page.tsx | 228줄 → 150줄 | -78줄 (단순화) |
| ScannerView.tsx | 0줄 → 300줄 | +300줄 (신규) |
| ReportView.tsx | 0줄 → 250줄 | +250줄 (신규) |
| SettingsModal.tsx | 0줄 → 200줄 | +200줄 (신규) |
| HistoryDrawer.tsx | 0줄 → 150줄 | +150줄 (신규) |
| useScannerSettings.ts | 0줄 → 80줄 | +80줄 (신규) |
| useScanHistory.ts | 0줄 → 100줄 | +100줄 (신규) |
| settings.ts | 0줄 → 50줄 | +50줄 (신규) |
| **총합** | **228줄** → **1,280줄** | **+1,052줄** |

**Note**: 코드 증가는 새로운 기능(설정, 히스토리) 추가 때문

---

## 5.4 마이그레이션 전략

### 점진적 마이그레이션
```
Step 1: 타입 및 Hooks 먼저 구현
  → 기존 코드 영향 없음

Step 2: ScannerView, ReportView 구현
  → 기존 코드 유지하면서 새 컴포넌트 작성

Step 3: page.tsx에서 viewMode 분기 추가
  → Feature Flag로 전환 가능하게

Step 4: 테스트 및 검증
  → 문제 발견 시 즉시 롤백 가능

Step 5: 기존 컴포넌트 정리
  → BarcodeSection, JobOrderSection 단순화 또는 제거
```

### 롤백 계획
```bash
# Feature Flag로 제어
const USE_NEW_LAYOUT = process.env.NEXT_PUBLIC_NEW_SCAN_LAYOUT === 'true';

{USE_NEW_LAYOUT ? (
  <NewScanLayout />
) : (
  <LegacyScanLayout />
)}
```

---

# 6. 체크리스트

## 6.1 구현 체크리스트

### Phase 1: 기반 구축
- [ ] `_types/settings.ts` 생성
- [ ] `useScannerSettings.ts` 구현
- [ ] `useScanHistory.ts` 구현
- [ ] LocalStorage 저장/로드 테스트
- [ ] page.tsx에 viewMode 상태 추가

### Phase 2: ScannerView
- [ ] `ScannerView.tsx` 파일 생성
- [ ] BarcodeSection 로직 통합
- [ ] 25:75 비율 레이아웃 구현
- [ ] 카메라 컨트롤 UI 구현
- [ ] 설정 적용 로직 구현
- [ ] 최근 스캔 표시 UI

### Phase 3: ReportView
- [ ] `ReportView.tsx` 파일 생성
- [ ] JobOrderSection 로직 통합
- [ ] 헤더 (← 스캔, 인쇄) 구현
- [ ] 전체 화면 레이아웃
- [ ] 하단 CTA 버튼 추가

### Phase 4: 설정 시스템
- [ ] `SettingsModal.tsx` 파일 생성
- [ ] Radix UI Dialog 통합
- [ ] 각 설정 섹션 UI 구현
- [ ] 저장 로직 구현
- [ ] 설정 적용 검증

### Phase 5: 히스토리 시스템
- [ ] `HistoryDrawer.tsx` 파일 생성
- [ ] Radix UI Sheet 통합
- [ ] 검색 기능 구현
- [ ] 삭제 기능 구현
- [ ] 모바일/데스크톱 레이아웃 분기

### Phase 6: 통합 및 테스트
- [ ] 뷰 전환 애니메이션 구현
- [ ] 전체 상태 흐름 검증
- [ ] 빌드 테스트
- [ ] 모바일 실기기 테스트
- [ ] 접근성 테스트
- [ ] 성능 측정

---

## 6.2 테스트 시나리오

### 기능 테스트
- [ ] 바코드 스캔 → 제작의뢰서 전환 (애니메이션)
- [ ] 제작의뢰서 → 스캔 화면 복귀
- [ ] 설정 변경 → 저장 → 적용 확인
- [ ] 히스토리 추가 → 조회 → 삭제
- [ ] 연속 스캔 모드 (30초 타임아웃)
- [ ] 중복 스캔 방지 (쿨다운)

### 반응형 테스트
- [ ] 모바일 (375px)
- [ ] 태블릿 (768px)
- [ ] 데스크톱 (1440px)
- [ ] 화면 회전 (Portrait ↔ Landscape)

### 브라우저 테스트
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] Chrome Desktop

---

## 6.3 성능 목표

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| 뷰 전환 시간 | < 300ms | Lighthouse |
| 첫 화면 로드 | < 2초 | Lighthouse |
| 번들 크기 | < 500KB | next build |
| 이미지 로딩 | Lazy | IntersectionObserver |
| 상태 업데이트 | < 16ms | React DevTools |

---

## 6.4 접근성 체크리스트

- [ ] 모든 버튼에 aria-label
- [ ] 키보드 네비게이션 (Tab, Enter, ESC)
- [ ] 스크린리더 테스트
- [ ] 색상 대비 WCAG AA 준수
- [ ] 포커스 인디케이터 명확
- [ ] 모션 감소 지원 (prefers-reduced-motion)

---

# 7. 참고 자료

## 7.1 관련 문서
- `/vooster-docs/prd.md` - 프로젝트 요구사항
- `/vooster-docs/design-guide.md` - 디자인 시스템
- `/vooster-docs/architecture.md` - 기술 아키텍처

## 7.2 사용 기술
- **프레임워크**: Next.js 15
- **상태 관리**: React Hooks, React Query
- **애니메이션**: Framer Motion
- **UI 라이브러리**: Radix UI, shadcn/ui
- **카메라**: @zxing/browser
- **이미지 뷰어**: Swiper.js
- **스타일링**: Tailwind CSS

## 7.3 디자인 참고
- **색상**: design-guide.md 참조
  - Primary: #1E2A38 (Deep Navy)
  - Accent: #2ECC71 (Emerald)
  - Destructive: #E24C4B (Crimson)
- **타이포그래피**: Noto Sans KR
- **아이콘**: Lucide React

---

# 8. 주요 개선사항 요약

## 8.1 UX 개선

### Before
```
❌ 스크롤 기반 네비게이션
❌ 혼란스러운 레이아웃 (스캐너 + 제작의뢰서 동시)
❌ 설정 변경 불가
❌ 제한적 히스토리 (3개)
❌ 애니메이션 없음
```

### After
```
✅ 완전 분리된 뷰 (집중도 향상)
✅ 한 화면에 하나의 작업
✅ 설정 커스터마이징 (⚙️ 모달)
✅ 풍부한 히스토리 (20개, 🔄 드로어)
✅ 부드러운 전환 애니메이션
✅ 직관적인 네비게이션
```

---

## 8.2 기술 개선

### Before
```
⚠️ 8개 상태가 한 파일에 집중
⚠️ 복잡한 타이머 관리
⚠️ Props Drilling
⚠️ 하드코딩된 설정값
```

### After
```
✅ 관심사 분리 (ScannerView, ReportView)
✅ Custom Hooks로 로직 분리
✅ Context API 활용
✅ 설정 시스템 (LocalStorage)
✅ 재사용 가능한 컴포넌트
```

---

## 8.3 성능 개선

```
✅ React Query 캐싱 (기존 유지)
✅ 레이지 로딩 (ThumbnailGrid)
✅ 코드 스플리팅 (뷰별 분리)
✅ 메모이제이션 (useCallback, useMemo)
✅ 최적화된 리렌더링
```

---

# 9. 다음 단계

## 9.1 즉시 시작 가능

```bash
# 1. 이 문서 검토 (30분)
cat docs/project_architecture.md

# 2. 타입 정의 시작
# → src/app/scan/_types/settings.ts

# 3. Hooks 구현
# → useScannerSettings.ts
# → useScanHistory.ts

# 4. 컴포넌트 구현
# → ScannerView.tsx
# → ReportView.tsx
# → SettingsModal.tsx
# → HistoryDrawer.tsx

# 5. 통합 및 테스트
# → page.tsx 수정
# → 테스트 실행
```

---

## 9.2 예상 일정

| Phase | 작업 | 예상 시간 |
|-------|------|---------|
| 1 | 기반 구축 | 2-3시간 |
| 2 | ScannerView | 3-4시간 |
| 3 | ReportView | 2시간 |
| 4 | 설정 시스템 | 3-4시간 |
| 5 | 히스토리 시스템 | 2-3시간 |
| 6 | 통합 및 테스트 | 2-3시간 |
| **총합** | **전체** | **14-19시간** |

**Note**: 1-2일 작업 분량 (숙련도에 따라 변동)

---

## 9.3 우선순위

### High Priority (필수)
1. ✅ 뷰 분리 (Scanner ↔ Report)
2. ✅ 뷰 전환 애니메이션
3. ✅ 기본 설정 시스템
4. ✅ 히스토리 시스템

### Medium Priority (권장)
5. 고급 설정 옵션
6. 검색 기능
7. 성능 최적화

### Low Priority (선택)
8. 소리 피드백
9. PWA 오프라인 지원
10. 통계 대시보드

---

# 10. 부록

## 10.1 코드 예제

### 뷰 전환 로직 (page.tsx)
```typescript
const [viewMode, setViewMode] = useState<ViewMode>('scanner');
const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

const handleBarcodeDetected = (result: BarcodeResult) => {
  // 검증 로직...
  setScannedBarcode(result.text);
  setViewMode('report'); // ✨ 뷰 전환

  // 피드백
  if (settings.vibrationEnabled) {
    navigator.vibrate(200);
  }
};

const handleBackToScanner = () => {
  setViewMode('scanner');
  setContinuousScanMode(true);
};
```

### 설정 저장 (useScannerSettings.ts)
```typescript
const DEFAULT_SETTINGS: ScannerSettings = {
  flashMode: 'off',
  autoFocus: true,
  cooldownMs: 1500,
  timeoutSeconds: 30,
  vibrationEnabled: true,
  soundEnabled: false,
  rememberLastCamera: true,
};

export function useScannerSettings() {
  const [settings, setSettings] = useState<ScannerSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    const saved = localStorage.getItem('scanner-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const saveSettings = (newSettings: ScannerSettings) => {
    setSettings(newSettings);
    localStorage.setItem('scanner-settings', JSON.stringify(newSettings));
  };

  return { settings, saveSettings };
}
```

---

## 10.2 성능 최적화 팁

### 메모이제이션
```typescript
const thumbnailImages = useMemo(() =>
  thumbnails.map((thumb) => ({
    id: `${thumb.iteM_NM}-${thumb.pagE_NO}`,
    url: thumb.thumbnaiL_URL || '',
  })),
  [thumbnails]
);

const handleBackToScanner = useCallback(() => {
  setViewMode('scanner');
  setContinuousScanMode(true);
}, []);
```

### 코드 스플리팅
```typescript
// 동적 import
const SettingsModal = dynamic(() => import('./_components/SettingsModal'), {
  ssr: false,
});

const HistoryDrawer = dynamic(() => import('./_components/HistoryDrawer'), {
  ssr: false,
});
```

---

**문서 버전**: 1.0
**마지막 업데이트**: 2025-10-17
**작성자**: Claude Code
**검토 필요**: 팀 리뷰 권장
