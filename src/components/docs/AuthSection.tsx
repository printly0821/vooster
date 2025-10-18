'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';

export function AuthSection() {
  const { user, isAuthenticated, isLoading, refresh } = useCurrentUser();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    await refresh();
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        {/* Desktop: 이메일 표시 */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
          <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="max-w-[150px] truncate text-gray-700 dark:text-gray-300">
            {user.email}
          </span>
        </div>

        {/* 로그아웃 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-1"
          aria-label="로그아웃"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    );
  }

  return (
    <Button variant="default" size="sm" asChild>
      <Link href="/login?redirectedFrom=/docs">
        <LogIn className="h-4 w-4 mr-1" />
        로그인
      </Link>
    </Button>
  );
}
