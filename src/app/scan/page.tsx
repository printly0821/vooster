'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CameraProvider } from '@/features/camera';
import { isValidOrderNumber, logBarcodeValidation } from './_utils/validation';
import { ScannerViewMinimal } from './_components/ScannerViewMinimal';
import { SettingsDrawer } from './_components/SettingsDrawer';
import { HistoryDrawer } from './_components/HistoryDrawer';
import { DisplaysDrawer } from './_components/DisplaysDrawer';
import { PairingConfirmModal } from './_components/PairingConfirmModal';
import { useScannerSettings } from './_hooks/useScannerSettings';
import { useScanHistory } from './_hooks/useScanHistory';
import { useScanOrderSocket } from './_hooks/useScanOrderSocket';
import { usePairing } from './_hooks/usePairing';
import { usePairedDisplay } from './_hooks/usePairedDisplay';
import { ViewMode } from './_types/settings';
import { cn } from '@/lib/utils';

// Dynamic import ReportView for code splitting (lazy load only on demand)
// Performance: Reduces first load JS by ~20-30KB, speeds up initial scan page load
const ReportView = dynamic(
  () => import('./_components/ReportView').then(m => ({ default: m.ReportView })),
  {
    loading: () => (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <p>제작의뢰서 로딩 중...</p>
      </div>
    ),
    ssr: false,
  }
);

