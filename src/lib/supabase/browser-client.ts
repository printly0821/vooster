"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/constants/env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

export const isSupabaseConfigured = (): boolean => {
  return !!(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

export const getSupabaseBrowserClient = (): SupabaseClient<Database> | null => {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[Supabase] 클라이언트: Supabase 환경 변수가 설정되지 않았습니다. Supabase 기능을 사용할 수 없습니다."
    );
    return null;
  }

  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
};
