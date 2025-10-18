"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus, Lock, Mail } from "lucide-react";
import { MainLayout } from "@/components/layout";

type SignupPageProps = {
  params: Promise<Record<string, never>>;
};

function SignupPageContent() {
  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">회원가입 일시 중단</h1>
          <p className="max-w-md text-muted-foreground">
            현재 초대 받은 사용자만 이용할 수 있습니다.
          </p>
        </header>

        <div className="grid w-full gap-8 md:grid-cols-2">
          {/* 안내 카드 */}
          <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">초대 기반 시스템</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    관리자가 Supabase에서 직접 초대한 사용자만 로그인할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <Mail className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">계정이 필요하신가요?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    프로젝트 관리자에게 이메일로 계정 생성을 요청하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-muted bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground mb-2">관리자 연락처</p>
              <p className="text-sm text-muted-foreground">
                이메일: <span className="font-mono text-foreground">admin@vooster.com</span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                로그인 페이지로 이동
              </Link>
              <Link
                href="/"
                className="w-full rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </div>

          {/* 이미지 */}
          <figure className="overflow-hidden rounded-xl border border-border">
            <Image
              src="https://picsum.photos/seed/signup-closed/640/640"
              alt="회원가입 일시 중단"
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
