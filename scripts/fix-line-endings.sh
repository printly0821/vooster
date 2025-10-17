#!/bin/bash

# ============================================================================
# Line Ending 일괄 수정 스크립트 (CRLF → LF)
# ============================================================================
# 목적: 프로젝트 내 CRLF 파일을 모두 LF로 변환
# 사용법: bash scripts/fix-line-endings.sh
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
# CRLF 파일 찾기 및 수정
# ============================================================================

print_header "Line Ending 수정 (CRLF → LF)"

# CRLF 파일 찾기
print_info "CRLF 파일을 검색하고 있습니다..."
echo ""

# scripts 폴더의 쉘 스크립트
SHELL_SCRIPTS=(
  "scripts/commit-theme.sh"
  "scripts/test-env-check.sh"
)

# 수정할 파일 개수
TOTAL=0
FIXED=0

# 기타 소스 파일 검색 (node_modules, .next 제외)
echo "일반 파일 검색:"
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.css" -o -name "*.md" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" \
  -not -path "*/.git/*" | while read file; do
  file_type=$(file "$file" | grep -c "CRLF" || true)
  if [ "$file_type" -gt 0 ]; then
    SHELL_SCRIPTS+=("$file")
  fi
done

# 모든 파일 수정
for file in "${SHELL_SCRIPTS[@]}"; do
  if [ -f "$file" ]; then
    # CRLF 여부 확인
    if file "$file" | grep -q "CRLF"; then
      print_warning "Converting: $file"

      # CRLF → LF 변환
      tr -d '\r' < "$file" > "${file}.tmp"
      mv "${file}.tmp" "$file"

      print_success "Fixed: $file"
      ((FIXED++))
    fi
  fi
  ((TOTAL++))
done

echo ""

# ============================================================================
# 검증
# ============================================================================

print_header "변환 결과 검증"

# 쉘 스크립트 검증
print_info "쉘 스크립트 상태:"
for file in scripts/*.sh; do
  if [ -f "$file" ]; then
    file_info=$(file "$file")
    if echo "$file_info" | grep -q "CRLF"; then
      print_error "$file: CRLF (실패)"
    else
      print_success "$file: LF (성공)"
    fi
  fi
done

echo ""

# 최종 요약
if [ "$FIXED" -eq 0 ]; then
  print_success "모든 파일이 이미 LF 형식입니다!"
else
  print_success "$FIXED 개의 파일을 CRLF에서 LF로 변환했습니다"
fi

echo ""

# Git 상태 확인
print_header "Git 상태"

if git diff --name-only | grep -q "^scripts/"; then
  print_info "수정된 파일:"
  git diff --name-only | grep "^scripts/" || true
else
  print_warning "Git이 아직 변경사항을 감지하지 못했습니다"
  print_info "다음을 실행하세요: git add scripts/"
fi

echo ""
print_success "Line Ending 수정 완료!"
echo ""
