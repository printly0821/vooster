# 커밋 스크립트 가이드

## 📝 스크립트 목록

### 1. `commit-tailwind-fix.sh`
Tailwind CSS v3 다운그레이드 커밋 스크립트

**사용법:**
```bash
bash scripts/commit-tailwind-fix.sh
```

또는 (실행 권한 부여 후)
```bash
./scripts/commit-tailwind-fix.sh
```

**커밋 내용:**
- Tailwind CSS v4 → v3.4.1 다운그레이드
- globals.css v3 문법으로 업데이트
- PostCSS 표준 설정 적용
- tailwind.config.ts 생성
- autoprefixer 추가

---

### 2. `commit-theme.sh`
shadcn 기반 라이트/다크 모드 시스템 통합 커밋

**사용법:**
```bash
bash scripts/commit-theme.sh
```

---

### 3. `commit-design-system.sh`
디자인 시스템 완벽 통합 커밋

**사용법:**
```bash
bash scripts/commit-design-system.sh
```

---

## ✨ 주요 기능

모든 스크립트는 다음 기능을 포함합니다:

- ✅ Git 저장소 유효성 검사
- ✅ 커밋할 파일 목록 표시
- ✅ 현재 변경사항 확인
- ✅ 사용자 확인 (y/n)
- ✅ 자동 파일 스테이징
- ✅ 상세한 커밋 메시지 작성
- ✅ 커밋 정보 출력
- ✅ 다음 단계 안내

---

## 🚀 실행 권한

첫 사용 시에만 실행 권한을 부여하면 됩니다:

```bash
chmod +x scripts/commit-*.sh
```

이후에는 다음과 같이 실행:
```bash
./scripts/commit-tailwind-fix.sh
# 또는
bash scripts/commit-tailwind-fix.sh
```

---

## 📌 주의사항

- 프로젝트 루트 디렉토리에서 실행하세요
- 스크립트 실행 전 변경사항을 반드시 확인하세요
- 커밋 시 프롬프트에서 `y` 또는 `n`으로 선택하세요
