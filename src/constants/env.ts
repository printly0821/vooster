import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const _clientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

if (!_clientEnv.success) {
  console.warn('클라이언트 환경 변수 검증 실패:', _clientEnv.error.flatten().fieldErrors);
  console.warn('Supabase를 사용하지 않습니다.');
}

export const env: ClientEnv = _clientEnv.success ? _clientEnv.data : {};
