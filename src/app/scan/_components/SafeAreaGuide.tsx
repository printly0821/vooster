'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

interface SafeAreaGuideProps {
  status: ScanStatus;
}

/**
 * Safe Area 가이드선 컴포넌트
 * - Safe Area 전체를 둘러싼 얇은 프레임 (1-2px)
 * - 4개 코너에 L자 형태 마커
 * - 스캔 상태에 따라 색상 변경
 */
export function SafeAreaGuide({ status }: SafeAreaGuideProps) {
  const borderColorClasses = {
    idle: 'border-white/60',
    scanning: 'border-white/80',
    success: 'border-green-500',
    error: 'border-red-500',
  };

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        top: 'env(safe-area-inset-top, 8px)',
        right: 'env(safe-area-inset-right, 8px)',
        bottom: 'env(safe-area-inset-bottom, 8px)',
        left: 'env(safe-area-inset-left, 8px)',
      }}
    >
      {/* 메인 가이드선 박스 */}
      <div
        className={cn(
          'absolute inset-0 border-2 rounded-lg transition-colors duration-300',
          borderColorClasses[status]
        )}
      />

      {/* 모서리 마커 - 좌상단 */}
      <div
        className={cn(
          'absolute top-0 left-0 w-6 h-6',
          'border-t-4 border-l-4 border-white rounded-tl-lg'
        )}
      />

      {/* 모서리 마커 - 우상단 */}
      <div
        className={cn(
          'absolute top-0 right-0 w-6 h-6',
          'border-t-4 border-r-4 border-white rounded-tr-lg'
        )}
      />

      {/* 모서리 마커 - 좌하단 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 w-6 h-6',
          'border-b-4 border-l-4 border-white rounded-bl-lg'
        )}
      />

      {/* 모서리 마커 - 우하단 */}
      <div
        className={cn(
          'absolute bottom-0 right-0 w-6 h-6',
          'border-b-4 border-r-4 border-white rounded-br-lg'
        )}
      />
    </div>
  );
}
