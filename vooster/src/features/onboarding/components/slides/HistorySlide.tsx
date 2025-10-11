'use client';

import { History, Clock } from 'lucide-react';

export function HistorySlide() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 px-4 py-8 text-center">
      <div className="rounded-full bg-primary/10 p-6">
        <History className="h-16 w-16 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          최근 조회 내역
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          이전에 조회한 주문을 빠르게 다시 확인할 수 있습니다.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3 text-sm">
        <div className="rounded-lg border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">자동 저장</p>
              <p className="mt-1 text-muted-foreground">
                스캔한 주문은 자동으로 최근 내역에 저장됩니다
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              ⚡
            </div>
            <div>
              <p className="font-medium text-foreground">빠른 접근</p>
              <p className="mt-1 text-muted-foreground">
                우측 상단의 시계 아이콘을 클릭하여 최근 내역을 확인하세요
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-accent/10 p-4">
          <p className="text-accent font-medium">
            이제 모든 준비가 완료되었습니다!
          </p>
          <p className="mt-1 text-muted-foreground">
            바코드를 스캔하여 주문 조회를 시작해보세요
          </p>
        </div>
      </div>
    </div>
  );
}
