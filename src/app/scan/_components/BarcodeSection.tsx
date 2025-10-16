'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  CameraProvider,
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  InsecureContextWarning,
  BarcodeScanner,
  useCameraState,
  useCameraActions,
  useCameraVideoRef,
  type BarcodeResult,
} from '@/features/camera';

type ScanStatus = 'idle' | 'waiting' | 'success' | 'error';

interface BarcodeSectionProps {
  isCollapsed: boolean;
  onBarcodeDetected: (result: BarcodeResult) => void;
  onToggleCollapse: () => void;
  scanHistory: BarcodeResult[];
  onSelectFromHistory: (barcode: string) => void;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  lastScanTime: number;
  onOpenScanner: () => void;
  onStopContinuousScan: () => void;
}

export function BarcodeSection({
  isCollapsed,
  onBarcodeDetected,
  onToggleCollapse,
  scanHistory,
  onSelectFromHistory,
  continuousScanMode,
  scanStatus,
  lastScanTime,
  onOpenScanner,
  onStopContinuousScan,
}: BarcodeSectionProps) {
  return (
    <CameraProvider options={{ autoRequest: false }}>
      {isCollapsed ? (
        <CollapsedScanner
          onToggleCollapse={onToggleCollapse}
          scanHistory={scanHistory}
          onSelectFromHistory={onSelectFromHistory}
          continuousScanMode={continuousScanMode}
          scanStatus={scanStatus}
          onOpenScanner={onOpenScanner}
        />
      ) : (
        <ExpandedScanner
          onToggleCollapse={onToggleCollapse}
          onBarcodeDetected={onBarcodeDetected}
          continuousScanMode={continuousScanMode}
          scanStatus={scanStatus}
          lastScanTime={lastScanTime}
          onStopContinuousScan={onStopContinuousScan}
        />
      )}
    </CameraProvider>
  );
}

/**
 * 접힌 상태의 스캐너
 */
