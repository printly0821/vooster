# Code Guideline for Vooster Project

## Tech Stack Specific Guidelines

### Next.js 15 (App Router)
- **ALWAYS use `use client` directive** for all components (default: client-side rendering)
- **Page props must be awaited**: `params` and `searchParams` are promises in Next.js 15
  ```typescript
  // ✅ Correct
  export default async function Page({ params }: PageProps) {
    const { id } = await params;
  }
  
  // ❌ Wrong
  export default function Page({ params }: PageProps) {
    const { id } = params; // Error: params is a Promise
  }
  ```
- Use **App Router** (`src/app/`) for all routing
- Protected routes go in `src/app/(protected)/` route group

### TypeScript
- **Strict type safety**: Enable all strict mode flags
- Use `type` over `interface` for consistency (except when extending)
- Prefer `unknown` over `any`
- Use Zod schemas for runtime validation + type inference

### Styling (TailwindCSS 4)
- **Utility-first approach**: Use Tailwind classes directly
- Use `cn()` utility for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils';
  
  <div className={cn(
    'base-class',
    condition && 'conditional-class',
    variants[variant]
  )} />
  ```
- **No inline styles** unless absolutely necessary
- Follow shadcn/ui component patterns for consistency

## Library Usage Guidelines

| Library | Purpose | Usage Pattern |
|---------|---------|---------------|
| `date-fns` | Date/time manipulation | Import specific functions, avoid moment.js patterns |
| `ts-pattern` | Type-safe branching | Replace complex if/else and switch statements |
| `@tanstack/react-query` | Server state | All API calls go through React Query hooks |
| `zustand` | Client state | Use for UI state, NOT server state |
| `react-use` | Common hooks | Check before writing custom hooks |
| `es-toolkit` | Utilities | Preferred over lodash |
| `lucide-react` | Icons | Always import specific icons |
| `zod` | Validation | Define schemas in `backend/schema.ts` |
| `shadcn/ui` | UI components | Install via `npx shadcn@latest add [component]` |
| `supabase` | Backend | Use provided client utilities |
| `react-hook-form` | Forms | Always combine with Zod resolver |

## Directory Structure & File Organization

### Feature-Based Architecture
```
src/features/[featureName]/
├── backend/              # Server-side logic
│   ├── route.ts         # Hono API routes
│   ├── schema.ts        # Zod validation schemas
│   ├── service.ts       # Business logic
│   └── error.ts         # Feature-specific errors
├── components/          # Feature UI components (use client)
├── hooks/              # React Query hooks & custom hooks
├── lib/                # DTOs, utilities
│   └── dto.ts          # Data transformation functions
├── types.ts            # TypeScript types
└── constants.ts        # Feature constants
```

### Naming Conventions
- **Routes**: `route.ts` (not `api.ts` or `routes.ts`)
- **Components**: PascalCase files matching export (`UserCard.tsx` exports `UserCard`)
- **Hooks**: `use` prefix (`useOrderQuery.ts`)
- **Utils**: `kebab-case.ts` for multi-word utilities

## Backend Architecture (Hono.js)

### Route Pattern
```typescript
// features/orders/backend/route.ts
import type { Hono } from 'hono';
import { respond, success, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { OrderParamsSchema } from './schema';
import { getOrderById } from './service';

export const registerOrderRoutes = (app: Hono<AppEnv>) => {
  app.get('/orders/:id', async (c) => {
    // 1. Validate input
    const parsed = OrderParamsSchema.safeParse({ id: c.req.param('id') });
    if (!parsed.success) {
      return respond(c, failure(400, 'INVALID_PARAMS', 'Invalid order ID', parsed.error));
    }

    // 2. Get dependencies from context
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    // 3. Call service layer
    const result = await getOrderById(supabase, parsed.data.id);

    // 4. Handle errors
    if (!result.ok) {
      logger.error('Failed to fetch order', result.error);
      return respond(c, result);
    }

    // 5. Return success
    return respond(c, result);
  });
};
```

### Service Layer Pattern
```typescript
// features/orders/backend/service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type Result } from '@/backend/http/response';

export async function getOrderById(
  supabase: SupabaseClient,
  id: string
): Promise<Result<Order, OrderError>> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return failure(500, 'DB_ERROR', 'Failed to fetch order', error);
  }

  if (!data) {
    return failure(404, 'NOT_FOUND', 'Order not found');
  }

  return success(data);
}
```

## Frontend Patterns

### Component Structure
```typescript
'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { useOrderQuery } from '../hooks/useOrderQuery';

interface OrderCardProps {
  orderId: string;
  onSelect?: (id: string) => void;
}

