"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { MainLayout } from "@/components/layout";

const defaultFormState = {
  email: "",
  password: "",
  confirmPassword: "",
};

type SignupPageProps = {
  params: Promise<Record<string, never>>;
};

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, refresh } = useCurrentUser();
  const [formState, setFormState] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
      router.replace(redirectedFrom);
    }
  }, [isAuthenticated, router, searchParams]);

  const isSubmitDisabled = useMemo(
    () =>
      !formState.email.trim() ||
      !formState.password.trim() ||
      formState.password !== formState.confirmPassword,
    [formState.confirmPassword, formState.email, formState.password]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormState((previous) => ({ ...previous, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);

      if (formState.password !== formState.confirmPassword) {
        setErrorMessage("비밀번호가 일치하지 않습니다.");
        setIsSubmitting(false);
        return;
      }

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
        const result = await supabase.auth.signUp({
          email: formState.email,
          password: formState.password,
        });

        if (result.error) {
          setErrorMessage(result.error.message ?? "회원가입에 실패했습니다.");
          setIsSubmitting(false);
          return;
        }

        await refresh();

        const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";

        if (result.data.session) {
          router.replace(redirectedFrom);
          return;
        }

        setInfoMessage(
          "확인 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요."
        );
        router.prefetch("/login");
        setFormState(defaultFormState);
      } catch (error) {
        setErrorMessage("회원가입 처리 중 문제가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState.confirmPassword, formState.email, formState.password, refresh, router, searchParams]
  );

  if (isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold text-foreground">회원가입</h1>
          <p className="text-muted-foreground">
            Supabase 계정으로 회원가입하고 프로젝트를 시작하세요.
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
                autoComplete="new-password"
                required
                value={formState.password}
                onChange={handleChange}
                className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-foreground">
              비밀번호 확인
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={formState.confirmPassword}
                onChange={handleChange}
                className="rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {infoMessage ? (
              <p className="text-sm text-accent">{infoMessage}</p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting || isSubmitDisabled}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "등록 중" : "회원가입"}
            </button>
            <p className="text-xs text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline hover:opacity-80"
              >
                로그인으로 이동
              </Link>
            </p>
          </form>
          <figure className="overflow-hidden rounded-xl border border-border">
            <Image
              src="https://picsum.photos/seed/signup/640/640"
              alt="회원가입"
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

export default function SignupPage({ params }: SignupPageProps) {
  void params;
  return (
    <Suspense fallback={<MainLayout><div className="flex items-center justify-center min-h-screen"><p>로딩 중...</p></div></MainLayout>}>
      <SignupPageContent />
    </Suspense>
  );
}
