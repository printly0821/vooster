# TypeScript 타입 시스템 분석 요약

**최종 작성일**: 2025-10-22
**버전**: 1.0.0
**대상 문서**: `/vooster-docs/features/typescript-type-system-guide.md`

---

## 개요

Vooster 바코드 스캔 웹앱의 **전체 TypeScript 타입 시스템**을 분석하고 정리한 완벽 가이드입니다.

### 핵심 내용

1. **Socket.IO 실시간 통신의 타입 안전성**
2. **React Hooks의 타입 정의 패턴**
3. **동기화 엔진의 Zod 기반 검증**
4. **API 클라이언트의 제네릭 타입 설계**
5. **TypeScript 고급 패턴과 Best Practices**

---

## 주요 분석 결과

### 1. Socket.IO 타입 시스템

**파일**: `server/src/types/index.ts`

#### 현황
- ✅ 모든 이벤트 페이로드를 인터페이스로 정의
- ✅ 클라이언트↔서버 이벤트 분리
- ✅ 콜백(ACK) 타입 지원

#### 구현 패턴
```typescript
// 이벤트별 타입 정의
export interface EventPayload {
  scanOrder: {
    sessionId: string;
    orderNo: string;
    ts: number;
    nonce?: string;
  };
  'session:created': {
    sessionId: string;
    pairingToken: string;
    expiresIn: number;
    pairingUrl: string;
  };
  // ...
}

// 타입 안전 Socket 타입
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
```

#### 개선사항
- [ ] 런타임 검증용 Zod 스키마 추가
- [ ] 에러 이벤트 페이로드 표준화
- [ ] ACK 콜백 재시도 로직 타입화

---

### 2. React Hooks 타입 정의

**파일**:
- `src/hooks/use-toast.ts`
- `src/hooks/useViewportMargin.ts`
- 기타 커스텀 훅

#### 현황
- ✅ useToast: 완전히 타입화된 상태 관리
- ✅ React Query 통합: 완벽한 타입 추론
- ✅ Zustand 스토어: 타입 안전 상태 관리

#### useToast 패턴
```typescript
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Discriminated Union으로 액션 정의
type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string };
```

#### React Query 패턴
```typescript
// 쿼리 키 타입화
export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
} as const;

// 훅에서 타입 추론
export function useOrderQuery(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<unknown>(`/api/orders/${orderId}`);
      return OrderSchema.parse(response.data); // 런타임 검증
    },
  });
}
```

#### 개선사항
- [ ] 커스텀 훅들의 명시적 반환 타입 추가
- [ ] useCallback/useMemo 타입 안정성 강화
- [ ] 오래된 React 패턴 제거

---

### 3. 동기화 엔진 타입

**파일**: `server/src/sync/types.ts`

#### 현황
- ✅ Enum으로 상태/우선순위 정의
- ✅ Zod 스키마로 런타임 검증
- ✅ 타입 추론으로 LocalTask, RemoteTask 생성

#### 핵심 타입
```typescript
// 런타임 검증 스키마
export const LocalTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

// 타입 자동 추론
export type LocalTask = z.infer<typeof LocalTaskSchema>;

// 판별된 합(Discriminated Union)으로 동기화 결과
export const SyncResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    operation: z.enum(['create', 'update', 'delete']),
    // ...
  }),
  z.object({
    status: z.literal('error'),
    error: z.string(),
    // ...
  }),
]);

export type SyncResult = z.infer<typeof SyncResultSchema>;
```

#### 개선사항
- [ ] 충돌 해결 결과 타입 강화
- [ ] API 에러 응답 표준화
- [ ] 매핑 레코드 타입 확장

---

### 4. API 클라이언트 타입

**파일**:
- `src/lib/remote/api-client.ts`
- `src/features/orders/backend/schema.ts`

#### 현황
- ✅ Axios 기반 제네릭 클라이언트
- ✅ 요청/응답 Zod 스키마
- ✅ 커스텀 ApiError 클래스

