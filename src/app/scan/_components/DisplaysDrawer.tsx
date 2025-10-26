/**
 * 디스플레이 관리 드로어 컴포넌트
 *
 * 책임:
 * - 디스플레이 목록 표시 (GET /api/displays)
 * - 검색 및 필터링 (이름, 라인별, 온라인만 보기)
 * - 현재 페어링 상태 표시
 * - QR 스캔 모드로 전환
 *
 * @example
 * <DisplaysDrawer
 *   open={displayDrawerOpen}
 *   onClose={() => setDisplayDrawerOpen(false)}
 *   onStartPairing={() => router.push('/scan?mode=pairing')}
 * />
 */

'use client';

import * as React from 'react';
import { X, Search, Plus, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisplayCard } from './DisplayCard';
import { PairingStatusBanner } from './PairingStatusBanner';
import { useDisplays } from '../_hooks/useDisplays';
import { usePairedDisplay } from '../_hooks/usePairedDisplay';

interface DisplaysDrawerProps {
  /** 드로어 열림 상태 */
  open: boolean;

  /** 드로어 닫기 핸들러 */
  onClose: () => void;

  /** QR 스캔 모드로 전환 핸들러 */
  onStartPairing: () => void;
}

export const DisplaysDrawer = React.memo<DisplaysDrawerProps>(
  function DisplaysDrawer({ open, onClose, onStartPairing }) {
    // 상태 관리
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedLine, setSelectedLine] = React.useState<string>('all');
    const [onlineOnly, setOnlineOnly] = React.useState(true);

    // Hooks
    const { pairedScreenId, displayName, disconnect } = usePairedDisplay();
    const { displays, isLoading, error, refetch } = useDisplays({
      lineId: selectedLine === 'all' ? undefined : selectedLine,
      onlineOnly,
    });

    // 검색 필터링 (useMemo로 최적화)
    const filteredDisplays = React.useMemo(() => {
      if (!searchQuery.trim()) return displays;

      const query = searchQuery.toLowerCase();
      return displays.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.purpose.toLowerCase().includes(query)
      );
    }, [displays, searchQuery]);

    /**
     * 연결 끊기 핸들러
     */
    const handleDisconnect = React.useCallback(() => {
      if (!confirm('연결을 해제하시겠습니까?')) return;
      disconnect();
      // 디스플레이 목록 새로고침 (선택사항)
      refetch();
    }, [disconnect, refetch]);

    /**
     * 드로어 닫기 시 검색어 초기화 (선택사항)
     */
    const handleClose = React.useCallback(() => {
      // 검색어는 유지하고 드로어만 닫음
      onClose();
    }, [onClose]);

    if (!open) return null;

    return (
      <>
        {/* 배경 오버레이 */}
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          role="presentation"
        />

        {/* 드로어 */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {/* 헤더 (sticky) */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                디스플레이 관리
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="p-4 space-y-4">
            {/* 현재 페어링 상태 */}
            {pairedScreenId && (
              <PairingStatusBanner
                screenId={pairedScreenId}
                displayName={displayName || undefined}
                onDisconnect={handleDisconnect}
              />
            )}

            {/* 검색 및 필터 섹션 */}
            <div className="space-y-3">
              {/* 검색창 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="디스플레이 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  )}
                  aria-label="디스플레이 검색"
                />
              </div>

              {/* 필터 행 */}
              <div className="flex items-center gap-2">
                {/* 라인 선택 드롭다운 */}
                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className={cn(
                    'flex-1 px-3 py-2 border border-gray-300 rounded-lg',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500'
                  )}
                  aria-label="라인 필터"
                >
                  <option value="all">전체 라인</option>
                  <option value="cutting">커팅라인</option>
                  <option value="coating">코팅라인</option>
                  <option value="packaging">포장라인</option>
                </select>

                {/* 온라인만 보기 체크박스 */}
                <label className={cn(
                  'flex items-center gap-2 px-3 py-2 border border-gray-300',
                  'rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'
                )}>
                  <input
                    type="checkbox"
                    checked={onlineOnly}
                    onChange={(e) => setOnlineOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    aria-label="온라인 디스플레이만 표시"
                  />
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    온라인만
                  </span>
                </label>
              </div>
            </div>

            {/* 디스플레이 목록 섹션 */}
            {isLoading ? (
              <div className="py-8 text-center text-gray-500">
                로딩 중...
              </div>
            ) : error ? (
              <div className="py-8 text-center text-red-500">
                <p className="font-medium">에러: {error}</p>
                <button
                  onClick={refetch}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredDisplays.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>디스플레이가 없습니다</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                  >
                    검색어 초기화
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDisplays.map((display) => (
                  <DisplayCard
                    key={display.screenId}
                    display={display}
                    isPaired={display.screenId === pairedScreenId}
                  />
                ))}
              </div>
            )}

            {/* 추가 버튼 */}
            <button
              onClick={onStartPairing}
              className={cn(
                'w-full py-3 bg-blue-600 text-white rounded-lg font-medium',
                'hover:bg-blue-700 transition-colors flex items-center justify-center gap-2'
              )}
              aria-label="QR 스캔으로 디스플레이 추가"
            >
              <Plus className="w-5 h-5" />
              <span>디스플레이 추가 (QR 스캔)</span>
            </button>
          </div>

          {/* 하단 패딩 (스크롤 여유) */}
          <div className="h-8" />
        </div>
      </>
    );
  }
);

DisplaysDrawer.displayName = 'DisplaysDrawer';
