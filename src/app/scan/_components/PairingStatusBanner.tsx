/**
 * 현재 페어링 상태 배너
 *
 * 현재 연결된 디스플레이 정보와 연결 끊기 버튼을 표시합니다
 *
 * @param screenId - 현재 페어링된 screenId
 * @param displayName - 디스플레이 이름
 * @param onDisconnect - 연결 끊기 핸들러
 */

'use client';

import * as React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PairingStatusBannerProps {
  /** 현재 페어링된 screenId */
  screenId: string;

  /** 디스플레이 이름 */
  displayName?: string;

  /** 연결 끊기 핸들러 */
  onDisconnect: () => void;
}

export const PairingStatusBanner = React.memo<PairingStatusBannerProps>(
  function PairingStatusBanner({ screenId, displayName, onDisconnect }) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
        <div className="flex items-start justify-between">
          {/* 왼쪽: 상태 정보 */}
          <div className="flex items-start gap-3 flex-1">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">현재 연결됨</p>
              <p className="text-sm text-green-700 mt-0.5">
                {displayName || screenId}
              </p>
            </div>
          </div>

          {/* 오른쪽: 연결 끊기 버튼 */}
          <button
            onClick={onDisconnect}
            className={cn(
              'px-3 py-1.5 bg-white border border-green-600 text-green-700',
              'rounded-md text-sm font-medium hover:bg-green-50',
              'transition-colors flex items-center gap-1 shrink-0 ml-2'
            )}
            aria-label="디스플레이 연결 끊기"
          >
            <X className="w-4 h-4" />
            <span>연결 끊기</span>
          </button>
        </div>
      </div>
    );
  }
);

PairingStatusBanner.displayName = 'PairingStatusBanner';