#### 패턴
```typescript
// 제네릭 GET 메서드
async get<T>(url: string, schema?: z.ZodSchema<T>): Promise<T> {
  const response = await this.client.get<T>(url);

  if (schema) {
    const result = schema.safeParse(response.data);
    if (!result.success) {
      throw new ApiError('VALIDATION_ERROR', 400, 'Response validation failed');
    }
    return result.data;
  }

  return response.data;
}

// 사용
const order = await apiClient.get<Order>(
  `/api/orders/123`,
  OrderSchema
);
```

#### 개선사항
- [ ] 요청 인터셉터에서 요청 검증 추가
- [ ] 재시도 로직 타입화
- [ ] GraphQL 클라이언트 타입 추가

---

### 5. TypeScript 설정 및 도구

**파일**: `tsconfig.json`

#### 현황 설정
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2017",
    "moduleResolution": "bundler"
  }
}
```

#### 평가
- ✅ Strict 모드 완전 활성화
- ✅ 모든 필수 검사 플래그 활성화
- ⚠️ ESLint 규칙과의 동기화 필요

#### 개선사항
- [ ] `noUnusedLocals`/`noUnusedParameters` 활성화
- [ ] `useDefineForClassFields` 확인
- [ ] Path mapping 최적화

---

## 주요 패턴 및 Best Practices

### 1. Zod 기반 런타임 검증
```typescript
// ✅ 권장
const result = OrderSchema.safeParse(data);
if (result.success) {
  return result.data; // 완벽히 타입된 Order
}

// ❌ 피할 것
const order = data as Order; // 타입 강제 변환
```

### 2. Discriminated Union
```typescript
// ✅ 상태를 명확히 하고 불가능한 상태 방지
type LoadingState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// ❌ 여러 boolean으로 상태 표현
// type LoadingState = { loading: boolean; error: boolean; data?: T };
```

### 3. Optional Chaining & Nullish Coalescing
```typescript
// ✅ 안전한 속성 접근
const name = order?.metadata?.title ?? 'Unknown';

// ❌ 위험
// const name = order.metadata.title || 'Unknown';
```

### 4. 조건부 타입
```typescript
// API 응답 타입을 리소스 타입에 따라 결정
type ResponseType<T extends 'order' | 'user'> =
  T extends 'order' ? Order :
  T extends 'user' ? User :
  never;
```

### 5. Mapped Types
```typescript
// 모든 메서드를 비동기로 변환
type AsyncMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};
```

---

## 타입 안전성 체크리스트

### 코드 리뷰 항목

- [ ] 모든 public 함수에 명시적 반환 타입 선언
- [ ] `any` 타입 없음 (필요시 `unknown` + 타입 가드)
- [ ] 모든 API 응답에 Zod 스키마 정의
- [ ] Union 타입에서 모든 케이스 처리 (exhaustive check)
- [ ] null/undefined 명시적 처리
- [ ] 제네릭 제약조건 명확히 정의
- [ ] 콜백 함수 타입 명시
- [ ] 비동기 함수는 Promise 반환 타입 선언

### 테스트 항목

- [ ] 타입 테스트 작성 (tsd 사용)
- [ ] Zod 런타임 검증 테스트
- [ ] 제네릭 타입 추론 테스트
- [ ] Union 타입 exhaustive check 테스트

---

## 주요 Pitfalls & 해결책

### 1. 암묵적 any

**문제**:
```typescript
const data = await fetchData(); // any로 추론
console.log(data.name); // 타입 검사 없음
```

**해결**:
```typescript
const result = OrderSchema.safeParse(data);
if (result.success) {
  console.log(result.data.name); // Order 타입
}
```

### 2. Promise 체인 누락

**문제**:
```typescript
function getOrder(): Order {
  return apiClient.get('/api/orders/123'); // Promise<Order> 반환
}
```

**해결**:
```typescript
async function getOrder(): Promise<Order> {
  return apiClient.get('/api/orders/123');
}
```

### 3. 상태 표현 복잡화

**문제**:
```typescript
interface LoadingState {
  loading: boolean;
  error: boolean;
  data?: Order;
  // 불가능한 상태 가능: loading=true, error=true
}
```

**해결**:
```typescript
type LoadingState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

