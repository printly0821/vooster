'use client';

import { Camera, AlertCircle } from 'lucide-react';

export function PermissionSlide() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 px-4 py-8 text-center">
      <div className="rounded-full bg-primary/10 p-6">
        <Camera className="h-16 w-16 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          카메라 권한 허용
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          바코드를 스캔하려면 카메라 접근 권한이 필요합니다.
          <br />
          브라우저에서 권한 요청이 표시되면 '허용'을 선택해주세요.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1 text-left text-sm">
              <p className="font-medium text-foreground">권한이 거부된 경우</p>
              <p className="text-muted-foreground">
                브라우저 설정에서 카메라 권한을 직접 허용해야 합니다.
                <br />
                주소창 왼쪽의 자물쇠 아이콘을 클릭하여 설정할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
