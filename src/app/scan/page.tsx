'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { CameraProvider } from '@/features/camera';
import { isValidOrderNumber, logBarcodeValidation } from './_utils/validation';
import { ScannerViewMinimal } from './_components/ScannerViewMinimal';
import { SettingsDrawer } from './_components/SettingsDrawer';
import { HistoryDrawer } from './_components/HistoryDrawer';
import { useScannerSettings } from './_hooks/useScannerSettings';
import { useScanHistory } from './_hooks/useScanHistory';
import { ViewMode } from './_types/settings';

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
  // 뷰 모드 상태 (스캔 화면 ↔ 제작의뢰서 화면)
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // 스캔 상태 (간단함)
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  // 설정 모달 & 히스토리 드로어 상태
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Hooks
  const { settings, updateSetting } = useScannerSettings();
  const { addToHistory } = useScanHistory();

  // Performance fix: Track pending timers for cleanup (prevent memory leaks)
  const pendingTimersRef = React.useRef<NodeJS.Timeout[]>([]);

  /**
   * 바코드 스캔 감지 핸들러 (단순화)
   * - 형식 검증
   * - 히스토리 추가
   * - 제작의뢰서 화면으로 전환
   */
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    const barcode = result.text.trim();

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

    // 0.3초 후 제작의뢰서 화면으로 전환
    // Performance fix: Track timer for cleanup
    const transitionTimer = setTimeout(() => {
      setScannedBarcode(barcode);
      setViewMode('report');
      setScanStatus('idle');
    }, 300);
    pendingTimersRef.current.push(transitionTimer);
  }, [settings.vibrationEnabled, addToHistory]);

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

  return (
    <CameraProvider options={{ autoRequest: true }}>
      <div className="min-h-screen bg-background">
        <AnimatePresence mode="wait">
          {viewMode === 'scanner' ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-screen"
            >
              <ScannerViewMinimal
                onBarcodeDetected={handleBarcodeDetected}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenHistory={() => setHistoryOpen(true)}
                onOpenInfo={() => setInfoOpen(true)}
                settings={settings}
                scanStatus={scanStatus}
              />
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-screen"
            >
              {scannedBarcode && (
                <ReportView
                  barcode={scannedBarcode}
                  onBackToScanner={handleBackToScanner}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
      </div>
    </CameraProvider>
  );
}