### 4. 타입 강제 변환

**문제**:
```typescript
const order = data as Order; // 검증 없음
console.log(order.nonExistent); // 런타임 에러
```

**해결**:
```typescript
const result = OrderSchema.safeParse(data);
if (!result.success) throw new Error('Invalid order');
const order = result.data;
```

---

## 개선 로드맵

### Phase 1 (즉시 - Sprint 1)
- [ ] Socket.IO 이벤트 Zod 스키마 추가
- [ ] 모든 API 엔드포인트 요청/응답 스키마 정의
- [ ] ESLint TypeScript 규칙 강화

### Phase 2 (2주 - Sprint 2)
- [ ] 타입 테스트 작성 시작 (tsd)
- [ ] 런타임 검증 테스트 확대
- [ ] 제네릭 타입 중복 제거

### Phase 3 (1개월)
- [ ] 모든 public API에 명시적 타입 추가
- [ ] 타입 설명 JSDoc 추가
- [ ] 타입 문서 자동 생성 설정

---

## 관련 파일 위치

```
프로젝트 구조
├── vooster-docs/
│   ├── features/
│   │   ├── typescript-type-system-guide.md (✨ 새로운 가이드)
│   │   └── camera-guide.md (참조)
│   └── TYPESCRIPT_GUIDE_SUMMARY.md (이 파일)
│
├── server/src/
│   ├── types/index.ts (Socket.IO 타입)
│   ├── sync/types.ts (동기화 엔진 타입)
│   ├── middleware/auth.ts (타입 가드)
│   ├── events/handlers.ts (이벤트 핸들러)
│   └── services/
│       ├── sessionService.ts
│       └── sessionPairingService.ts
│
├── src/
│   ├── hooks/ (React Hooks 타입)
│   ├── lib/remote/api-client.ts (API 타입)
│   ├── features/*/backend/schema.ts (Zod 스키마)
│   └── types/ (공개 타입)
│
└── tsconfig.json (TypeScript 설정)
```

---

## 핵심 메시지

### 타입 시스템의 장점

1. **컴파일 타임 에러 감지**: 런타임 전에 버그 발견
2. **자동 완성**: IDE에서 더 나은 개발 경험
3. **문서화**: 타입이 코드의 계약을 명시
4. **리팩토링 안정성**: 대규모 변경도 안전하게
5. **런타임 검증**: Zod로 외부 데이터 검증

### 실천 방법

```typescript
// 3단계로 타입 안전성 확보

// 1. 스키마 정의 (런타임 검증)
const OrderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

// 2. 타입 추론 (컴파일 타임)
type Order = z.infer<typeof OrderSchema>;

// 3. 런타임 검증 (실행 시)
const result = OrderSchema.safeParse(data);
if (result.success) {
  const order: Order = result.data;
}
```

---

## 참고 자료

- **TypeScript 공식 문서**: https://www.typescriptlang.org/docs/
- **Zod 문서**: https://zod.dev/
- **Socket.IO TypeScript**: https://socket.io/docs/v4/typescript/
- **React Query Types**: https://tanstack.com/query/latest/docs/react/typescript
- **Type Challenges**: https://github.com/type-challenges/type-challenges

---

## 문의 및 피드백

이 가이드에 대한 문의나 개선 사항은 다음 파일을 참고하세요:
- **전체 가이드**: `/vooster-docs/features/typescript-type-system-guide.md`
- **아키텍처**: `/vooster-docs/architecture.md`
- **코드 가이드라인**: `/vooster-docs/guideline.md`

---

**마지막 업데이트**: 2025-10-22
**유지보수**: TypeScript Pro
**상태**: 검토 완료