export const OrderCard = ({ orderId, onSelect }: OrderCardProps) => {
  const query = useOrderQuery(orderId);

  // Early return for loading/error states
  if (query.isPending) return <LoadingSpinner />;
  if (query.isError) return <ErrorMessage error={query.error} />;

  const order = query.data;

  return (
    <article className="rounded-lg border p-4">
      <h3>{order.name}</h3>
      <Button onClick={() => onSelect?.(orderId)}>Select</Button>
    </article>
  );
};
```

### React Query Hook Pattern
```typescript
// features/orders/hooks/useOrderQuery.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { orderKeys } from '../constants';
import type { Order } from '../types';

export const useOrderQuery = (orderId: string) => {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: async () => {
      const response = await apiClient.get<Order>(`/api/orders/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// constants.ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: string) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
```

## Code Style Best Practices

### 1. Early Returns Over Nested Conditions
```typescript
// ✅ Good
function processOrder(order: Order) {
  if (!order.isValid) return null;
  if (!order.isPaid) return null;
  
  return shipOrder(order);
}

// ❌ Bad
function processOrder(order: Order) {
  if (order.isValid) {
    if (order.isPaid) {
      return shipOrder(order);
    }
  }
  return null;
}
```

### 2. Conditional Classes Over Ternaries
```typescript
// ✅ Good
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class'
)} />

// ❌ Bad
<div className={`base-class ${isActive ? 'active-class' : ''} ${variant === 'primary' ? 'primary-class' : ''}`} />
```

### 3. Descriptive Names
```typescript
// ✅ Good
const isUserAuthenticated = checkAuthStatus();
const fetchUserOrders = async (userId: string) => { ... };

// ❌ Bad
const flag = checkAuthStatus();
const getData = async (id: string) => { ... };
```

### 4. Use Constants Over Magic Values
```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const API_TIMEOUT_MS = 5000;

if (retryCount > MAX_RETRY_ATTEMPTS) { ... }

// ❌ Bad
if (retryCount > 3) { ... }
```

### 5. Functional & Immutable
```typescript
// ✅ Good
const activeOrders = orders.filter(order => order.status === 'active');
const orderIds = orders.map(order => order.id);

// ❌ Bad
const activeOrders = [];
for (let order of orders) {
  if (order.status === 'active') {
    activeOrders.push(order);
  }
}
```

## Error Handling

### Frontend
```typescript
// React Query handles errors automatically
const query = useOrderQuery(orderId);

if (query.isError) {
  return <ErrorFallback error={query.error} />;
}
```

### Backend
```typescript
// Always use Result type
import { success, failure, type Result } from '@/backend/http/response';

async function riskyOperation(): Promise<Result<Data, Error>> {
  try {
    const data = await externalAPI();
    return success(data);
  } catch (error) {
    return failure(500, 'API_ERROR', 'External API failed', error);
  }
}
```

## Testing

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { OrderCard } from './OrderCard';

describe('OrderCard', () => {
  it('should display order name', () => {
    render(<OrderCard orderId="123" />);
    expect(screen.getByText('Order #123')).toBeInTheDocument();
  });
});
```

## Package Management

- **Use npm** (not yarn or pnpm)
- Install shadcn components: `npx shadcn@latest add [component]`
- Run type checks: `npm run typecheck`

## Database (Supabase)

- **Never run Supabase locally**
- Migrations go in `/supabase/migrations/`
- Use migration files for schema changes:
  ```sql
  -- supabase/migrations/20250109_create_orders_table.sql
  CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

## Performance

- Avoid premature optimization
- Use React Query's built-in caching
- Lazy load images with Next.js `Image` component
- Code split with dynamic imports when needed

## Korean Text Handling

- **ALWAYS verify UTF-8 encoding** for Korean text
- Check for broken characters after code generation
- Use proper Unicode escaping if needed

## Final Checklist Before Commit

- [ ] All TypeScript errors resolved
- [ ] No console.logs in production code
- [ ] Proper error handling in place
- [ ] Components use `use client` directive
- [ ] Page params are awaited (Next.js 15)
- [ ] Korean text renders correctly
- [ ] Tests pass (`npm test`)
- [ ] Type check passes (`npm run typecheck`)

## Quick Reference

**Add UI Component**: `npx shadcn@latest add [component]`  
**Run Tests**: `npm test`  
**Type Check**: `npm run typecheck`  
**Dev Server**: `npm run dev`  
**Build**: `npm run build`  

---

**Remember**: Write code that is simple, readable, and maintainable. Optimize for future developers (including yourself) who will read this code.