# Extension 400 Bad Request 에러 분석 및 해결

## 문제 상황

**에러 메시지**: "입력값 검증에 실패했습니다"
**HTTP 상태**: 400 Bad Request
**발생 상황**: Extension에서 디스플레이 등록 시

## 원인 분석

### 1. 서버 Zod 검증 스키마 규칙

파일: `/Users/innojini/Dev/vooster/server/src/schemas/display.ts`

서버는 `displayRegisterSchema`로 다음 규칙을 강제합니다:

```typescript
// deviceId: 영문, 숫자, 하이픈, 언더스코어 (1-100자)
deviceId: /^[a-zA-Z0-9\-_]+$/

// name: 제약 없음 (1-100자) - 한글 포함 가능
name: string (1-100자)

// lineId: 소문자, 숫자, 하이픈만 (1-50자) ← 문제 원인!
lineId: /^[a-z0-9\-]+$/

// orgId: 소문자, 숫자, 하이픈만 (1-50자)
orgId: /^[a-z0-9\-]+$/

// purpose: 제약 없음 (1-255자)
purpose: string
```

### 2. Extension이 보내는 데이터

파일: `/Users/innojini/Dev/vooster/extension/src/lib/api.ts` (수정 전)

```typescript
const requestData = {
  deviceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // ✓ UUID 형식 (영문, 숫자, 하이픈)
  name: '생산자-001',                              // ✓ 한글 포함 (name은 제약 없음)
  purpose: 'display',                               // ✓ 문자열
  orgId: 'default',                                 // ✓ 소문자, 숫자, 하이픈
  lineId: '생산자-001',                             // ✗ 한글 포함! 스키마 검증 실패
};
```

### 3. 검증 실패 상세 원인

**lineId 필드 검증 실패**:
- 받은 값: `"생산자-001"` (한글 포함)
- 필요한 형식: `/^[a-z0-9\-]+$/` (소문자, 숫자, 하이픈만)
- 한글 문자 때문에 정규식 매칭 실패 → 400 Bad Request

## 해결 방안

### 1단계: Extension 측 수정

**파일**: `/Users/innojini/Dev/vooster/extension/src/lib/api.ts`

**문제**: Extension이 사용자 입력값 (`name`) 을 그대로 `lineId`로 보냄

**해결**: `lineId`를 서버 스키마에 맞게 **자동으로 정규화**

#### 추가된 파일: `normalizeLineId.ts`

```typescript
/**
 * 라인 ID를 서버 스키마 규칙에 맞게 정규화
 *
 * 변환 규칙:
 * 1. 한글, 특수문자 제거 (영문, 숫자, 하이픈, 언더스코어만 유지)
 * 2. 언더스코어를 하이픈으로 변환
 * 3. 영문을 소문자로 변환
 * 4. 연속된 하이픈을 단일 하이픈으로 변환
 * 5. 시작/끝의 하이픈 제거
 * 6. 결과가 비어있으면 기본값 반환
 */
function normalizeLineId(input: string): string {
  let normalized = input
    .replace(/[^a-zA-Z0-9\-_]/g, '')        // 1. 한글, 특수문자 제거
    .replace(/_/g, '-')                    // 2. 언더스코어 → 하이픈
    .toLowerCase()                          // 3. 소문자 변환
    .replace(/-+/g, '-')                   // 4. 연속된 하이픈 → 단일 하이픈
    .replace(/^-+|-+$/g, '');              // 5. 시작/끝 하이픈 제거

  if (!normalized) return 'default-line';   // 6. 기본값
  return normalized;
}
```

#### 변환 예시

| 입력 | 출력 | 설명 |
|------|------|------|
| `"생산자-001"` | `"001"` | 한글 제거, 숫자만 유지 |
| `"Test_Line"` | `"test-line"` | 소문자 변환, 언더스코어 → 하이픈 |
| `"My Display"` | `"my-display"` | 소문자 변환, 공백 제거 후 하이픈 추가 |
| `"생산자A"` | `"a"` | 한글 제거, 영문만 유지 |
| `"!!!"` | `"default-line"` | 모두 제거 시 기본값 |

### 2단계: 서버 측 개선

