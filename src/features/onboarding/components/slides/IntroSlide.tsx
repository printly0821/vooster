'use client';

import { Scan } from 'lucide-react';

export function IntroSlide() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 px-4 py-8 text-center">
      <div className="rounded-full bg-accent/10 p-6">
        <Scan className="h-16 w-16 text-accent" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          바코드 주문 조회에 오신 것을 환영합니다
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          바코드를 스캔하여 주문 정보를 빠르게 확인하세요.
          <br />
          간편하고 정확한 주문 관리를 시작해보세요.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-2 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
            1
          </span>
          <p className="text-left">바코드 스캔으로 즉시 주문 조회</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
            2
          </span>
          <p className="text-left">주문 이미지와 상세 정보 확인</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
            3
          </span>
          <p className="text-left">최근 조회 내역으로 빠른 재확인</p>
        </div>
      </div>
    </div>
  );
}
