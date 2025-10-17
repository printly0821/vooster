import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { CurrentUserSnapshot } from "../types";

const mapUser = (user: User) => ({
  id: user.id,
  email: user.email,
  appMetadata: user.app_metadata ?? {},
  userMetadata: user.user_metadata ?? {},
});

export const loadCurrentUser = async (): Promise<CurrentUserSnapshot> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    console.warn(
      "[Auth] Supabase가 설정되지 않아 현재 사용자를 로드할 수 없습니다."
    );
    return { status: "unauthenticated", user: null };
  }

  const result = await supabase.auth.getUser();
  const user = result.data.user;

  if (user) {
    return {
      status: "authenticated",
      user: mapUser(user),
    };
  }

  return { status: "unauthenticated", user: null };
};
