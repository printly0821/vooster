import { createMiddleware } from 'hono/factory';
import {
  contextKeys,
  type AppEnv,
} from '@/backend/hono/context';
import { createServiceClient } from '@/backend/supabase/client';

export const withSupabase = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const config = c.get(
      contextKeys.config,
    ) as AppEnv['Variables']['config'] | undefined;

    if (!config) {
      throw new Error('Application configuration is not available.');
    }

    if (!config.supabase) {
      console.warn(
        '[Supabase] 백엔드: Supabase 설정이 없습니다. Supabase 기능을 사용할 수 없습니다.'
      );
      c.set(contextKeys.supabase, undefined);
      await next();
      return;
    }

    const client = createServiceClient(config.supabase);

    c.set(contextKeys.supabase, client);

    await next();
  });
