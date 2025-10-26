/**
 * Options 페이지 루트 컴포넌트
 *
 * 페어링 상태에 따라 적절한 화면을 렌더링합니다.
 * - 페어링 전: DisplayInfoForm -> QRPairing
 * - 페어링 후: Dashboard
 */

import { useEffect, useState } from 'preact/hooks';
import { usePairing } from '../hooks/usePairing';
import { usePolling } from '../hooks/usePolling';
import { DisplayInfoForm } from '../components/SetupFlow/DisplayInfoForm';
import { QRPairing } from '../components/SetupFlow/QRPairing';
import { Dashboard } from '../components/Dashboard/Dashboard';
import { STORAGE_KEYS } from '../types/storage';
import type { PairingInfo } from '../types/storage';

/**
 * App 컴포넌트
 *
 * @returns Options 페이지 전체 화면
 */
export function App() {
  // 페어링 Hook
  const {
    context,
    startPairing,
    onPollSuccess,
    onPollRetry,
    onPollError,
    resetPairing,
  } = usePairing();

  // 디스플레이 이름 입력 상태
  const [displayName, setDisplayName] = useState('');

  // 기존 페어링 정보 확인
  const [existingPairing, setExistingPairing] = useState<PairingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 초기화: Storage에서 기존 페어링 정보 로드
   */
  useEffect(() => {
    async function loadPairingInfo() {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PAIRING);
      const pairing = result[STORAGE_KEYS.PAIRING] as PairingInfo | undefined;

      if (pairing?.isPaired) {
        setExistingPairing(pairing);
      }

      setLoading(false);
    }

    loadPairingInfo();
  }, []);

  /**
   * 폴링 Hook 설정
   */
  usePolling({
    sessionId: context.sessionId || '',
    displayId: context.displayId || '',
    displayName: context.displayName || '',
    enabled: context.state === 'displaying' || context.state === 'polling',
    onSuccess: (wsServerUrl, authToken, tokenExpiresAt) => {
      onPollSuccess(wsServerUrl, authToken, tokenExpiresAt);
      // 페어링 완료 후 기존 페어링 정보 업데이트
      setExistingPairing({
        isPaired: true,
        displayId: context.displayId,
        displayName: context.displayName,
        wsServerUrl,
        authToken,
        tokenExpiresAt,
        pairedAt: Date.now(),
      });
    },
    onRetry: onPollRetry,
    onError: onPollError,
    onTimeout: () => {
      onPollError({
        type: 'timeout',
        message: '페어링 시간이 초과되었습니다. 다시 시도해주세요.',
        retryable: true,
      });
    },
  });

  /**
   * 페어링 시작 핸들러
   */
  async function handleStartPairing(): Promise<void> {
    await startPairing(displayName);
  }

  /**
   * 페어링 해제 핸들러
   */
  async function handleUnpair(): Promise<void> {
    // Storage에서 페어링 정보 삭제
    await chrome.storage.local.remove(STORAGE_KEYS.PAIRING);

    // 상태 초기화
    setExistingPairing(null);
    resetPairing();
    setDisplayName('');
  }

  /**
   * QR 재생성 핸들러 (만료 시)
   */
  async function handleRegenerate(): Promise<void> {
    // 현재 displayName으로 다시 페어링 시작
    if (context.displayName) {
      await startPairing(context.displayName);
    }
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 기존 페어링이 있으면 Dashboard 표시
  if (existingPairing?.isPaired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Dashboard
          displayName={existingPairing.displayName || '알 수 없음'}
          displayId={existingPairing.displayId || ''}
          connectionStatus="disconnected" // TODO: 실제 연결 상태 추적 (T-017에서 구현)
          onUnpair={handleUnpair}
        />
      </div>
    );
  }

  // 페어링 성공 (방금 완료)
  if (context.state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Dashboard
          displayName={context.displayName || '알 수 없음'}
          displayId={context.displayId || ''}
          connectionStatus="connected"
          onUnpair={handleUnpair}
        />
      </div>
    );
  }

  // QR 코드 표시 중
  if (
    (context.state === 'displaying' || context.state === 'polling') &&
    context.pairingToken &&
    context.qrExpiresAt
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <QRPairing
          pairingToken={context.pairingToken}
          expiresAt={context.qrExpiresAt}
          polling={context.state === 'polling'}
          onCancel={resetPairing}
          onRegenerate={handleRegenerate}
        />
      </div>
    );
  }

  // 디스플레이 정보 입력 폼 (기본)
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <DisplayInfoForm
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        onSubmit={handleStartPairing}
        loading={context.state === 'input' || context.state === 'generating'}
        error={context.error}
      />
    </div>
  );
}
