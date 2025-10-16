#!/bin/bash

# ============================================================================
# Theme System Integration Commit Script
# ============================================================================
# 목적: shadcn 기반 라이트/다크 모드 시스템 통합 커밋
# 작성 일시: 2025-10-16
# 사용법: bash scripts/commit-theme.sh
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
  "src/app/page.tsx"
  "src/app/login/page.tsx"
  "src/app/signup/page.tsx"
  "src/app/(protected)/dashboard/page.tsx"
  "src/app/providers.tsx"
  "package.json"
  "package-lock.json"
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
feat: shadcn 기반 라이트/다크 모드 시스템 통합 완료

## 주요 변경사항

### 1. globals.css 최적화 (shadcn 표준)
- Tailwind v4 기반 색상 시스템 최적화
- Light/Dark 모드 색상 팔레트 완벽 정의
  * Light Mode: Ghost White (#F7F9FB) 배경
  * Dark Mode: 어두운 배경 (#121212)
- Primary, Secondary, Accent, Destructive, Muted 색상 시스템
- 디자인 가이드와 100% 동일하게 구성
- 모든 CSS 변수 주석으로 명시

### 2. 모든 페이지 shadcn 마이그레이션 완료
- page.tsx (홈페이지): MainLayout 적용 + 모든 클래스명 변환
- login/page.tsx: 로그인 폼 shadcn 스타일 적용
- signup/page.tsx: 회원가입 폼 shadcn 스타일 적용
- dashboard/page.tsx: 대시보드 shadcn 스타일 적용

### 3. MainLayout 통합
- 모든 주요 페이지에 MainLayout 적용
- Header + ThemeToggle 자동 포함
- 라이트/다크 모드 우상단에서 즉시 전환 가능

### 4. 색상 변수 통일
- bg-slate-* → bg-background, bg-card, bg-primary 등
- text-slate-* → text-foreground, text-muted-foreground 등
- border-slate-* → border-border, border-input 등
- focus 스타일: focus:ring-ring 사용으로 shadcn 표준 준수

## 색상 팔레트 (Light/Dark)

| 변수 | Light Mode | Dark Mode |
|------|-----------|-----------|
| background | #F7F9FB | #121212 |
| foreground | #2B2B2B | #E1E1E1 |
| card | #FFFFFF | #1E1E1E |
| primary | #1E2A38 | #2A3A4A |
| accent | #2ECC71 | #2ECC71 |
| secondary | #4F6D7A | #5C8A99 |
| muted | #E8EEF5 | #262626 |

## 테스트 방법
```bash
npm run dev  # 개발 서버 실행
# 우상단 ThemeToggle로 Light/Dark/System 모드 전환 테스트
```

## 마이그레이션된 페이지
- ✅ src/app/page.tsx
- ✅ src/app/login/page.tsx
- ✅ src/app/signup/page.tsx
- ✅ src/app/(protected)/dashboard/page.tsx

## 설정
- ✅ globals.css: 완벽하게 최적화됨
- ✅ providers.tsx: ThemeProvider + QueryClientProvider 설정됨
- ✅ Header: ThemeToggle 통합됨

🎨 디자인 가이드 완벽 준수 | shadcn 표준 통일 | 모든 페이지 라이트/다크 모드 지원

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
  print_info "2. 라이트/다크 모드 테스트:"
  echo -e "   ${BLUE}우상단 ThemeToggle으로 모드 전환${NC}"
  echo ""
  print_info "3. 모든 페이지 테스트:"
  echo -e "   ${BLUE}홈페이지 → 로그인 → 회원가입 → 대시보드${NC}"
  echo ""
  print_info "4. 스타일 일관성 확인:"
  echo -e "   ${BLUE}각 페이지에서 라이트/다크 모드가 정상 작동하는지 확인${NC}"
  echo ""

else
  print_error "커밋 중 오류 발생"
  exit 1
fi

print_success "완료!"
echo ""
