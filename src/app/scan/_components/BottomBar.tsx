'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, Flashlight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';
type FlashMode = 'auto' | 'on' | 'off';

interface BottomBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  flashMode: FlashMode;
  scanStatus: ScanStatus;
}

/**
 * 하단 네비게이션 바 (3개 아이콘)
 * - 좌측: 줌 컨트롤 (🔍)
 * - 중앙: 플래시 상태 (💡)
 * - 우측: 스캔 상태 (📊)
 */
export function BottomBar({
  zoom,
  onZoomChange,
  flashMode,
  scanStatus,
}: BottomBarProps) {
  const [showZoomSlider, setShowZoomSlider] = React.useState(false);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.5, 3.0));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.5, 1.0));
  };

  const getFlashIcon = () => {
    return flashMode === 'off' ? 'OFF' : flashMode === 'on' ? 'ON' : 'AUTO';
  };

  const getStatusIcon = () => {
    const statusConfig = {
      idle: { icon: '⚪', label: '준비' },
      scanning: { icon: '🔵', label: '스캔' },
      success: { icon: '🟢', label: '완료' },
      error: { icon: '🔴', label: '오류' },
    };
    return statusConfig[scanStatus];
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 8px) + 16px)` }}
    >
      <div className="bg-black/50 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-around gap-4 max-w-lg mx-auto">
          {/* 줌 컨트롤 */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowZoomSlider(!showZoomSlider)}
              className={cn(
                'p-3 rounded-full',
                'bg-white/20 hover:bg-white/30',
                'transition-all active:scale-95',
                'text-white',
                'aria-label="줌"'
              )}
              aria-label="줌"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            {/* 줌 슬라이더 (탭 시 표시) */}
            {showZoomSlider && (
              <div className="flex flex-col items-center gap-2 bg-black/60 px-3 py-2 rounded-lg">
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  aria-label="줌 슬라이더"
                />
                <span className="text-white text-xs font-medium">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            )}
          </div>

          {/* 플래시 상태 (읽기 전용) */}
          <div className="flex flex-col items-center gap-1">
            <button
              disabled
              className={cn(
                'p-3 rounded-full',
                'bg-white/20 cursor-not-allowed',
                'text-white',
                'opacity-70'
              )}
              aria-label={`플래시: ${flashMode}`}
              title="설정에서 플래시 모드를 변경하세요"
            >
              <Flashlight className="w-5 h-5" />
            </button>
            <span className="text-white text-xs font-medium">
              {getFlashIcon()}
            </span>
          </div>

          {/* 스캔 상태 (읽기 전용) */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'p-3 rounded-full',
                'transition-colors duration-300',
                scanStatus === 'success'
                  ? 'bg-green-500/30'
                  : scanStatus === 'error'
                  ? 'bg-red-500/30'
                  : scanStatus === 'scanning'
                  ? 'bg-blue-500/30'
                  : 'bg-white/20'
              )}
            >
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xs font-medium">
              {getStatusIcon().label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
