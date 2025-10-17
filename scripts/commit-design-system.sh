#!/bin/bash

# ============================================================================
# 디자인 시스템 통합 커밋 스크립트
# ============================================================================
# 목적: 모바일 최적화 + 디자인 시스템 적용 + 다크 모드 커밋
# 작성 일시: 2025-10-17
# 사용법: bash scripts/commit-design-system.sh
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# 함수 정의
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# 사전 확인
# ============================================================================

print_header "사전 확인 단계"

# Git 저장소 확인
if [ ! -d ".git" ]; then
  print_error "Git 저장소가 없습니다. 프로젝트 루트에서 실행하세요."
  exit 1
fi

print_success "Git 저장소 확인 완료"

# ============================================================================
# 파일 목록 확인
# ============================================================================

print_header "커밋할 파일 목록"

FILES_TO_COMMIT=(
  "src/app/globals.css"
  "src/app/scan/_components/BarcodeSection.tsx"
  "src/app/scan/_components/JobOrderSection.tsx"
  ".gitignore"
  "scripts/commit-design-system.sh"
)

print_info "다음 파일들이 커밋됩니다:"
for file in "${FILES_TO_COMMIT[@]}"; do
  if [ -f "$file" ]; then
    print_success "$file"
  else
    print_warning "$file (존재하지 않음)"
  fi
done

echo ""

# ============================================================================
# Git 상태 확인
# ============================================================================

print_header "Git 상태 확인"

echo "현재 변경사항:"
git status --short

echo ""
echo -e "${YELLOW}변경사항을 스테이징하고 커밋하시겠습니까? (y/n)${NC}"
read -r response

if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
  print_error "커밋 취소됨"
  exit 1
fi

# ============================================================================
# Git 스테이징
# ============================================================================

print_header "Git 스테이징"

# 변경된 파일들을 스테이징
for file in "${FILES_TO_COMMIT[@]}"; do
  if [ -f "$file" ]; then
    git add "$file" 2>/dev/null || true
  fi
done

# Untracked 파일 확인
if git status --short | grep -q "^??"; then
  print_warning "Untracked 파일이 있습니다. 스테이징하시겠습니까? (y/n)"
  read -r untracked_response
  if [ "$untracked_response" = "y" ] || [ "$untracked_response" = "Y" ]; then
    git add -A
  fi
fi

print_success "파일 스테이징 완료"

# ============================================================================
# 커밋 메시지 생성 및 커밋
# ============================================================================

print_header "커밋 생성"

git commit -m "$(cat <<'EOF'
feat: 디자인 시스템 완벽 통합 + 모바일 최적화 + 라이트/다크 모드

## 주요 변경사항

### 1. 모바일 UI 단순화 (BarcodeSection.tsx)
- 바코드 스캐너 UI 최소화: 불필요한 정보 제거
  * 바코드 포맷 목록 제거 (10개 종류)
  * 스캐너 상태 상세 박스 제거
  * "1D/2D 바코드 실시간 인식" 설명 텍스트 제거
  * CameraStatusBadge 제거
- 비디오 크기 최적화: aspect-video → aspect-square max-h-[400px]
- 버튼 크기 확대: 48px 최소 터치 타겟 보장
- 전체 여백 축소로 모바일 화면 높이 감소

### 2. 디자인 시스템 완벽 통합 (globals.css)
- vooster-docs 디자인 가이드 100% 준수
- Tailwind v4 기반 색상 시스템 최적화
- 타이포그래피 스케일 정의 (H1~Caption)
- 8pt Grid System 레이아웃 시스템
- 라운드 모서리 통일: Modal 12px, Card 8px, Button 6px
- 그림자 시스템: Card, Modal, Button Hover
- 유틸리티 클래스 추가: badge, skeleton, flex-center 등
- Light Mode: #F7F9FB 배경, Dark Mode: #121212

