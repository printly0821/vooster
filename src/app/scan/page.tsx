'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidOrderNumber, logBarcodeValidation } from './_utils/validation';
import { ScannerView } from './_components/ScannerView';
import { ReportView } from './_components/ReportView';
import { useScannerSettings } from './_hooks/useScannerSettings';
import { useScanHistory } from './_hooks/useScanHistory';
import { ViewMode } from './_types/settings';

type BarcodeResult = {
  text: string;
  format: string;
  timestamp: number;
};

type ScanStatus = 'idle' | 'waiting' | 'success' | 'error';

export default function ScanPage() {
  // 뷰 모드 상태 (스캔 화면 ↔ 제작의뢰서 화면)
  const [viewMode, setViewMode] = useState<ViewMode>('scanner');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // 스캔 관련 상태
  const [scanHistory, setScanHistory] = useState<BarcodeResult[]>([]);
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 설정 모달 & 히스토리 드로어 상태
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Hooks
  const { settings, saveSettings } = useScannerSettings();
  const { history, addToHistory } = useScanHistory();

  /**
   * 바코드 스캔 감지 핸들러
   * - 형식 검증 (주문번호 형식 확인)
   * - 중복 방지 (쿨다운)
   * - 제작의뢰서 화면으로 전환 (뷰 전환)
   * - 히스토리에 추가
   */
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    const barcode = result.text.trim();

    // 1단계: 주문번호 형식 검증
    if (!isValidOrderNumber(barcode)) {
      logBarcodeValidation(barcode, false);
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 2000);
      return;
    }

    logBarcodeValidation(barcode, true);

    // 2단계: 중복 방지 (설정값 쿨다운)
    if (barcode === lastScannedBarcode && scanCooldown) {
      console.log(`⏸️ 중복 스캔 무시 (쿨다운 중): ${barcode}`);
      return;
    }

    // 3단계: 새로운 바코드 처리
    console.log('✅ 유효한 바코드 처리:', barcode);

    // 스캔 상태 업데이트
    setLastScannedBarcode(barcode);
    setScanStatus('success');
    setLastScanTime(Date.now());

    // 쿨다운 시작 (설정값 사용)
    setScanCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setScanCooldown(false);
    }, settings.cooldownMs);

    // 스캔 내역 업데이트
    setScanHistory((prev) => {
      const filtered = prev.filter((r) => r.text !== barcode);
      return [result, ...filtered.slice(0, 4)];
    });

    // 히스토리에 추가 (LocalStorage)
    addToHistory({
      barcode,
      timestamp: result.timestamp,
      format: result.format,
    });

    // 첫 스캔 시 연속 모드 활성화
    if (!continuousScanMode) {
      console.log('🔄 연속 스캔 모드 활성화');
      setContinuousScanMode(true);
    }

    // 바코드 설정 및 뷰 전환
    setScannedBarcode(barcode);
    setViewMode('report'); // ✨ 제작의뢰서 화면으로 전환

    // 진동 피드백
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(200);
    }

    // 상태 복구 (3초 후)
    setTimeout(() => {
      setScanStatus('idle');
    }, 3000);
  }, [continuousScanMode, lastScannedBarcode, scanCooldown, settings.cooldownMs, settings.vibrationEnabled, addToHistory]);

  /**
   * 스캔 화면으로 복귀 (제작의뢰서 → 스캔)
   */
  const handleBackToScanner = useCallback(() => {
    setViewMode('scanner'); // ✨ 스캔 화면으로 전환
    setContinuousScanMode(true);
    setLastScanTime(Date.now());
    setScanStatus('waiting');
  }, []);

  /**
   * 연속 스캔 모드 중지
   */
  const handleStopContinuousScan = useCallback(() => {
    setContinuousScanMode(false);
    setScanStatus('idle');
  }, []);

  /**
   * 자동 타임아웃: 설정된 시간 미사용 시 연속 모드 해제
   */
  useEffect(() => {
    if (!continuousScanMode || lastScanTime === 0) {
      return;
    }

    if (timeoutTimerRef.current) {
      clearInterval(timeoutTimerRef.current);
    }

    timeoutTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastScanTime;
      const timeoutDuration = settings.timeoutSeconds * 1000; // 설정값 사용

      if (elapsed > timeoutDuration) {
        console.log(`⏰ 타임아웃: ${settings.timeoutSeconds}초 미사용으로 연속 스캔 모드 해제`);
        setContinuousScanMode(false);
        setScanStatus('idle');
        if (timeoutTimerRef.current) {
          clearInterval(timeoutTimerRef.current);
        }
      }
    }, 1000); // 1초마다 확인

    return () => {
      if (timeoutTimerRef.current) {
        clearInterval(timeoutTimerRef.current);
      }
    };
  }, [continuousScanMode, lastScanTime, settings.timeoutSeconds]);

  /**
   * 정리 작업
   */
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      if (timeoutTimerRef.current) {
        clearInterval(timeoutTimerRef.current);
      }
    };
  }, []);

  return (
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
            <ScannerView
              onBarcodeDetected={handleBarcodeDetected}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenHistory={() => setHistoryOpen(true)}
              scanHistory={scanHistory}
              settings={settings}
              continuousScanMode={continuousScanMode}
              scanStatus={scanStatus}
              lastScanTime={lastScanTime}
              onStopContinuousScan={handleStopContinuousScan}
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

      {/* TODO: 설정 모달 (Phase 4) */}
      {/* TODO: 히스토리 드로어 (Phase 5) */}
    </div>
  );
}
