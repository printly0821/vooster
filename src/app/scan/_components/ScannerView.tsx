/**
 * ScannerView Component
 *
 * 바코드 스캔 전용 화면 (전체 화면)
 * - 카메라 실시간 영상 (75% 높이)
 * - 카메라 컨트롤 영역 (25% 높이)
 * - 헤더: 설정, 히스토리 아이콘
 * - 최근 스캔 표시
 */

'use client';

import * as React from 'react';
import { Settings, History } from 'lucide-react';
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
import { ScannerSettings } from '../_types/settings';

type ScanStatus = 'idle' | 'waiting' | 'success' | 'error';

interface ScannerViewProps {
  /** 바코드 감지 핸들러 */
  onBarcodeDetected: (result: BarcodeResult) => void;
  /** 설정 모달 열기 */
  onOpenSettings: () => void;
  /** 히스토리 드로어 열기 */
  onOpenHistory: () => void;
  /** 스캔 내역 (최근 3개 표시) */
  scanHistory: BarcodeResult[];
  /** 스캐너 설정 */
  settings: ScannerSettings;
  /** 연속 스캔 모드 */
  continuousScanMode: boolean;
  /** 스캔 상태 */
  scanStatus: ScanStatus;
  /** 마지막 스캔 시간 */
  lastScanTime: number;
  /** 연속 스캔 중지 */
  onStopContinuousScan: () => void;
}

export function ScannerView({
  onBarcodeDetected,
  onOpenSettings,
  onOpenHistory,
  scanHistory,
  settings,
  continuousScanMode,
  scanStatus,
  lastScanTime,
  onStopContinuousScan,
}: ScannerViewProps) {
  return (
    <CameraProvider options={{ autoRequest: false }}>
      <div className="flex flex-col h-screen bg-background">
        {/* 헤더 */}
        <Header
          onOpenSettings={onOpenSettings}
          onOpenHistory={onOpenHistory}
          continuousScanMode={continuousScanMode}
          scanStatus={scanStatus}
          onStopContinuousScan={onStopContinuousScan}
        />

        {/* 메인 스캐너 영역 */}
        <ScannerMain
          onBarcodeDetected={onBarcodeDetected}
          scanHistory={scanHistory}
          settings={settings}
          continuousScanMode={continuousScanMode}
          scanStatus={scanStatus}
          lastScanTime={lastScanTime}
        />
      </div>
    </CameraProvider>
  );
}

/**
 * 헤더 컴포넌트
 */
