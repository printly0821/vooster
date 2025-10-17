"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { MainLayout } from "@/components/layout";

type LoginPageProps = {
  params: Promise<Record<string, never>>;
};

export default function LoginPage({ params }: LoginPageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh, isAuthenticated } = useCurrentUser();
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
      router.replace(redirectedFrom);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormState((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage(null);

      if (!isSupabaseConfigured()) {
        setErrorMessage(
          "Supabase가 설정되지 않았습니다. 관리자에게 문의하세요."
        );
        setIsSubmitting(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setErrorMessage(
          "Supabase 클라이언트를 초기화할 수 없습니다. 나중에 다시 시도해주세요."
        );
        setIsSubmitting(false);
        return;
      }

      try {
        const result = await supabase.auth.signInWithPassword({
          email: formState.email,
          password: formState.password,
        });

        const nextAction = result.error
          ? result.error.message ?? "로그인에 실패했습니다."
          : ("success" as const);

        if (nextAction === "success") {
          await refresh();
          const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
          router.replace(redirectedFrom);
        } else {
          setErrorMessage(nextAction);
        }
      } catch (error) {
        setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState.email, formState.password, refresh, router, searchParams]
  );

  if (isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold text-foreground">로그인</h1>
          <p className="text-muted-foreground">
            Supabase 계정으로 로그인하고 보호된 페이지에 접근하세요.
          </p>
        </header>
        <div className="grid w-full gap-8 md:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
          >
            <label className="flex flex-col gap-2 text-sm text-foreground">
              이메일
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={formState.email}
                onChange={handleChange}
                className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-foreground">
              비밀번호
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={formState.password}
                onChange={handleChange}
                className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "로그인 중" : "로그인"}
            </button>
            <p className="text-xs text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="font-medium text-foreground underline hover:opacity-80"
              >
                회원가입
              </Link>
            </p>
          </form>
          <figure className="overflow-hidden rounded-xl border border-border">
            <Image
              src="https://picsum.photos/seed/login/640/640"
              alt="로그인"
              width={640}
              height={640}
              className="h-full w-full object-cover"
              priority
            />
          </figure>
        </div>
      </div>
    </MainLayout>
  );
}
