'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { BarcodeSection } from './_components/BarcodeSection';
import { JobOrderSection } from './_components/JobOrderSection';
import { isValidOrderNumber, logBarcodeValidation } from './_utils/validation';

type BarcodeResult = {
  text: string;
  format: string;
  timestamp: number;
};

type ScanStatus = 'idle' | 'waiting' | 'success' | 'error';

export default function ScanPage() {
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [isScannerCollapsed, setIsScannerCollapsed] = useState(false);
  const [scanHistory, setScanHistory] = useState<BarcodeResult[]>([]);
  const jobOrderRef = useRef<HTMLDivElement>(null);

  // 연속 스캔 모드 상태
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 바코드 스캔 감지 핸들러
   * - 형식 검증 (주문번호 형식 확인)
   * - 중복 방지 (쿨다운)
   * - 연속 스캔 모드 자동 활성화
   * - 제작의뢰서 표시
   */
  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    const barcode = result.text.trim();

    // 1단계: 주문번호 형식 검증
    if (!isValidOrderNumber(barcode)) {
      logBarcodeValidation(barcode, false);
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 2000);
      return; // 무시
    }

    logBarcodeValidation(barcode, true);

    // 2단계: 중복 방지 (1.5초 쿨다운)
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

    // 쿨다운 시작
    setScanCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setScanCooldown(false);
    }, 1500);

    // 스캔 내역 업데이트 (중복 제거)
    setScanHistory((prev) => {
      const filtered = prev.filter((r) => r.text !== barcode);
      return [result, ...filtered.slice(0, 4)]; // 최근 5개, 중복 제거
    });

    // 첫 스캔 시 연속 모드 활성화
    if (!continuousScanMode) {
      console.log('🔄 연속 스캔 모드 활성화');
      setContinuousScanMode(true);
      setIsScannerCollapsed(false); // 펼쳐진 상태 유지
    } else {
      setIsScannerCollapsed(false); // 항상 펼쳐진 상태 유지
    }

    // 바코드 설정 및 API 호출
    setScannedBarcode(barcode);

    // 제작의뢰서 영역으로 스크롤 (약간의 지연 후)
    setTimeout(() => {
      if (jobOrderRef.current) {
        jobOrderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // 상태 복구 (3초 후)
    setTimeout(() => {
      setScanStatus('idle');
    }, 3000);
  }, [continuousScanMode, lastScannedBarcode, scanCooldown]);

  /**
   * 스캔 내역에서 바코드 선택
   */
  const handleSelectFromHistory = useCallback((barcode: string) => {
    setScannedBarcode(barcode);

    setTimeout(() => {
      if (jobOrderRef.current) {
        jobOrderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  /**
   * 스캐너 펼치기 및 스캔 준비
   * - 연속 스캔 모드 활성화
   * - 스캐너 펼쳐짐
   * - 타임아웃 리셋
   */
  const handleOpenScanner = useCallback(() => {
    setContinuousScanMode(true);
    setIsScannerCollapsed(false);
    setLastScanTime(Date.now()); // 타임아웃 타이머 리셋
    setScanStatus('waiting');
  }, []);

  /**
   * 연속 스캔 모드 중지
   */
  const handleStopContinuousScan = useCallback(() => {
    setContinuousScanMode(false);
    setIsScannerCollapsed(true);
    setScanStatus('idle');
  }, []);

  /**
   * 자동 타임아웃: 30초 미사용 시 연속 모드 해제
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
      const timeoutDuration = 30000; // 30초

      if (elapsed > timeoutDuration) {
        console.log('⏰ 타임아웃: 30초 미사용으로 연속 스캔 모드 해제');
        setContinuousScanMode(false);
        setIsScannerCollapsed(true);
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
  }, [continuousScanMode, lastScanTime]);

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
    <div className="min-h-screen bg-background scroll-smooth">
      {/* 바코드 스캐너 섹션 */}
      <BarcodeSection
        isCollapsed={isScannerCollapsed}
        onBarcodeDetected={handleBarcodeDetected}
        onToggleCollapse={() => setIsScannerCollapsed(!isScannerCollapsed)}
        scanHistory={scanHistory}
        onSelectFromHistory={handleSelectFromHistory}
        continuousScanMode={continuousScanMode}
        scanStatus={scanStatus}
        lastScanTime={lastScanTime}
        onOpenScanner={handleOpenScanner}
        onStopContinuousScan={handleStopContinuousScan}
      />

      {/* 제작의뢰서 섹션 */}
      <div ref={jobOrderRef} className="scroll-mt-8 transition-all duration-300 ease-out">
        {scannedBarcode ? (
          <JobOrderSection
            barcode={scannedBarcode}
            onOpenScanner={handleOpenScanner}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px] md:min-h-[600px] bg-gradient-to-br from-muted/10 to-muted/20 m-4 md:m-8 rounded-lg border border-dashed border-muted-foreground/20">
            <div className="text-center space-y-4">
              <div className="text-5xl">📸</div>
              <p className="text-lg md:text-xl text-muted-foreground font-medium">
                바코드를 스캔하면 제작의뢰서가 여기 표시됩니다
              </p>
              <p className="text-sm text-muted-foreground/70">
                위의 스캐너에서 카메라를 선택하고 바코드를 스캔해주세요
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
