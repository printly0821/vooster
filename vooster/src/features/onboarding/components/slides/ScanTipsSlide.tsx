'use client';

import { Focus, Lightbulb } from 'lucide-react';

export function ScanTipsSlide() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 px-4 py-8 text-center">
      <div className="rounded-full bg-secondary/10 p-6">
        <Focus className="h-16 w-16 text-secondary" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          바코드 스캔 방법
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          정확한 스캔을 위해 다음 팁을 참고하세요.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3 text-sm">
        <div className="rounded-lg border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">바코드를 화면 중앙에 배치</p>
              <p className="mt-1 text-muted-foreground">
                카메라 뷰의 가이드 영역 안에 바코드를 맞춰주세요
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">적절한 거리 유지</p>
              <p className="mt-1 text-muted-foreground">
                너무 가깝거나 멀지 않게, 바코드가 선명하게 보이도록 조절하세요
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-left">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium text-foreground">밝은 조명 권장</p>
              <p className="mt-1 text-muted-foreground">
                어두운 환경에서는 플래시를 켜서 스캔 성공률을 높이세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
