/**
 * 디스플레이 카드 컴포넌트
 *
 * 디스플레이의 이름, 용도, 상태, 마지막 동기화 시간을 표시합니다
 *
 * @param display - 디스플레이 정보
 * @param isPaired - 현재 페어링된 디스플레이인지 여부
 */

'use client';

import * as React from 'react';
import { Monitor, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Display } from '@/features/remote-display/types';

interface DisplayCardProps {
  /** 디스플레이 정보 */
  display: Display;

  /** 현재 페어링된 디스플레이인지 여부 */
  isPaired: boolean;
}

export const DisplayCard = React.memo<DisplayCardProps>(
  function DisplayCard({ display, isPaired }) {
    /**
     * 상대 시간 변환 (예: "5분 전", "2시간 전")
     */
    const formatRelativeTime = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        const now = Date.now();
        const diff = now - date.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        return `${days}일 전`;
      } catch {
        return '정보 없음';
      }
    };

    return (
      <div
        className={cn(
          'p-4 rounded-lg border-2 transition-all',
          isPaired
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        )}
      >
        <div className="flex items-start justify-between">
          {/* 왼쪽: 정보 */}
          <div className="flex items-start gap-3 flex-1">
            {/* 아이콘 */}
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                display.online ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <Monitor className="w-5 h-5 text-white" />
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {display.name}
                </h3>
                {isPaired && (
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                {display.purpose}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                마지막 동기화: {formatRelativeTime(display.lastSeen)}
              </p>
            </div>
          </div>

          {/* 오른쪽: 상태 배지 */}
          <div className="ml-2 shrink-0">
            <span
              className={cn(
                'inline-block px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap',
                display.online
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {display.online ? '온라인' : '오프라인'}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

DisplayCard.displayName = 'DisplayCard';