type BarcodeResult = {
  text: string;
  format: string;
  timestamp: number;
};

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export default function ScanPage() {
  // 라우팅
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPairingMode = searchParams.get('mode') === 'pairing';

  // 뷰 모드 상태 (스캔 화면 ↔ 제작의뢰서 화면)
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // 스캔 상태 (간단함)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  // 설정 모달 & 히스토리 드로어 & 디스플레이 드로어 상태
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [displayDrawerOpen, setDisplayDrawerOpen] = useState(false);

  // 페어링 모달 상태
  const [pairingModalData, setPairingModalData] = useState<null | {
    sessionId: string;
    code: string;
    displayName: string;
    purpose: string;
    orgId?: string;
    lineId?: string;
  }>(null);

  // Hooks
  const { settings, updateSetting } = useScannerSettings();
  const { addToHistory } = useScanHistory();
  const { approve: approvePairing, isLoading: isPairingLoading } = usePairing();
  const { save: savePairing } = usePairedDisplay();

  // Socket.IO 연결 활성화 여부 (환경변수로 제어)
  const isSocketEnabled = !!process.env.NEXT_PUBLIC_SOCKET_IO_TOKEN;

  const { isConnected: isSocketConnected, sendScanOrder, error: socketError } = useScanOrderSocket({
    enabled: isSocketEnabled,
  });

  // Performance fix: Track pending timers for cleanup (prevent memory leaks)
  const pendingTimersRef = React.useRef<NodeJS.Timeout[]>([]);

  /**
   * 바코드 스캔 감지 핸들러 (페어링 모드 포함)
   * - 페어링 모드: QR 코드 파싱 → 승인 모달 표시
   * - 일반 모드: 형식 검증 → 히스토리 추가 → Socket.IO 전송 → 제작의뢰서 화면 전환
   */
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    const barcode = result.text.trim();

    // 페어링 모드: QR 코드 처리
    if (isPairingMode) {
      try {
        const qrData = JSON.parse(barcode);
        const { sessionId, code, displayName, purpose, orgId, lineId } = qrData;

        // 기본 검증
        if (!sessionId || !code || !displayName) {
          throw new Error('유효하지 않은 QR 코드 형식입니다');
        }

        // 승인 확인 모달 표시
        setPairingModalData({
          sessionId,
          code,
          displayName: displayName || '알 수 없음',
          purpose: purpose || '용도 미지정',
          orgId,
          lineId,
        });

        console.log('✅ QR 코드 파싱 성공:', { sessionId, code });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '유효하지 않은 QR 코드입니다';
        console.error('❌ QR 코드 파싱 실패:', errorMessage);

        // 진동 피드백 (에러)
        if (navigator.vibrate) {
          navigator.vibrate([50, 100, 50]);
        }

        setScanStatus('error');
        const errorTimer = setTimeout(() => setScanStatus('idle'), 1000);
        pendingTimersRef.current.push(errorTimer);
      }
      return;
    }

    // 일반 모드: 기존 바코드 처리
    // 형식 검증
    if (!isValidOrderNumber(barcode)) {
      logBarcodeValidation(barcode, false);
      setScanStatus('error');
      // Performance fix: Track timer for cleanup
      const errorTimer = setTimeout(() => setScanStatus('idle'), 1000);
      pendingTimersRef.current.push(errorTimer);
      return;
    }

    logBarcodeValidation(barcode, true);
    console.log('✅ 유효한 바코드 처리:', barcode);

    // 스캔 성공 피드백
    setScanStatus('success');

    // 히스토리에 추가
    addToHistory({
      barcode,
      timestamp: result.timestamp,
      format: result.format,
    });

    // 진동 피드백
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(200);
    }

    // T-007: Socket.IO로 세컨드 모니터에 주문 정보 전송
    if (isSocketConnected) {
      sendScanOrder(barcode)
        .then((success) => {
          if (success) {
            console.log('✅ 세컨드 모니터로 주문 정보 전송 완료:', barcode);
          } else {
            console.warn('⚠️ 세컨드 모니터로 주문 정보 전송 실패:', barcode);
          }
        })
        .catch((err) => {
          console.error('❌ 주문 정보 전송 중 오류:', err);
        });
    } else {
      console.warn('⚠️ Socket.IO 미연결 상태');
    }

    // 0.3초 후 제작의뢰서 화면으로 전환
    // Performance fix: Track timer for cleanup
    const transitionTimer = setTimeout(() => {
      setScannedBarcode(barcode);
      setViewMode('report');
      setScanStatus('idle');
    }, 300);
    pendingTimersRef.current.push(transitionTimer);
  }, [isPairingMode, settings.vibrationEnabled, addToHistory, isSocketConnected, sendScanOrder]);

  /**
   * 스캔 화면으로 복귀
   */
  const handleBackToScanner = useCallback(() => {
    // Performance fix: Clean up pending timers
    pendingTimersRef.current.forEach(timer => clearTimeout(timer));
    pendingTimersRef.current = [];
    console.log('🧹 대기 중인 타이머 정리 완료');

    setViewMode('scanner');
    setScanStatus('idle');
  }, []);

  /**
   * 히스토리에서 바코드 선택
   */
  const handleSelectFromHistory = useCallback((barcode: string) => {
    setScannedBarcode(barcode);
    setViewMode('report');
  }, []);

  /**
   * 페어링 승인 핸들러
   */
  const handlePairingConfirm = useCallback(async () => {
    if (!pairingModalData) return;

    try {
      // QR에서 제공한 orgId, lineId 사용 (없으면 기본값)
      const orgId = pairingModalData.orgId || 'org-001';
      const lineId = pairingModalData.lineId || 'cutting';
      // deviceId는 임시로 생성 (나중에 사용자 프로필에서 가져올 수 있음)
      const deviceId = 'device-' + Date.now();

      const result = await approvePairing(
        {
          sessionId: pairingModalData.sessionId,
          code: pairingModalData.code,
        },
        deviceId,
        orgId,
        lineId
      );

      if (result) {
        // 페어링 정보 저장
        savePairing(
          result.screenId,
          result.token,
          pairingModalData.displayName
        );

        // 성공 알림 및 상태 정리
        alert('페어링 완료!');
        setPairingModalData(null);

        // 페어링 모드에서 일반 모드로 복귀
        router.push('/scan');
      } else {
        alert('페어링 실패. 다시 시도하세요.');
      }
    } catch (err) {
      console.error('❌ 페어링 에러:', err);
      alert('페어링 중 오류가 발생했습니다');
    }
  }, [pairingModalData, approvePairing, savePairing, router]);

  /**
   * QR 스캔 모드로 전환
   */
  const handleStartPairing = useCallback(() => {
    setDisplayDrawerOpen(false);
    router.push('/scan?mode=pairing');
  }, [router]);

  return (
    <CameraProvider options={{ autoRequest: true }}>
      <div className="relative min-h-screen bg-background overflow-hidden">
        {/* Phase 9 Fix: Remove AnimatePresence mode="wait" to prevent ScannerViewMinimal unmount */}
        {/* Keep ScannerViewMinimal always mounted, just hide it when viewing report */}
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300 ease-in-out",
            viewMode === 'scanner' ? 'translate-x-0' : '-translate-x-full'
          )}
          style={{ willChange: 'transform' }}
        >
          <ScannerViewMinimal
            onBarcodeDetected={handleBarcodeDetected}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenInfo={() => setInfoOpen(true)}
            onOpenDisplays={() => setDisplayDrawerOpen(true)}
            settings={settings}
            scanStatus={scanStatus}
            isPaused={settingsOpen || displayDrawerOpen || !!pairingModalData}
          />
        </div>

        {/* ReportView: Only mount when barcode scanned */}
        {scannedBarcode && (
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-in-out bg-background",
              viewMode === 'report' ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{ willChange: 'transform' }}
          >
            <ReportView
              barcode={scannedBarcode}
              onBackToScanner={handleBackToScanner}
            />
          </div>
        )}

        {/* 설정 드로어 */}
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSettingsChange={(newSettings) => {
            // 변경된 설정 항목 업데이트
            Object.entries(newSettings).forEach(([key, value]) => {
              updateSetting(key as keyof typeof settings, value);
            });
          }}
        />

        {/* 히스토리 드로어 */}
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelectBarcode={handleSelectFromHistory}
        />

        {/* 디스플레이 관리 드로어 */}
        <DisplaysDrawer
          open={displayDrawerOpen}
          onClose={() => setDisplayDrawerOpen(false)}
          onStartPairing={handleStartPairing}
        />

        {/* 페어링 승인 확인 모달 */}
        {pairingModalData && (
          <PairingConfirmModal
            displayName={pairingModalData.displayName}
            purpose={pairingModalData.purpose}
            onConfirm={handlePairingConfirm}
            onCancel={() => setPairingModalData(null)}
            isLoading={isPairingLoading}
          />
        )}
      </div>
    </CameraProvider>
  );
}
