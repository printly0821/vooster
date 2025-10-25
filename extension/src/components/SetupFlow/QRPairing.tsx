/**
 * QR 코드 페어링 컴포넌트
 *
 * QR 코드를 표시하고 모바일 앱의 스캔을 기다립니다.
 * WeChat 스타일로 만료 시간 카운트다운과 재생성 버튼을 제공합니다.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import type { QRPairingProps } from '../../types/components';
import { Button } from '../shared/Button';
import { getRemainingSeconds, formatTime } from '../../lib/utils';

/**
 * QRPairing 컴포넌트
 *
 * @param props - QR 페어링 Props
 * @returns QR 코드 표시 화면
 *
 * @example
 * <QRPairing
 *   pairingToken="ABC123"
 *   expiresAt={Date.now() + 180000}
 *   polling={true}
 *   onCancel={handleCancel}
 *   onRegenerate={handleRegenerate}
 * />
 */
export function QRPairing(props: QRPairingProps) {
  const {
    pairingToken,
    expiresAt,
    polling,
    onCancel,
    onRegenerate,
    className = '',
    testId,
  } = props;

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 남은 시간 상태 (초 단위)
  const [remainingSeconds, setRemainingSeconds] = useState(
    getRemainingSeconds(expiresAt)
  );

  // QR 코드 렌더링
  useEffect(() => {
    if (!canvasRef.current || !pairingToken) {
      return;
    }

    // QR 코드 생성 (Canvas에 렌더링)
    QRCode.toCanvas(
      canvasRef.current,
      pairingToken,
      {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (error) => {
        if (error) {
          console.error('QR 코드 생성 실패:', error);
        }
      }
    );
  }, [pairingToken]);

  // 카운트다운 타이머
  useEffect(() => {
    const intervalId = setInterval(() => {
      const remaining = getRemainingSeconds(expiresAt);
      setRemainingSeconds(remaining);

      // 만료되면 타이머 중지
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000); // 1초마다 업데이트

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  // QR 만료 여부
  const isExpired = remainingSeconds <= 0;

  return (
    <div
      className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-md ${className}`}
      data-testid={testId}
    >
      {/* 헤더 */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          QR 코드 스캔
        </h2>
        <p className="text-gray-600">
          모바일 앱으로 QR 코드를 스캔하세요
        </p>
      </div>

      {/* QR 코드 */}
      <div className="flex flex-col items-center gap-4">
        {/* Canvas */}
        <div className={`p-4 bg-gray-50 rounded-lg ${isExpired ? 'opacity-50' : ''}`}>
          <canvas ref={canvasRef} data-testid="qr-canvas" />
        </div>

        {/* 토큰 텍스트 (디버깅용) */}
        <div className="text-center">
          <p className="text-sm text-gray-500">페어링 코드</p>
          <p className="text-xl font-mono font-bold text-gray-800" data-testid="pairing-code">
            {pairingToken}
          </p>
        </div>

        {/* 만료 시간 */}
        <div className="text-center">
          {isExpired ? (
            <p className="text-lg font-semibold text-red-600">만료됨</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">남은 시간</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatTime(expiresAt)}
              </p>
            </>
          )}
        </div>

        {/* 폴링 상태 */}
        {polling && !isExpired && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm">페어링 대기 중...</p>
          </div>
        )}
      </div>

      {/* 버튼 그룹 */}
      <div className="mt-6 flex gap-3">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={polling}
          className="flex-1"
          testId="cancel-button"
        >
          취소
        </Button>

        {isExpired && (
          <Button
            variant="primary"
            onClick={onRegenerate}
            className="flex-1"
            testId="regenerate-button"
          >
            QR 재생성
          </Button>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          📱 모바일 앱에서 QR 코드 스캔 버튼을 누르고 이 코드를 스캔하세요.
        </p>
      </div>
    </div>
  );
}