function CollapsedScanner({
  onToggleCollapse,
  scanHistory,
  onSelectFromHistory,
  continuousScanMode,
  scanStatus,
  onOpenScanner,
}: {
  onToggleCollapse: () => void;
  scanHistory: BarcodeResult[];
  onSelectFromHistory: (barcode: string) => void;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  onOpenScanner: () => void;
}) {
  // 스캔 상태 표시
  const getStatusIcon = () => {
    switch (scanStatus) {
      case 'waiting':
        return '🔵';
      case 'success':
        return '🟢';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (scanStatus) {
      case 'waiting':
        return '다음 스캔 대기중';
      case 'success':
        return '스캔 완료!';
      case 'error':
        return '스캔 실패';
      default:
        return '대기 중';
    }
  };
  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 md:p-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              {continuousScanMode ? '🔄' : '📸'} 바코드 스캐너
              {continuousScanMode && (
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  scanStatus === 'success' ? 'bg-accent/20 text-accent dark:bg-accent/30 dark:text-accent' :
                  scanStatus === 'error' ? 'bg-destructive/20 text-destructive dark:bg-destructive/30 dark:text-destructive' :
                  'bg-blue-500/20 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {getStatusIcon()} {getStatusText()}
                </span>
              )}
            </h2>
            {scanHistory.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                최근: <code className="font-mono bg-muted px-2 py-1 rounded text-xs">
                  {scanHistory[0].text}
                </code>
              </p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            {continuousScanMode && (
              <button
                onClick={onOpenScanner}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                📸 스캔 준비
              </button>
            )}
            <ThemeToggle size="sm" className="hover:bg-muted dark:hover:bg-muted" />
            <button
              onClick={onToggleCollapse}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80 transition-colors text-sm font-medium"
            >
              펼치기
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 최근 스캔 내역 (3개) */}
        {scanHistory.length > 0 && (
          <div className="border-t px-4 md:px-6 py-3">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {scanHistory.slice(0, 3).map((result, index) => (
                <button
                  key={`${result.timestamp}-${index}`}
                  onClick={() => onSelectFromHistory(result.text)}
                  className="flex-shrink-0 px-3 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm font-mono truncate"
                  title={result.text}
                >
                  {result.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 펼쳐진 상태의 스캐너
 */
function ExpandedScanner({
  onToggleCollapse,
  onBarcodeDetected,
  continuousScanMode,
  scanStatus,
  lastScanTime,
  onStopContinuousScan,
}: {
  onToggleCollapse: () => void;
  onBarcodeDetected: (result: BarcodeResult) => void;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  lastScanTime: number;
  onStopContinuousScan: () => void;
}) {
  // 타임아웃 카운트다운 (30초)
  const [remainingTime, setRemainingTime] = React.useState(30);

  React.useEffect(() => {
    if (!continuousScanMode || lastScanTime === 0) {
      return;
    }

    const timer = setInterval(() => {
      const elapsed = (Date.now() - lastScanTime) / 1000;
      const remaining = Math.max(0, Math.ceil(30 - elapsed));
      setRemainingTime(remaining);

      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [continuousScanMode, lastScanTime]);
  return (
    <div className="bg-background border-b sticky top-0 z-40">
      <div className="max-w-4xl mx-auto p-3 md:p-4">
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {continuousScanMode ? '🔄 연속 스캔 모드' : '📸 바코드 스캐너'}
              </h1>
              {continuousScanMode && (
                <div className="mt-1 space-y-1">
                  <p className={`text-xs font-semibold ${
                    scanStatus === 'success' ? 'text-accent dark:text-accent' :
                    scanStatus === 'error' ? 'text-destructive dark:text-destructive' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {scanStatus === 'waiting' && '🔵 다음 스캔 대기중'}
                    {scanStatus === 'success' && '🟢 스캔 완료!'}
                    {scanStatus === 'error' && '🔴 형식 오류'}
                    {scanStatus === 'idle' && '⚪ 준비 완료'}
                  </p>
                  {remainingTime <= 10 && remainingTime > 0 && (
                    <p className="text-xs text-muted-foreground">
                      자동 중지: {remainingTime}초
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {continuousScanMode && (
                <button
                  onClick={onStopContinuousScan}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:bg-destructive/80 transition-colors text-sm font-medium h-10"
                >
                  중지
                </button>
              )}
              <ThemeToggle size="sm" />
              <button
                onClick={onToggleCollapse}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-muted hover:bg-muted/80 dark:hover:bg-muted/60 transition-colors h-10"
              >
                접기
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 경고 및 에러 배너 */}
          <InsecureContextWarning showPWAPrompt />
          <CameraErrorBanner showRetryButton showCloseButton />

          {/* 메인 스캐너 영역 */}
          <BarcodeScannerFlow
            onBarcodeDetected={onBarcodeDetected}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 바코드 스캐너 플로우 컴포넌트
 */
function BarcodeScannerFlow({
  onBarcodeDetected,
}: {
  onBarcodeDetected: (result: BarcodeResult) => void;
}) {
  const {
    permissionState,
    selectedDevice,
    isStreamActive,
    stream,
    barcodeScanner,
  } = useCameraState();
  const { startStream, stopStream } = useCameraActions();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { setVideoElement } = useCameraVideoRef();

  // Register video element
  React.useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  // Connect stream to video element
  React.useEffect(() => {
    if (!stream || !videoRef.current) {
      return;
    }

    const currentStream = videoRef.current.srcObject as MediaStream | null;
    if (currentStream && currentStream.id === stream.id) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = stream;

    const playWithRetry = async (maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (video.paused) {
            await video.play();
          }
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
          }
        }
      }
    };

    playWithRetry().catch(console.error);
  }, [stream]);

  // Handle barcode detection
  const handleBarcodeDetected = React.useCallback((result: BarcodeResult) => {
    console.log('🔍 Barcode detected:', result);
    onBarcodeDetected(result);
  }, [onBarcodeDetected]);

  // Start scanning
  const handleStartScanning = React.useCallback(async () => {
    try {
      await startStream();
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
    }
  }, [startStream]);

  // Stop scanning
  const handleStopScanning = React.useCallback(() => {
    stopStream();
  }, [stopStream]);

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (isStreamActive) {
        stopStream();
      }
    };
  }, [isStreamActive, stopStream]);

  // Show permission prompt if not granted
  if (permissionState !== 'granted') {
    return (
      <CameraPermissionPrompt
        title="📸 카메라 권한 필요"
        description="바코드를 스캔하려면 카메라 접근 권한이 필요합니다."
        showBrowserInstructions
      />
    );
  }

  // Show device selector
  return (
    <div className="space-y-6">
      {/* Device selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">카메라 선택</label>
        <CameraDeviceSelector
          rememberDevice
          onDeviceSelect={(deviceId) =>
            console.log('Selected device:', deviceId)
          }
        />
        {!selectedDevice && (
          <p className="text-sm text-muted-foreground">
            📹 카메라를 선택하면 바코드 스캔을 시작할 수 있습니다.
          </p>
        )}
      </div>

      {/* Camera preview */}
      {selectedDevice ? (
        <div className="space-y-3">
          {/* Video preview with scanner overlay */}
          <div className="relative aspect-square max-h-[400px] mx-auto bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!isStreamActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <p>카메라 미리보기</p>
              </div>
            )}

            {/* Barcode Scanner Overlay */}
            <div className="absolute inset-0">
              <BarcodeScanner
                stream={stream}
                videoElement={videoRef.current}
                config={{
                  cooldownMs: 1500,
                  onDetected: handleBarcodeDetected,
                  onError: (error) => {
                    console.error('❌ Barcode scan error:', error);
                  },
                }}
              />
            </div>
          </div>

          {/* Scanner controls */}
          <div className="flex gap-2 w-full">
            {!isStreamActive ? (
              <button
                onClick={handleStartScanning}
                className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium min-h-12"
              >
                📸 스캔 시작
              </button>
            ) : (
              <button
                onClick={handleStopScanning}
                className="flex-1 px-6 py-4 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors font-medium min-h-12"
              >
                ⏹️ 스캔 중지
              </button>
            )}
          </div>

        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-medium mb-2">카메라 디바이스를 선택해주세요</h3>
          <p className="text-sm text-muted-foreground">
            위에서 카메라를 선택하시면 바코드 스캔을 시작할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
