import { z } from 'zod';
import type { AppConfig } from '@/backend/hono/context';

const envSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

let cachedConfig: AppConfig | null = null;

export const getAppConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    console.warn(`Backend configuration validation warning: ${messages}`);
    console.warn('Supabase를 사용하지 않습니다.');
  }

  const data = parsed.data;

  cachedConfig = {
    supabase:
      data.SUPABASE_URL && data.SUPABASE_SERVICE_ROLE_KEY
        ? {
            url: data.SUPABASE_URL,
            serviceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY,
          }
        : undefined,
  } satisfies AppConfig;

  return cachedConfig;
};
