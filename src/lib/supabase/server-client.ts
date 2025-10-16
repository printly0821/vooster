import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

type WritableCookieStore = Awaited<ReturnType<typeof cookies>> & {
  set?: (options: {
    name: string;
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  }) => void;
};

export const isSupabaseConfigured = (): boolean => {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

export const createSupabaseServerClient = async (): Promise<
  SupabaseClient<Database> | null
> => {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[Supabase] 서버: Supabase 환경 변수가 설정되지 않았습니다. Supabase 기능을 사용할 수 없습니다."
    );
    return null;
  }

  const cookieStore = (await cookies()) as WritableCookieStore;

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (typeof cookieStore.set === "function") {
              cookieStore.set({ name, value, ...options });
            }
          });
        },
      },
    }
  );
};
