# 바코드 주문 조회 웹앱 Design Guide

## 1. Overall Mood (전체적인 무드)

현장 작업 환경에서의 **신뢰성과 전문성**을 강조하는 디자인 컨셉을 채택합니다. 작업자들이 빠르고 정확하게 정보를 파악할 수 있도록 **깔끔하고 차분한 분위기**를 조성하며, 높은 신뢰감을 주는 **정보 중심적인 디자인**을 구현합니다. 

핵심 키워드:
- **깔끔함**: 불필요한 장식 요소 제거, 정보 전달에 집중
- **차분함**: 작업 집중도를 높이는 안정적인 색상과 레이아웃
- **신뢰감**: 일관성 있는 시각적 위계와 명확한 피드백
- **효율성**: 빠른 작업 흐름을 지원하는 직관적인 인터페이스

## 2. Reference Service (참조 서비스)

- **Name**: Notion
- **Description**: 올인원 워크스페이스 및 노트 작성 도구
- **Design Mood**: 밝고 미니멀하며 정보 위계를 명확하게 보여주는 전문적인 디자인
- **Primary Color**: #2F3437 (Deep Gray)
- **Secondary Color**: #37352F (Warm Gray)

Notion의 정보 구조화 방식과 깔끔한 카드 레이아웃을 참조하여, 복잡한 주문 정보를 명확하게 전달할 수 있는 디자인을 구현합니다.

## 3. Color & Gradient (색상 & 그라데이션)

**색상 성향**: Cool 톤, 낮은-중간 채도 (Low-to-Medium Saturation)

### 주요 색상 팔레트
- **Primary Color**: #1E2A38 (Deep Navy) - 헤더, 주요 버튼
- **Secondary Color**: #4F6D7A (Steel Blue) - 보조 버튼, 강조 아이콘
- **Accent Color**: #2ECC71 (Emerald) - 성공 상태, 중요 하이라이트
- **Background**: #F7F9FB (Ghost White) - 페이지 베이스 배경
- **Surface**: #FFFFFF (Pure White) - 카드, 모달 배경
- **Text Primary**: #2B2B2B (Charcoal) - 주요 텍스트
- **Text Secondary**: #5C6973 (Slate Gray) - 보조 텍스트, 레이블
- **Error**: #E24C4B (Crimson) - 오류 상태, 경고

### 색상 사용 우선순위
1. **최우선**: Primary (Deep Navy) - 주요 액션 버튼, 헤더
2. **중요**: Accent (Emerald) - 스캔 성공, 완료 상태
3. **보조**: Secondary (Steel Blue) - 보조 버튼, 아이콘
4. **배경**: Background/Surface - 정보 구조화

**Mood**: 차분하고 전문적인 Cool 톤으로 작업 집중도를 높이며, 낮은 채도로 눈의 피로를 최소화합니다.

## 4. Typography & Font (타이포그래피 & 폰트)

### 폰트 패밀리
- **한글/영문**: "Noto Sans KR", "Inter", sans-serif
- **코드/숫자**: "JetBrains Mono", monospace

### 타이포그래피 스케일 (14px-32px)
- **Heading 1**: Noto Sans KR, 32px, Weight 600 - 페이지 제목
- **Heading 2**: Noto Sans KR, 24px, Weight 600 - 섹션 제목
- **Heading 3**: Noto Sans KR, 20px, Weight 600 - 카드 제목
- **Body Large**: Noto Sans KR, 18px, Weight 400 - 주요 정보
- **Body**: Noto Sans KR, 16px, Weight 400 - 일반 텍스트
- **Body Small**: Noto Sans KR, 14px, Weight 400 - 보조 정보
- **Caption**: Noto Sans KR, 12px, Weight 500 - 레이블, 상태

### 줄 간격 및 자간
- **Line Height**: 1.5 (본문), 1.3 (제목)
- **Letter Spacing**: -0.01em (한글), 0em (영문)

## 5. Layout & Structure (레이아웃 & 구조)

### 그리드 시스템
- **기본 단위**: 8pt Grid System
- **컨테이너 최대 폭**: 1440px (데스크톱)
- **모바일**: 100% Fluid Width
- **패딩**: 16px (모바일), 24px (태블릿), 32px (데스크톱)

### 네비게이션 구조
**Top Bar 1열 구조** 채택
- **좌측**: 로고 + 카메라/주문조회 토글 버튼
- **우측**: 최근 내역, 도움말, 다크모드 토글
- **높이**: 64px (모바일), 72px (데스크톱)

### 레이아웃 원칙
1. **수직 공간 최대 활용**: 카메라 뷰와 주문 정보 표시 영역 확보
2. **일관성**: 모바일-데스크톱 간 동일한 네비게이션 구조
3. **접근성**: 최소 터치 영역 44×44px 보장

## 6. Visual Style (비주얼 스타일)

### 아이콘 시스템
- **아이콘 세트**: Lucide React
- **선 두께**: 1.5px
- **스타일**: Round Cap
- **크기**: 16px (Small), 20px (Medium), 24px (Large)

### 이미지 스타일
- **썸네일**: 1:1 비율, 8px 라운드 모서리
- **주문 이미지**: 원본 비율 유지, 6px 라운드 모서리
- **로딩 상태**: Skeleton UI with shimmer effect

