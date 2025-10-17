'use client';

import * as React from 'react';
import { Settings, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenInfo: () => void;
}

/**
 * 상단 네비게이션 바 (3개 아이콘)
 * - 좌측: 설정 (⚙️)
 * - 중앙: 히스토리 (📋)
 * - 우측: 정보 (ℹ️)
 */
export function TopBar({
  onOpenSettings,
  onOpenHistory,
  onOpenInfo,
}: TopBarProps) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 8px) + 12px)` }}
    >
      {/* 설정 버튼 */}
      <button
        onClick={onOpenSettings}
        className={cn(
          'p-3 rounded-full',
          'bg-black/30 hover:bg-black/50',
          'backdrop-blur-sm',
          'transition-all active:scale-95',
          'shadow-lg text-white',
          'aria-label="설정"'
        )}
        aria-label="설정"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* 히스토리 버튼 (중앙) */}
      <button
        onClick={onOpenHistory}
        className={cn(
          'p-3 rounded-full',
          'bg-black/30 hover:bg-black/50',
          'backdrop-blur-sm',
          'transition-all active:scale-95',
          'shadow-lg text-white',
          'aria-label="히스토리"'
        )}
        aria-label="히스토리"
      >
        <Clock className="w-6 h-6" />
      </button>

      {/* 정보 버튼 */}
      <button
        onClick={onOpenInfo}
        className={cn(
          'p-3 rounded-full',
          'bg-black/30 hover:bg-black/50',
          'backdrop-blur-sm',
          'transition-all active:scale-95',
          'shadow-lg text-white',
          'aria-label="정보"'
        )}
        aria-label="정보"
      >
        <Info className="w-6 h-6" />
      </button>
    </div>
  );
}
