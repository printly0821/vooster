/**
 * 페어링 승인 확인 모달
 *
 * QR 스캔 후 디스플레이를 추가할지 사용자에게 확인을 요청합니다
 *
 * @param displayName - 디스플레이 이름
 * @param purpose - 디스플레이 용도
 * @param onConfirm - 확인 버튼 클릭 핸들러
 * @param onCancel - 취소 버튼 클릭 핸들러
 * @param isLoading - 로딩 상태
 */

'use client';

import * as React from 'react';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PairingConfirmModalProps {
  /** 디스플레이 이름 */
  displayName: string;

  /** 디스플레이 용도 */
  purpose: string;

  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void;

  /** 취소 버튼 클릭 핸들러 */
  onCancel: () => void;

  /** 로딩 상태 */
  isLoading?: boolean;
}

export const PairingConfirmModal = React.memo<PairingConfirmModalProps>(
  function PairingConfirmModal({
    displayName,
    purpose,
    onConfirm,
    onCancel,
    isLoading = false,
  }) {
    return (
      <>
        {/* 배경 오버레이 */}
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
          role="presentation"
        >
          {/* 모달 */}
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 아이콘 */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-blue-600" />
            </div>

            {/* 제목 */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              디스플레이 추가
            </h3>

            {/* 설명 */}
            <div className="text-center mb-6 space-y-1">
              <p className="text-gray-600">
                <span className="font-semibold text-gray-900">
                  {displayName}
                </span>
              </p>
              <p className="text-sm text-gray-500">({purpose})</p>
              <p className="text-sm text-gray-600 mt-2">
                을(를) 추가하시겠습니까?
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className={cn(
                  'flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg',
                  'font-medium hover:bg-gray-200 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  'flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg',
                  'font-medium hover:bg-blue-700 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);

PairingConfirmModal.displayName = 'PairingConfirmModal';
