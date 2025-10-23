
## Important
- When designing and implementing, check the CodeBase and be sure to call the necessary Agents.
- Always answer in korea
- Always write file in utf-8

## Code Comment Guidelines (코드 주석 작성 규칙)
모든 코드 작성 시 다음의 상세 주석 규칙을 반드시 준수하세요:

### 1. 파일 헤더 주석
```typescript
/**
 * 파일 목적을 한 문장으로 설명
 *
 * 상세 설명 (필요시):
 * - 주요 기능 1
 * - 주요 기능 2
 */
```

### 2. 함수/메서드 주석 (JSDoc 형식)
```typescript
/**
 * 함수의 목적을 명확하게 설명 (동사로 시작)
 *
 * @param paramName - 파라미터 설명 (타입 자동 추론되므로 설명에 집중)
 * @param anotherParam - 다른 파라미터 설명
 * @returns 반환값의 의미와 형태
 * @throws 발생 가능한 에러 타입과 상황
 *
 * @example
 * // 사용 예시
 * const result = functionName(param1, param2);
 */
function functionName(paramName: string, anotherParam: number): Promise<void> {
  // 구현
}
```

### 3. 클래스 주석
```typescript
/**
 * 클래스의 목적을 설명
 *
 * 책임:
 * - 책임 1
 * - 책임 2
 *
 * @example
 * const instance = new ClassName(options);
 * await instance.method();
 */
class ClassName {
  /**
   * 프로퍼티 설명
   * @private 는 외부에서 접근하지 않음을 나타냄
   */
  private property: string;

  constructor(options: ConstructorOptions) {
    // 생성자 로직
  }
}
```

### 4. 복잡한 로직 블록 주석
```typescript
// 각 단계를 번호로 설명
// 1. 입력 검증
if (!input) throw new Error('Input required');

// 2. 데이터 변환
const transformed = transform(input);

// 3. API 호출
const result = await api.call(transformed);

// 4. 결과 처리
return process(result);
```

### 5. 주석 원칙
- **WHY**: 왜 이렇게 했는지가 중요 (WHAT이 아님)
- **명확성**: 나중에 다시 읽을 때 이해할 수 있어야 함
- **최신성**: 코드 변경 시 주석도 함께 업데이트
- **간결성**: 불필요한 주석은 지양 (자명한 코드는 주석 불필요)
- **한글**: 모든 주석은 한글로 작성

### 6. 타입/상수 주석
```typescript
/** 명령 상태를 나타내는 열거형 */
enum CommandStatus {
  /** 대기 중 */
  PENDING = 'pending',
  /** 실행 중 */
  RUNNING = 'running',
  /** 완료됨 */
  COMPLETED = 'completed',
}

/** 최대 재시도 횟수 (3회 실패 후 중단) */
const MAX_RETRY_COUNT = 3;
```

### 7. 에러 처리 주석
```typescript
try {
  // 시도할 작업
  await operation();
} catch (error) {
  // 특정 에러 타입별 처리 (타입 가드 사용)
  if (isNetworkError(error)) {
    // 네트워크 에러 처리: 재시도 로직 적용
    await retry();
  } else if (isValidationError(error)) {
    // 검증 에러: 사용자에게 알림
    notify(error.message);
  } else {
    // 예상치 못한 에러: 로깅 후 재시도
    logger.error('Unexpected error', error);
  }
}
```

### 8. 구현 예정 부분 주석
```typescript
// TODO: 성능 최적화 필요 (현재 O(n²), O(n)으로 개선 가능)
// FIXME: 메모리 누수 발생 (cleanup 함수 필요)
// NOTE: 특수 케이스 처리 (사용자가 없는 경우 별도 처리)
```

## Task Documentation Guidelines (태스크 문서화 지침)

모든 태스크 문서는 `.vooster/tasks/` 디렉토리에 작성하며, 다음 규칙을 준수하세요:

### 1. 파일 구조
- **위치**: `.vooster/tasks/T-XXX.txt`
- **양식**: 제목, Task ID, Status, Importance, Complexity, Urgency, Dependencies, Description
- **인코딩**: UTF-8 (한글 포함)

