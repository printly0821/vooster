#!/bin/bash

# ============================================================================
# Main Page Barcode Button Commit Script
# ============================================================================
# 목적: 메인페이지에 바코드 스캔 테스트 버튼 추가
# 사용법: bash scripts/commit-main-page-barcode-button.sh
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
  "src/app/page.tsx"
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
    print_success "Staged: $file"
  fi
done

print_success "파일 스테이징 완료"

# ============================================================================
# 커밋 메시지 생성 및 커밋
# ============================================================================

print_header "커밋 생성"

git commit -m "$(cat <<'EOF'
feat: 메인페이지에 바코드 스캔 테스트 버튼 추가

## 주요 변경사항

### 1. 바코드 스캔 버튼 추가
- 새로운 Primary 버튼: "🔍 바코드 스캔 + 제작의뢰서"
- 링크: `/scan` 페이지로 이동
- 스타일: bg-primary + shadow-sm으로 강조
- 위치: 가장 왼쪽 (주요 기능)

### 2. 버튼 레이아웃 개선
- flex-wrap 추가로 모바일 자동 줄바꿈
- 버튼 간격: gap-4 → gap-3 (최적화)
- 3개 버튼 구성으로 확장

### 3. 버튼 구성
1. **🔍 바코드 스캔 + 제작의뢰서** (Primary)
   - 전체 플로우 테스트 (바코드 스캔 → 제작의뢰서 조회)
   - 메인 기능으로 강조

2. **📸 카메라 테스트** (Secondary)
   - 카메라 기능 단독 테스트
   - 기존 기능 유지

3. **📦 주문 상세 예시** (Secondary)
   - 제작의뢰서 화면 단독 테스트
   - 기존 기능 유지

## 사용자 경험 개선

### Before
```
[📸 카메라 테스트] [📦 주문 상세 예시]
```

### After
```
[🔍 바코드 스캔 + 제작의뢰서] (Primary - 강조)
[📸 카메라 테스트] [📦 주문 상세 예시]
```

### 개선 효과
- 메인 기능에 즉시 접근 가능
- 전체 플로우를 한 번에 테스트
- 사용자 편의성 향상

## 반응형 디자인
- 모바일: 버튼이 자동으로 줄바꿈 (flex-wrap)
- 태블릿/데스크톱: 한 줄에 모두 표시
- 모든 화면 크기에서 최적화된 레이아웃

## 변경 파일
- src/app/page.tsx

## 테스트 방법
```bash
npm run dev
# 1. 메인페이지(/) 접속
# 2. "🔍 바코드 스캔 + 제작의뢰서" 버튼 클릭
# 3. /scan 페이지로 이동 확인
# 4. 바코드 스캔 → 제작의뢰서 조회 플로우 테스트
```

🚀 메인페이지에서 바로 핵심 기능 접근 가능 | 사용자 편의성 개선

🤖 Generated with [Claude Code](https://claude.com/claude-code)

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

  # 다음 단계 제시
  echo ""
  print_header "다음 단계"
  print_info "1. 변경사항 확인:"
  echo -e "   ${BLUE}npm run dev${NC}"
  echo -e "   ${BLUE}메인페이지(/)에서 새 버튼 확인${NC}"
  echo ""
  print_info "2. 바코드 스캔 플로우 테스트:"
  echo -e "   ${BLUE}🔍 바코드 스캔 + 제작의뢰서 버튼 클릭 → /scan 페이지${NC}"
  echo ""
  print_info "3. 원격 저장소에 푸시:"
  echo -e "   ${BLUE}git push origin master${NC}"
  echo ""

else
  print_error "커밋 중 오류 발생"
  exit 1
fi

print_success "완료!"
echo ""
