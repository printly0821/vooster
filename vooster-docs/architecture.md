# Technical Requirements Document (TRD)

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4, shadcn/ui components
- **State Management**: Zustand, @tanstack/react-query
- **UI Components**: Radix UI, lucide-react icons, framer-motion
- **Forms**: react-hook-form, @hookform/resolvers, zod validation
- **Theme**: next-themes (dark mode support)

### Backend
- **API Framework**: Hono.js 4 (integrated via Next.js API routes)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: @supabase/ssr
- **HTTP Client**: axios

### Development & Testing
- **Testing**: Vitest, @testing-library/react, Playwright (e2e)
- **Linting**: ESLint 9
- **Package Manager**: npm
- **Build Tool**: Turbopack (Next.js dev mode)

## Directory Structure

```
/
├── src/
│   ├── app/                        # Next.js app router
│   │   ├── (protected)/            # protected routes group
│   │   │   └── dashboard/          # dashboard pages
│   │   ├── api/[[...hono]]/        # Hono API routes
│   │   ├── login/                  # authentication pages
│   │   ├── signup/                 
│   │   ├── layout.tsx              # root layout
│   │   └── providers.tsx           # global providers
│   ├── backend/                    # server-side logic
│   │   ├── hono/                   # Hono app setup & context
│   │   ├── http/                   # HTTP response utilities
│   │   ├── middleware/             # error handling, context
│   │   └── supabase/               # Supabase server client
│   ├── components/                 # shared components
│   │   ├── layout/                 # Header, MainLayout
│   │   └── ui/                     # shadcn/ui components
│   ├── features/                   # feature-based modules
│   │   ├── auth/                   # authentication
│   │   │   ├── context/            # CurrentUserContext
│   │   │   ├── hooks/              # useCurrentUser
│   │   │   └── types.ts            
│   │   └── [feature]/              
│   │       ├── backend/            # route, schema, service, error
│   │       ├── components/         # feature UI components
│   │       ├── hooks/              # feature-specific hooks
│   │       ├── lib/                # DTOs, utilities
│   │       └── types.ts            
│   ├── constants/                  # global constants
│   ├── hooks/                      # shared hooks (use-toast)
│   └── lib/                        
│       ├── remote/                 # API client (axios)
│       ├── supabase/               # browser/server Supabase clients
│       └── utils.ts                # cn utility (tailwind-merge)
├── public/                         # static assets
└── supabase/migrations/            # database migrations
```

## Top-Level Building Blocks

### 1. Authentication Layer
- **Supabase Auth**: Session management via SSR
- **Protected Routes**: Route group `(protected)/` with middleware
- **Context**: `CurrentUserContext` provides user state globally

### 2. API Layer (Hono.js)
- **Catch-all Route**: `app/api/[[...hono]]/route.ts` 
- **Backend Structure**: Each feature has `backend/{route, schema, service, error}`
- **Middleware**: Context injection, error handling
- **Validation**: Zod schemas for request/response

### 3. Frontend Layer
- **Feature-based Architecture**: Each feature is self-contained
- **Component Composition**: shadcn/ui + custom components
- **Data Fetching**: React Query for server state
- **Client State**: Zustand for local state

### 4. Database Layer
- **Supabase PostgreSQL**: Managed database
- **Migrations**: Version-controlled schema changes in `supabase/migrations/`
- **Type Safety**: Generated TypeScript types from Supabase schema

## Data Flow

### Request Flow (Client → Server)
1. **Client Action**: User interacts with UI component
2. **React Query Hook**: Triggers API call via axios client (`lib/remote/api-client.ts`)
3. **Hono Route**: Request hits `backend/[feature]/route.ts`
4. **Validation**: Zod schema validates request
5. **Service Layer**: Business logic in `backend/[feature]/service.ts`
6. **Supabase Client**: Database query via `backend/supabase/client.ts`
7. **Response**: JSON response via `backend/http/response.ts`

### Response Flow (Server → Client)
1. **HTTP Response**: Hono returns JSON
2. **React Query**: Caches and manages server state
3. **DTO Transformation**: Data mapped via `features/[feature]/lib/dto.ts`
4. **Component Render**: UI updates reactively

### Authentication Flow
1. **Login/Signup**: User submits credentials
2. **Supabase Auth**: Creates session cookie
3. **SSR Context**: `@supabase/ssr` validates session on server
4. **Protected Routes**: Middleware checks authentication
5. **Client Context**: `CurrentUserContext` provides user data to components

## Key Technical Decisions

### Why Hono.js?
- Lightweight, fast API framework
- Native TypeScript support
- Easy integration with Next.js API routes

### Why Feature-based Architecture?
- Scalability: Each feature is isolated
- Maintainability: Clear boundaries between modules
- Reusability: Shared components in `/components`

### Why Supabase?
- Managed PostgreSQL with auth built-in
- Real-time subscriptions ready for future features
- Type-safe client generation

### Why React Query?
- Automatic caching and refetching
- Optimistic updates support
- SSR-friendly with Next.js

## Performance Considerations
- **Turbopack**: Fast development builds
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **API Response Caching**: React Query stale-while-revalidate
