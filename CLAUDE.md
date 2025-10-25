
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

### 6. 태스크 완료 후 커밋 규칙

**필수 요구사항**: 각 태스크 구현이 완료되고 테스트를 통과하면 **반드시 커밋**해야 합니다.

**커밋 시점**:
- ✅ 태스크의 모든 요구사항 구현 완료
- ✅ 단위 테스트 통과
- ✅ 통합 테스트 통과 (해당하는 경우)
- ✅ 로컬 환경에서 정상 동작 확인

**커밋 메시지 형식**:
```
feat(task-id): 태스크 제목

- 주요 구현 내용 1
- 주요 구현 내용 2
- 테스트 결과

Implements: T-XXX
```

**예시**:
```
feat(T-012): Socket.IO 서버 기본 설정 및 JWT 인증

- Socket.IO 서버 /display 네임스페이스 구현
- JWT 기반 클라이언트 인증 및 5초 타임아웃
- 재연결 시 기존 세션 정리 로직
- 단위 테스트 및 통합 테스트 통과

Implements: T-012
```

**주의사항**:
- 태스크 중간에 부분 커밋 가능 (진행 상황 저장용)
- 하지만 **태스크 완료 시 최종 커밋은 필수**
- 커밋하지 않으면 다음 태스크로 진행 금지
- 커밋 메시지에 반드시 `Implements: T-XXX` 포함하여 추적 가능하도록 함

## 태스크 구현 프로세스 (Task Implementation Workflow)

모든 태스크는 다음의 3단계 프로세스로 진행됩니다:

### **Phase 1: 분석 및 계획 (Analysis & Planning)**

각 태스크를 구현하기 전에 **반드시** 다음 단계를 거쳐야 합니다:

#### 1.1 전문가 팀 구성
```
- typescript-pro: TypeScript 타입 시스템 및 코드 구조 설계
- backend-developer: 백엔드 API, 데이터베이스 설계
- react-specialist: 프론트엔드 통합 (필요시)
- nextjs-developer: 풀스택 구현 (필요시)
```

#### 1.2 분석 항목
다음 항목들을 **순차적으로** 분석합니다 (각각 Task tool 사용):

1. **아키텍처 분석** (`backend-developer`)
   - 기존 코드베이스 구조 파악
   - API 설계 및 DB 스키마 검토
   - 관련 의존성 확인
   - 성능/확장성 고려사항

2. **타입 및 인터페이스 설계** (`typescript-pro`)
   - 요청/응답 타입 정의
   - Zod 검증 스키마 설계
   - 에러 타입 정의
   - 기존 타입과의 호환성 확인

3. **API 엔드포인트 설계** (`backend-developer`)
   - REST/WebSocket 엔드포인트 정의
   - 요청 본문 및 응답 형식
   - 상태 코드 및 에러 응답
   - 보안 (인증/권한) 요구사항

4. **데이터 모델 설계** (`backend-developer`)
   - DB 테이블/컬렉션 스키마
   - 필드 타입 및 제약사항
   - 인덱스 및 성능 고려
   - 마이그레이션 전략

5. **통합 포인트 확인** (`backend-developer`)
   - 기존 서비스와의 연결
   - Socket.IO 이벤트 통합
   - 인증/권한 시스템 통합
   - 로깅 시스템 통합

#### 1.3 계획 수립
모든 분석 완료 후 ExitPlanMode를 호출하여:
- **구현 단계(Phase)** 정의
- **생성/수정할 파일** 명확히
- **각 Phase의 구현 내용** 상세 기술
- **테스트 전략** 포함

### **Phase 2: 구현 (Implementation)**

계획이 승인된 후 진행합니다:

#### 2.1 구현 순서
- Phase 1부터 순차적으로 진행
- 각 Phase 완료 후 즉시 마크 (TodoWrite)
- 독립적인 Phase는 병렬 처리 가능

#### 2.2 코드 작성
- CLAUDE.md의 모든 코드 주석 규칙 준수
- JSDoc 주석 필수 작성
- 한글 주석 작성
- 타입 정의 명확히 함

#### 2.3 테스트
- 각 Phase 완료 후 해당 테스트 작성
- 모든 테스트 통과 확인
- 로컬 환경에서 동작 검증

### **Phase 3: 검증 및 커밋 (Validation & Commit)**

#### 3.1 최종 검증
- ✅ 모든 요구사항 구현 완료
- ✅ 단위 테스트 통과
- ✅ 통합 테스트 통과
- ✅ 코드 스타일 확인 (주석, 타입 등)

#### 3.2 커밋
- git status로 변경사항 확인
- 모든 파일이 추적되고 있는지 확인
- 구현 내용을 요약한 커밋 메시지 작성
- Implements: T-XXX 포함

#### 3.3 다음 태스크
- 현재 태스크가 완료되면 다음 태스크로 진행
- 이전 태스크 미완료 시 진행 금지

### 예시: T-014 구현 프로세스

```
1️⃣ 분석 및 계획 단계
   ├─ Task(backend-developer): 기존 코드베이스 구조 분석
   ├─ Task(typescript-pro): API 타입 및 검증 스키마 설계
   ├─ Task(backend-developer): API 엔드포인트 및 DB 설계
   ├─ Task(backend-developer): 통합 포인트 분석
   └─ ExitPlanMode: 상세 구현 계획 제시 및 승인

2️⃣ 구현 단계
   ├─ Phase 1: 타입 및 검증 스키마 추가
   ├─ Phase 2: 디스플레이 등록/관리 API
   ├─ Phase 3: 페어링 API (QR, 폴링, 승인)
   ├─ Phase 4: 트리거 API 및 Rate Limiting
   └─ Phase 5: 테스트 작성 및 E2E 검증

3️⃣ 검증 및 커밋
   ├─ 모든 테스트 통과 확인
   ├─ git add & git commit
   └─ T-014 완료 → T-015로 진행
```

### 주요 원칙

**분석 먼저, 구현 나중**:
- 분석 없이 구현하지 말 것
- 각 전문가 분석을 순차적으로 진행할 것

**명확한 계획**:
- Phase, 파일, 구현 내용이 명확해야 함
- 사용자의 승인을 받은 후 구현 시작

**테스트 우선**:
- 구현 완료 후 테스트 작성 (X)
- 구현 중/완료 후 즉시 테스트 작성 (O)

**커밋 필수**:
- 태스크 완료 = 커밋 필수
- 미커밋 상태에서 다음 태스크 진행 금지

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