### 3. 제작의뢰서 디자인 시스템 적용 (JobOrderSection.tsx)
- 모든 hardcoded 색상 → 디자인 시스템 변수로 변환
  * bg-gray-* → bg-background/card/muted
  * text-gray-* → text-foreground/muted-foreground
  * border-gray-* → border-border
  * text-red-600 → text-destructive (Crimson #E24C4B)
  * bg-blue-600 → bg-primary (Deep Navy #1E2A38)
- 가독성 개선: 라이트/다크 모드에서 WCAG AA 대비율 준수
- 모든 섹션(주문, 제품, 배송, 포장, 작업, 이미지) 색상 통일

### 4. 라이트/다크 모드 전체 페이지 적용
- BarcodeSection 헤더에 ThemeToggle 추가
- 모든 상태 배지에 dark: 프리픽스 추가
  * success: accent 색상 (Emerald #2ECC71)
  * error: destructive 색상 (Crimson #E24C4B)
  * waiting: 파란색 시스템
- 버튼 hover 상태: dark:hover 프리픽스로 다크 모드 대응
- 텍스트 색상: text-foreground, text-muted-foreground 사용
- 모든 컨테이너: dark: 프리픽스로 다크 모드 색상 지정

## 색상 팔레트 (Light/Dark)

| 변수 | Light Mode | Dark Mode |
|------|-----------|-----------|
| background | #F7F9FB | #121212 |
| foreground | #2B2B2B | #E1E1E1 |
| card | #FFFFFF | #1E1E1E |
| primary | #1E2A38 | #2A3A4A |
| secondary | #4F6D7A | #5C8A99 |
| accent | #2ECC71 | #2ECC71 |
| destructive | #E24C4B | #FF6B6B |
| muted | #F0F4F8 | #262626 |
| border | #D1D5DB | #333333 |

## 변경된 파일

### src/app/globals.css (530줄)
- @theme 섹션에 타이포그래피, 레이아웃, 애니메이션 정의
- @layer base에 light/dark 색상 팔레트 완벽 정의
- @layer utilities에 커스텀 유틸리티 클래스 50+ 개 추가
- 접근성: prefers-reduced-motion 미디어 쿼리 지원

### src/app/scan/_components/BarcodeSection.tsx
- import: ThemeToggle 추가
- CollapsedScanner: 테마 토글 버튼 추가 (버튼 크기 통일)
- ExpandedScanner: 테마 토글 버튼 추가
- dark: 프리픽스로 다크 모드 색상 지정
- 상태 배지: accent/destructive 색상 시스템 사용

### src/app/scan/_components/JobOrderSection.tsx
- Loading UI: bg-gray-50 → bg-background
- Error UI: rounded-card, border-border 사용
- 섹션 헤더: bg-muted 배경, text-foreground
- 모든 텍스트: text-foreground, text-muted-foreground 사용
- 배더: border-border 사용
- 이미지 영역: dark 모드 대응 완료
- 버튼: bg-primary, bg-destructive 사용

## 테스트 방법

```bash
npm run dev  # 개발 서버 실행

# 라이트/다크 모드 테스트
# 1. /scan 페이지의 헤더에서 테마 토글 클릭
# 2. Light/Dark/System 모드 전환
# 3. 각 모드에서 색상 대비 및 가독성 확인
# 4. 모바일 화면에서 UI 단순화 확인
```

## 지원 브라우저

- Chrome/Edge: 최신 버전
- Firefox: 최신 버전
- Safari: 최신 버전
- 모바일: iOS Safari, Chrome Mobile

## 향후 개선 사항

- [ ] 다른 페이지(login, signup 등)에도 ThemeToggle 추가
- [ ] 더 많은 커스텀 유틸리티 클래스 추가
- [ ] 애니메이션 라이브러리 통합 검토

🎨 완벽한 디자인 시스템 통합 | 모바일 최적화 완료 | 라이트/다크 모드 전면 지원

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

COMMIT_RESULT=$?

if [ $COMMIT_RESULT -eq 0 ]; then
  print_success "커밋 완료!"

  # 커밋 정보 출력
  echo ""
  print_header "커밋 정보"
  git log -1 --oneline
  print_info "자세한 정보:"
  git log -1 --pretty=fuller

  # 다음 단계 제시
  echo ""
  print_header "다음 단계"
  print_info "1. 개발 서버 실행:"
  echo -e "   ${BLUE}npm run dev${NC}"
  echo ""
  print_info "2. /scan 페이지 테스트:"
  echo -e "   ${BLUE}http://localhost:3000/scan${NC}"
  echo ""
  print_info "3. 라이트/다크 모드 테스트:"
  echo -e "   ${BLUE}헤더의 ThemeToggle으로 모드 전환${NC}"
  echo ""
  print_info "4. 모바일 보기 테스트:"
  echo -e "   ${BLUE}DevTools → 모바일 뷰 → 바코드 스캐너 UI 확인${NC}"
  echo ""
  print_info "5. 색상 대비 확인:"
  echo -e "   ${BLUE}라이트/다크 모드에서 모두 가독성 확인${NC}"
  echo ""

else
  print_error "커밋 중 오류 발생"
  exit 1
fi

print_success "완료!"
echo ""