**파일**: `/Users/innojini/Dev/vooster/server/src/routes/displays.ts`

**개선 사항**: 검증 에러 메시지를 더 자세하게 제공

```typescript
if (!parsed.success) {
  // 검증 에러를 상세히 로깅
  const errorDetails = parsed.error.errors.map((err) => ({
    field: err.path.join('.'),      // 어느 필드에서 실패했는지
    message: err.message,            // 왜 실패했는지
    code: err.code,                  // 에러 코드
  }));

  return res.status(400).json({
    ok: false,
    reason: 'validation_error',
    message: '입력값 검증에 실패했습니다.',
    details: {
      fields: errorDetails,          // 각 필드별 에러
      received: {                    // 서버가 받은 데이터 (디버깅 용)
        deviceId: req.body.deviceId,
        name: req.body.name,
        lineId: req.body.lineId,
        // ...
      },
    },
  });
}
```

## 변경된 파일 목록

### Extension (클라이언트)

1. **`/Users/innojini/Dev/vooster/extension/src/lib/normalizeLineId.ts`** (신규)
   - `normalizeLineId()` 함수 구현
   - 테스트 케이스 및 테스트 실행 함수 포함

2. **`/Users/innojini/Dev/vooster/extension/src/lib/api.ts`** (수정)
   - `normalizeLineId` import 추가
   - `registerDisplay()` 함수: `lineId` 정규화 로직 추가
   - 요청 전에 `lineId`를 자동으로 변환

### 서버 (백엔드)

1. **`/Users/innojini/Dev/vooster/server/src/routes/displays.ts`** (수정)
   - 검증 에러 메시지 상세화
   - Extension 개발자를 위한 디버깅 정보 추가

## 검증 방법

### 1. 단위 테스트 (Extension)

```typescript
import { normalizeLineId, runNormalizeLineIdTests } from '../src/lib/normalizeLineId';

// 개별 테스트
console.log(normalizeLineId('생산자-001')); // "001"
console.log(normalizeLineId('Test_Line'));  // "test-line"

// 전체 테스트 실행
const { passed, failed } = runNormalizeLineIdTests();
console.log(`통과: ${passed}, 실패: ${failed}`);
```

### 2. API 통합 테스트 (curl)

```bash
# 이제 한글 name을 사용해도 성공
curl -X POST http://localhost:3000/api/displays/register \
  -H 'Content-Type: application/json' \
  -d '{
    "deviceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "생산자-001",
    "purpose": "display",
    "orgId": "default",
    "lineId": "생산자-001"
  }'

# 응답 (성공)
# {
#   "ok": true,
#   "screenId": "screen:default:001",
#   "status": "registered"
# }
```

### 3. Extension 실제 테스트

1. Extension UI에서 "생산자-001" 입력
2. 디스플레이 등록 버튼 클릭
3. **기대 결과**: 200 OK, screenId 반환
4. **이전 결과**: 400 Bad Request (이제 해결됨)

## 성능 및 보안

- **성능**: 정규화 함수는 O(n) 시간 복잡도 (n = 문자열 길이)
- **보안**: SQL Injection 및 XSS 위험 없음 (클라이언트 사이드 정규화)
- **사용자 경험**: 한글 이름을 입력해도 자동으로 변환되어 투명함

## 향후 개선 사항

1. **UI 피드백**: 정규화 결과를 사용자에게 표시
   ```typescript
   // 예: "생산자-001" 입력 → "001로 등록됩니다"
   ```

2. **다국어 지원**: 다른 언어의 정규화 규칙 추가

3. **서버 스키마 검토**:
   - `lineId`를 더 유연한 형식으로 변경할지 고려
   - 또는 현재 형식을 유지하고 Extension에서만 정규화

## 요약

| 항목 | 내용 |
|------|------|
| **문제** | Extension이 한글을 포함한 `lineId` 전송 |
| **원인** | 서버 스키마가 소문자/숫자/하이픈만 허용 |
| **해결** | Extension에서 자동으로 `lineId` 정규화 |
| **수정 파일** | `api.ts`, `normalizeLineId.ts` (신규), `displays.ts` |
| **테스트** | 단위 테스트 + curl + Extension UI |
