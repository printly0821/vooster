#!/bin/bash

# ============================================================================
# Line Ending 검증 스크립트
# ============================================================================
# 목적: CRLF 파일이 없는지 확인 (CI/CD 통합용)
# 사용법: bash scripts/verify-line-endings.sh
# 반환값: CRLF 파일 없음 (0) / CRLF 파일 발견 (1)
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
# CRLF 파일 검증
# ============================================================================

print_header "Line Ending 검증"

# 검사 대상 파일 확장자
EXTENSIONS=(
  "*.ts"
  "*.tsx"
  "*.js"
  "*.jsx"
  "*.mjs"
  "*.cjs"
  "*.json"
  "*.css"
  "*.scss"
  "*.md"
  "*.yml"
  "*.yaml"
  "*.sh"
  "*.bash"
)

# CRLF 파일 찾기
print_info "CRLF 파일을 검색하고 있습니다..."
echo ""

CRLF_FILES=()

# 검색 대상
for ext in "${EXTENSIONS[@]}"; do
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      if file "$file" | grep -q "CRLF"; then
        CRLF_FILES+=("$file")
      fi
    fi
  done < <(find . -name "$ext" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/build/*" -not -path "*/.git/*" 2>/dev/null || true)
done

# 결과 출력
if [ ${#CRLF_FILES[@]} -eq 0 ]; then
  print_success "No CRLF files found!"
  echo ""
  print_info "모든 파일이 LF (Unix) 형식입니다."
  echo ""
  print_success "Line Ending 검증 통과!"
  echo ""
  exit 0
else
  print_error "CRLF files found: ${#CRLF_FILES[@]} 개"
  echo ""

  for file in "${CRLF_FILES[@]}"; do
    print_error "$file"
  done

  echo ""
  print_warning "다음 명령으로 수정하세요:"
  echo -e "   ${BLUE}bash scripts/fix-line-endings.sh${NC}"
  echo ""

  exit 1
fi
