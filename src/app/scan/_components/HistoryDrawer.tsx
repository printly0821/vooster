'use client';

import * as React from 'react';
import { X, Trash2, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScanHistory } from '../_hooks/useScanHistory';
import { ScanHistoryItem } from '../_types/settings';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectBarcode: (barcode: string) => void;
}

/**
 * 스캔 히스토리 드로어 컴포넌트
 * - 최근 스캔 내역 20건 표시
 * - 클릭하면 해당 주문번호로 이동
 * - 삭제 기능
 */
export function HistoryDrawer({
  open,
  onClose,
  onSelectBarcode,
}: HistoryDrawerProps) {
  const { history, clearHistory, removeItem } = useScanHistory();

  const handleSelectItem = (barcode: string) => {
    onSelectBarcode(barcode);
    onClose();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    // 1분 이내
    if (diff < 60000) {
      return '방금 전';
    }

    // 1시간 이내
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}분 전`;
    }

    // 1일 이내
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }

    // 날짜와 시간
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!open) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 드로어 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              최근 스캔 내역
            </h2>
            {history.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                {history.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-2">
          {history.length > 0 ? (
            <>
              {/* 히스토리 아이템 */}
              {history.map((item, index) => (
                <HistoryItem
                  key={`${item.barcode}-${index}`}
                  item={item}
                  onSelect={() => handleSelectItem(item.barcode)}
                  onDelete={() => removeItem(item.barcode)}
                  formattedTime={formatTime(item.timestamp)}
                />
              ))}

              {/* 전체 삭제 버튼 */}
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
                      clearHistory();
                    }
                  }}
                  className={cn(
                    'w-full mt-4 py-3 px-4 rounded-lg',
                    'border border-red-200 text-red-600 hover:bg-red-50',
                    'transition-colors font-medium text-sm',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  전체 삭제
                </button>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">스캔 내역이 없습니다</p>
              <p className="text-gray-400 text-sm mt-1">
                바코드를 스캔하면 여기에 표시됩니다
              </p>
            </div>
          )}
        </div>

        {/* 하단 패딩 */}
        <div className="h-8" />
      </div>
    </>
  );
}

/**
 * 히스토리 아이템 컴포넌트
 */
interface HistoryItemProps {
  item: ScanHistoryItem;
  onSelect: () => void;
  onDelete: () => void;
  formattedTime: string;
}

function HistoryItem({
  item,
  onSelect,
  onDelete,
  formattedTime,
}: HistoryItemProps) {
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <div
      className={cn(
        'group relative p-3 rounded-lg border transition-all',
        'hover:bg-gray-50 cursor-pointer',
        'border-gray-200'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        {/* 바코드 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {item.barcode}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {item.format} • {formattedTime}
          </p>
          {item.itemName && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
              {item.itemName}
            </p>
          )}
        </div>

        {/* 우측 액션 */}
        <div className="ml-3 flex items-center gap-2">
          {showDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowDelete(false);
              }}
              className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          )}

          {/* 삭제 토글 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(!showDelete);
            }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showDelete
                ? 'bg-gray-200 text-gray-600'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 opacity-0 group-hover:opacity-100'
            )}
            title="삭제 옵션"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