### 2. 태스크 분할 원칙
**기능 완성 중심**: 각 태스크는 독립적으로 테스트 가능한 완성된 기능 단위
- ✅ 단위 테스트 가능
- ✅ 명확한 입력/출력
- ✅ 로컬 환경에서 독립 실행 가능

**적정 복잡도**: 평균 5-7/10 (너무 작거나 크지 않게)
- 3/10 이하: 너무 작음 (다른 태스크와 통합 고려)
- 9/10 이상: 너무 큼 (분리 고려)

**명확한 의존성**: 순차적 구현 가능하도록 설계
- Phase/그룹별로 의존성 체인 구성
- 순환 의존성 금지

### 3. 문서 분산 최소화
**통합 우선 원칙**:
- 관련 기능은 하나의 태스크로 통합 (예: "인증 + 권한 검증" → 하나의 태스크)
- 의존성이 강한 기능은 분리하지 않음 (예: "API 라우트 + 서비스 레이어" → 하나의 태스크)
- 전체 기능의 15% 이내로 태스크 수 제한 (예: 50개 기능 → 최대 7-8개 태스크)
- Phase/그룹별로 2-4개 태스크 권장

**분리가 필요한 경우**:
- 다른 팀원이 병렬로 작업할 때
- 기술 스택이 완전히 다를 때 (예: 브라우저 확장 vs 서버)
- 독립적으로 배포 가능할 때

### 4. Description 섹션 구성
**필수 항목**:
1. **요구사항**: 무엇을 달성해야 하는지 (간결하게, 띄어쓰기 최소화)
2. **구현 상세**: 기술적 세부사항 및 API/라이브러리 사용법
3. **의사코드**: pseudo 코드 블록으로 핵심 로직 설명
4. **테스트 전략**: 단위/통합/E2E 테스트 방법

### 5. 예시

```
# 기능명을 한 줄로 명확하게

**Task ID:** T-XXX
**Status:** BACKLOG
**Importance:** MUST | SHOULD | COULD
**Complexity:** X/10
**Urgency:** X/10
**Dependencies:** T-AAA, T-BBB (없으면 None)

## Description

### 요구사항
- 첫 번째 요구사항을 간결하게 기술 띄어쓰기 최소화
- 두 번째 요구사항

### 구현 상세
- 기술적 구현 방법과 API 사용법
- 라이브러리 선택 및 설정 방법

### 의사코드
```pseudo
function main() {
  // 핵심 로직
}
```

### 테스트 전략
- 단위 테스트 목표 및 방법
- 통합 테스트 시나리오
- E2E 테스트 체크포인트

---

**Created:** YYYY-MM-DDTHH:mm:ss.sssZ
**Updated:** YYYY-MM-DDTHH:mm:ss.sssZ
```

<vooster-docs>
- @./vooster-docs/prd.md
- @./vooster-docs/architecture.md
- @./vooster-docs/guideline.md
- @./vooster-docs/design-guide.md
- @./vooster-docs/ia.md
- @./vooster-docs/step-by-step.md
- @./vooster-docs/clean-code.md
- @./vooster-docs/TYPESCRIPT_REMOTE_CONTROL_INDEX.md
- @./vooster-docs/REMOTE_CONTROL_SUMMARY.md
- @./vooster-docs/rpc-solutions-comparison.md
- @./vooster-docs/remote-control-architecture.md
- @./vooster-docs/remote-control-implementation.md
- @./vooster-docs/distributed-control-system-architecture.md
- @./vooster-docs/distributed-control-implementation-guide.md
- @./vooster-docs/distributed-control-quick-start.md
- @./vooster-docs/frontend-remote-control-websocket.md
- @./vooster-docs/REMOTE-CONTROL-README.md
- @./vooster-docs/remote-control-fullstack.md
- @./vooster-docs/implementation-guide.md
- @./vooster-docs/deployment-guide.md
- @./vooster-docs/FULLSTACK-STRATEGY-SUMMARY.md
</vooster-docs>