### 그림자 시스템
- **Card Shadow**: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
- **Modal Shadow**: 0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.04)
- **Button Hover**: 0 4px 6px rgba(0,0,0,0.1)

### 라운드 모서리
- **버튼**: 6px
- **카드**: 8px
- **모달**: 12px
- **이미지**: 6px

## 7. UX Guide (UX 가이드)

### 타겟 사용자별 UX 전략
**전문가 + 초보자 모두 지원하는 Progressive Disclosure 방식**

### 전문가용 (Expert Mode)
- **즉시 작업 모드**: 앱 실행 시 바로 카메라 화면 표시
- **최소 UI**: 핵심 기능만 노출, 고급 기능은 숨김
- **키보드 단축키**: 스페이스바(스캔), ESC(취소), 화살표(이미지 탐색)

### 초보자용 (Beginner Support)
- **온보딩**: 첫 방문 시 3-4장의 튜토리얼 슬라이드
- **도움말**: 우상단 '?' 아이콘으로 언제든 접근 가능
- **시각적 가이드**: 바코드 스캔 영역 표시, 진행 상태 명확한 피드백

### 핵심 UX 원칙
1. **3초 룰**: 스캔 후 3초 내 결과 표시
2. **원터치 원칙**: 주요 액션은 1번의 터치로 완료
3. **피드백 필수**: 모든 액션에 즉각적인 시각/촉각 피드백
4. **오류 복구**: 명확한 오류 메시지와 해결 방법 제시

## 8. UI Component Guide (UI 컴포넌트 가이드)

### 버튼 (Buttons)
```
Primary Button:
- 배경: #1E2A38 (Deep Navy)
- 텍스트: #FFFFFF
- 높이: 48px (모바일), 44px (데스크톱)
- 패딩: 16px 24px
- 라운드: 6px

Secondary Button:
- 테두리: 1.5px solid #4F6D7A
- 텍스트: #4F6D7A
- 배경: transparent
- hover: 배경 #4F6D7A, 텍스트 #FFFFFF

Ghost Button:
- 텍스트: #4F6D7A
- 배경: transparent
- hover: 배경 rgba(79, 109, 122, 0.1)
```

### 카드 (Cards)
```
기본 카드:
- 배경: #FFFFFF
- 그림자: Card Shadow
- 라운드: 8px
- 패딩: 16px
- 테두리: 1px solid #E5E7EB

주문 정보 카드:
- 헤더: 주문번호 + 상태 배지
- 본문: 주문명, 수량, 옵션 정보
- 하단: 썸네일 그리드 (최대 4개 미리보기)
```

### 입력 필드 (Input Fields)
```
기본 입력 필드:
- 높이: 48px
- 패딩: 12px 16px
- 테두리: 1.5px solid #D1D5DB
- 라운드: 6px
- focus: 테두리 #2ECC71

검색 필드:
- 좌측 아이콘: Search (20px)
- placeholder: "주문번호로 검색..."
```

### 모달 (Modals)
```
이미지 뷰어 모달:
- 전체화면 오버레이
- 배경: rgba(0,0,0,0.9)
- 좌우 스와이프 지원
- 상단: 닫기 버튼 + 이미지 인덱스
- 하단: 썸네일 네비게이션

일반 모달:
- 중앙 정렬
- 최대 폭: 480px (모바일에서 90%)
- 라운드: 12px
- 패딩: 24px
```

### 네비게이션 바 (Navigation Bar)
```
Top Bar:
- 높이: 64px (모바일), 72px (데스크톱)
- 배경: #FFFFFF
- 하단 테두리: 1px solid #E5E7EB
- 패딩: 0 16px

좌측 영역:
- 로고 (32px 높이)
- 모드 토글 (카메라/검색)

우측 영역:
- 최근 내역 아이콘
- 도움말 아이콘
- 다크모드 토글
```

### 최근 내역 드로어 (Recent History)
```
모바일: Bottom Sheet
- 하단에서 올라오는 슬라이드
- 최대 높이: 70vh
- 드래그 핸들 포함

데스크톱: Side Panel
- 우측에서 슬라이드
- 폭: 320px
- 반투명 오버레이
```

### 상태 표시 (Status Indicators)
```
성공 상태:
- 색상: #2ECC71
- 아이콘: Check Circle
- 진동: 200ms

오류 상태:
- 색상: #E24C4B
- 아이콘: X Circle
- 진동: 300ms (2회)

로딩 상태:
- Skeleton UI
- Shimmer 효과
- 스피너: 20px, #4F6D7A
```

### 다크 모드 (Dark Mode)
```
배경 색상:
- 페이지: #121212
- 카드: #1E1E1E
- 네비게이션: #1F1F1F

텍스트 색상:
- Primary: #E1E1E1
- Secondary: #A1A1A1

Primary 색상 유지: #1E2A38 → 약간 밝게 #2A3A4A
```

### 접근성 가이드라인
- **색상 대비**: 최소 4.5:1 (WCAG AA 준수)
- **터치 영역**: 최소 44×44px
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **스크린 리더**: 적절한 aria-label 및 role 속성 사용
- **모션**: prefers-reduced-motion 미디어 쿼리 지원

### 애니메이션 및 트랜지션
```
기본 트랜지션: 200ms ease-in-out
버튼 hover: 150ms ease
모달 등장: 300ms ease-out
이미지 슬라이드: 250ms ease-in-out
스캔 성공 피드백: 200ms fade-in
```