function Header({
  onOpenSettings,
  onOpenHistory,
  continuousScanMode,
  scanStatus,
  onStopContinuousScan,
}: {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  onStopContinuousScan: () => void;
}) {
  const getStatusBadge = () => {
    if (!continuousScanMode) return null;

    const statusConfig = {
      idle: { icon: '⚪', text: '준비 완료', color: 'bg-muted text-muted-foreground' },
      waiting: { icon: '🔵', text: '대기중', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
      success: { icon: '🟢', text: '스캔 완료!', color: 'bg-accent/20 text-accent' },
      error: { icon: '🔴', text: '형식 오류', color: 'bg-destructive/20 text-destructive' },
    };

    const config = statusConfig[scanStatus];

    return (
      <span className={`text-xs px-2 py-1 rounded font-semibold ${config.color}`}>
        {config.icon} {config.text}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
      {/* 좌측: 설정 */}
      <button
        onClick={onOpenSettings}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="설정"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* 중앙: 타이틀 & 상태 */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          {continuousScanMode ? '🔄' : '📸'} 바코드 스캐너
        </h1>
        {getStatusBadge()}
      </div>

      {/* 우측: 히스토리 & 테마 & 중지 */}
      <div className="flex items-center gap-2">
        {continuousScanMode && (
          <button
            onClick={onStopContinuousScan}
            className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
          >
            중지
          </button>
        )}
        <button
          onClick={onOpenHistory}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="히스토리"
        >
          <History className="w-5 h-5" />
        </button>
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}

/**
 * 메인 스캐너 영역
 */
function ScannerMain({
  onBarcodeDetected,
  scanHistory,
  settings,
  continuousScanMode,
  scanStatus,
  lastScanTime,
}: {
  onBarcodeDetected: (result: BarcodeResult) => void;
  scanHistory: BarcodeResult[];
  settings: ScannerSettings;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  lastScanTime: number;
}) {
  const {
    permissionState,
    selectedDevice,
    isStreamActive,
    stream,
  } = useCameraState();
  const { startStream, stopStream } = useCameraActions();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { setVideoElement } = useCameraVideoRef();

  // 타임아웃 카운트다운
  const [remainingTime, setRemainingTime] = React.useState(settings.timeoutSeconds);

  // Register video element
  React.useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  // Connect stream to video element
  React.useEffect(() => {
    if (!stream || !videoRef.current) return;

    const currentStream = videoRef.current.srcObject as MediaStream | null;
    if (currentStream && currentStream.id === stream.id) return;

    const video = videoRef.current;
    video.srcObject = stream;

    const playWithRetry = async (maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (video.paused) await video.play();
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
          }
        }
      }
    };

    playWithRetry().catch(console.error);
  }, [stream]);

  // 타임아웃 카운트다운
  React.useEffect(() => {
    if (!continuousScanMode || lastScanTime === 0) return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - lastScanTime) / 1000;
      const remaining = Math.max(0, Math.ceil(settings.timeoutSeconds - elapsed));
      setRemainingTime(remaining);

      if (remaining === 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [continuousScanMode, lastScanTime, settings.timeoutSeconds]);

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
      if (isStreamActive) stopStream();
    };
  }, [isStreamActive, stopStream]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 경고 배너 */}
      <div className="flex-shrink-0">
        <InsecureContextWarning showPWAPrompt />
        <CameraErrorBanner showRetryButton showCloseButton />
      </div>

      {/* 카메라 영상 영역 (75%) */}
      <div className="flex-1 bg-black relative flex items-center justify-center">
        {permissionState !== 'granted' ? (
          <CameraPermissionPrompt
            title="📸 카메라 권한 필요"
            description="바코드를 스캔하려면 카메라 접근 권한이 필요합니다."
            showBrowserInstructions
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {!isStreamActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <p className="text-lg">카메라 미리보기</p>
              </div>
            )}

            {/* 스캔 가이드 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/60 rounded-lg w-4/5 h-1/3 relative">
                <div className="absolute inset-0 border-2 border-accent rounded-lg animate-pulse" />
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                  바코드를 여기에 맞춰주세요
                </div>
              </div>
            </div>

            {/* Barcode Scanner Overlay */}
            {stream && videoRef.current && (
              <div className="absolute inset-0 pointer-events-none">
                <BarcodeScanner
                  stream={stream}
                  videoElement={videoRef.current}
                  config={{
                    cooldownMs: settings.cooldownMs,
                    onDetected: handleBarcodeDetected,
                    onError: (error) => console.error('❌ Barcode scan error:', error),
                  }}
                />
              </div>
            )}

            {/* 타임아웃 카운트다운 (10초 이하) */}
            {continuousScanMode && remainingTime <= 10 && remainingTime > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                자동 중지: {remainingTime}초
              </div>
            )}
          </>
        )}
      </div>

      {/* 카메라 컨트롤 영역 (25%) */}
      <div className="flex-shrink-0 bg-background border-t p-4 space-y-4" style={{ minHeight: '25vh' }}>
        {/* 카메라 디바이스 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">카메라 선택</label>
          <CameraDeviceSelector
            rememberDevice={settings.rememberLastCamera}
            onDeviceSelect={(deviceId) => console.log('Selected device:', deviceId)}
          />
        </div>

        {/* 스캔 시작/중지 버튼 */}
        {selectedDevice && (
          <div className="flex gap-2">
            {!isStreamActive ? (
              <button
                onClick={handleStartScanning}
                className="flex-1 px-6 py-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-lg"
              >
                📸 스캔 시작하기
              </button>
            ) : (
              <button
                onClick={handleStopScanning}
                className="flex-1 px-6 py-4 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors font-medium text-lg"
              >
                ⏹️ 스캔 중지
              </button>
            )}
          </div>
        )}

        {/* 최근 스캔 내역 */}
        {scanHistory.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">최근 스캔</label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {scanHistory.slice(0, 3).map((result, index) => (
                <button
                  key={`${result.timestamp}-${index}`}
                  className="flex-shrink-0 px-3 py-1.5 rounded bg-muted hover:bg-muted/80 transition-colors text-xs font-mono"
                  onClick={() => {
                    // 히스토리에서 선택 시 제작의뢰서로 즉시 전환하도록 부모에서 처리
                  }}
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
