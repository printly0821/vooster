#!/bin/bash

# ============================================================================
# Tailwind CSS Fix Commit Script
# ============================================================================
# 목적: Tailwind CSS v3 다운그레이드 관련 커밋
# 사용법: bash scripts/commit-tailwind-fix.sh
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 함수 정의
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
  "package.json"
  "package-lock.json"
  "postcss.config.mjs"
  "src/app/globals.css"
  "tailwind.config.ts"
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

print_success "파일 스테이징 완료"

# ============================================================================
# 커밋 메시지 생성 및 커밋
# ============================================================================

print_header "커밋 생성"

git commit -m "$(cat <<'EOF'
fix: Tailwind CSS v3로 다운그레이드하여 Vercel 빌드 오류 해결

- Tailwind CSS v4 → v3.4.1 다운그레이드
- globals.css v3 문법으로 업데이트
- PostCSS 표준 설정 적용
- tailwind.config.ts 생성
- autoprefixer 추가

Vercel 배포 시 CSS가 제대로 로드되지 않던 문제 해결

🤖 Generated with Claude Code

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

  echo ""
  print_header "다음 단계"
  print_info "푸시하려면 다음 명령어를 실행하세요:"
  echo -e "   ${BLUE}git push origin master${NC}"
  echo ""

else
  print_error "커밋 중 오류 발생"
  exit 1
fi

print_success "완료!"
echo ""
