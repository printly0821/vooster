/**
 * ScannerView Component (Overlay-based)
 *
 * 전체 화면 바코드 스캔 뷰 (오버레이 UI)
 * - 전체 화면 카메라
 * - 어두운 마스크 (스캔 영역 외부)
 * - 오버레이 아이콘 (설정, 히스토리, 확대/축소)
 * - 하단 플로팅 컨트롤 (플래시, 초점, 스캔)
 */

'use client';

import * as React from 'react';
import { Settings, History, ZoomIn, ZoomOut, Flashlight, Focus } from 'lucide-react';
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
  onBarcodeDetected: (result: BarcodeResult) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  scanHistory: BarcodeResult[];
  settings: ScannerSettings;
  continuousScanMode: boolean;
  scanStatus: ScanStatus;
  lastScanTime: number;
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
      <ScannerFullscreen
        onBarcodeDetected={onBarcodeDetected}
        onOpenSettings={onOpenSettings}
        onOpenHistory={onOpenHistory}
        settings={settings}
        continuousScanMode={continuousScanMode}
        scanStatus={scanStatus}
        lastScanTime={lastScanTime}
        onStopContinuousScan={onStopContinuousScan}
      />
    </CameraProvider>
  );
}

/**
 * 전체 화면 스캐너
 */
function ScannerFullscreen({
  onBarcodeDetected,
  onOpenSettings,
  onOpenHistory,
  settings,
  continuousScanMode,
  scanStatus,
  lastScanTime,
  onStopContinuousScan,
}: Omit<ScannerViewProps, 'scanHistory'>) {
  const {
    permissionState,
    selectedDevice,
    isStreamActive,
    stream,
  } = useCameraState();
  const { startStream, stopStream } = useCameraActions();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { setVideoElement } = useCameraVideoRef();

  // 확대/축소 상태
  const [zoom, setZoom] = React.useState(1.0);
  const minZoom = 1.0;
  const maxZoom = 3.0;
  const zoomStep = 0.5;

  // 플래시 상태 (TODO: useCameraTorch와 통합)
  const [flashOn, setFlashOn] = React.useState(false);

  // 자동 초점 상태
  const [autoFocus, setAutoFocus] = React.useState(settings.autoFocus);

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

  // 줌 적용
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${zoom})`;
    }
  }, [zoom]);

  // Handle barcode detection
  const handleBarcodeDetected = React.useCallback((result: BarcodeResult) => {
    console.log('🔍 Barcode detected:', result);
    onBarcodeDetected(result);
  }, [onBarcodeDetected]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + zoomStep, maxZoom));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - zoomStep, minZoom));

  // Toggle flash
  const toggleFlash = () => setFlashOn(prev => !prev);

  // Toggle auto focus
  const toggleAutoFocus = () => setAutoFocus(prev => !prev);

  // Toggle scanning
  const toggleScanning = () => {
    if (isStreamActive) {
      stopStream();
    } else {
      startStream();
    }
  };

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (isStreamActive) stopStream();
    };
  }, [isStreamActive, stopStream]);

  // 권한 없을 때
  if (permissionState !== 'granted') {
    return (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <CameraPermissionPrompt
          title="📸 카메라 권한 필요"
          description="바코드를 스캔하려면 카메라 접근 권한이 필요합니다."
          showBrowserInstructions
        />
        {/* 상단 아이콘 (권한 없어도 표시) */}
        <TopOverlay
          onOpenSettings={onOpenSettings}
          onOpenHistory={onOpenHistory}
          continuousScanMode={continuousScanMode}
          onStopContinuousScan={onStopContinuousScan}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* 경고 배너 (상단) */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <InsecureContextWarning showPWAPrompt />
        <CameraErrorBanner showRetryButton showCloseButton />
      </div>

      {/* Layer 1: 카메라 영상 (전체 화면) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!isStreamActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
          <div className="text-center space-y-4">
            <p className="text-lg">카메라 미리보기</p>
            {selectedDevice && (
              <button
                onClick={toggleScanning}
                className="px-8 py-4 bg-accent text-white rounded-full font-medium hover:bg-accent/90 transition-all active:scale-95 shadow-lg"
              >
                📸 스캔 시작하기
              </button>
            )}
            {!selectedDevice && (
              <div className="bg-black/70 p-6 rounded-lg backdrop-blur-sm max-w-sm">
                <p className="text-sm mb-4">카메라를 선택해주세요</p>
                <CameraDeviceSelector
                  rememberDevice={settings.rememberLastCamera}
                  onDeviceSelect={(deviceId) => console.log('Selected device:', deviceId)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layer 2: 어두운 오버레이 + 스캔 영역 */}
      <ScanAreaOverlay scanStatus={scanStatus} />

      {/* Layer 3: BarcodeScanner */}
      {stream && videoRef.current && (
        <div className="absolute inset-0 pointer-events-none z-20">
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

      {/* Layer 4: UI 컨트롤 */}
      <TopOverlay
        onOpenSettings={onOpenSettings}
        onOpenHistory={onOpenHistory}
        continuousScanMode={continuousScanMode}
        onStopContinuousScan={onStopContinuousScan}
      />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        minZoom={minZoom}
        maxZoom={maxZoom}
      />

      {continuousScanMode && (
        <StatusBadge
          scanStatus={scanStatus}
          remainingTime={remainingTime}
        />
      )}

      <BottomControls
        flashOn={flashOn}
        autoFocus={autoFocus}
        isScanning={isStreamActive}
        onToggleFlash={toggleFlash}
        onToggleAutoFocus={toggleAutoFocus}
        onToggleScanning={toggleScanning}
      />
    </div>
  );
}

/**
 * 어두운 마스크 + 스캔 영역
 */
function ScanAreaOverlay({ scanStatus }: { scanStatus: ScanStatus }) {
  const borderColor = scanStatus === 'success' ? 'border-green-500' :
                      scanStatus === 'error' ? 'border-red-500' :
                      'border-white/80';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className={`border-2 ${borderColor} rounded-lg transition-colors duration-300`}
        style={{
          width: '80vw',
          maxWidth: '500px',
          height: '33vh',
          maxHeight: '350px',
          minWidth: '280px',
          minHeight: '200px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* 맥박 효과 */}
        <div className="absolute inset-0 border-2 border-accent rounded-lg animate-pulse" />

        {/* 모서리 마커 */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

        {/* 안내 텍스트 */}
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm">
          <p className="text-white text-sm whitespace-nowrap">바코드를 여기에 맞춰주세요</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 상단 오버레이 (설정, 히스토리)
 */
function TopOverlay({
  onOpenSettings,
  onOpenHistory,
  continuousScanMode,
  onStopContinuousScan,
}: {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  continuousScanMode: boolean;
  onStopContinuousScan: () => void;
}) {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 12px)` }}
    >
      {/* 좌측: 설정 */}
      <button
        onClick={onOpenSettings}
        className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-all active:scale-95 shadow-lg"
        aria-label="설정"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* 우측: 히스토리 & 중지 */}
      <div className="flex items-center gap-2">
        {continuousScanMode && (
          <button
            onClick={onStopContinuousScan}
            className="px-4 py-2 rounded-full bg-destructive/90 text-destructive-foreground text-sm font-medium hover:bg-destructive backdrop-blur-sm transition-all active:scale-95 shadow-lg"
          >
            중지
          </button>
        )}
        <button
          onClick={onOpenHistory}
          className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-all active:scale-95 shadow-lg"
          aria-label="히스토리"
        >
          <History className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

/**
 * 확대/축소 컨트롤 (우측 플로팅)
 */
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom,
  maxZoom,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  minZoom: number;
  maxZoom: number;
}) {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {/* 확대 */}
      <button
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
        aria-label="확대"
      >
        <ZoomIn className="w-6 h-6" />
      </button>

      {/* 줌 레벨 표시 */}
      <div className={`px-3 py-1.5 rounded-full text-white text-xs font-semibold text-center backdrop-blur-sm shadow-lg ${
        zoom >= 2.5 ? 'bg-red-500/70' : zoom >= 1.5 ? 'bg-yellow-500/70' : 'bg-black/50'
      }`}>
        {zoom.toFixed(1)}x
      </div>

      {/* 축소 */}
      <button
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        className="p-3 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
        aria-label="축소"
      >
        <ZoomOut className="w-6 h-6" />
      </button>
    </div>
  );
}

/**
 * 상태 배지 (좌측 하단)
 */
function StatusBadge({
  scanStatus,
  remainingTime,
}: {
  scanStatus: ScanStatus;
  remainingTime: number;
}) {
  const statusConfig = {
    idle: { icon: '⚪', text: '준비 완료', color: 'bg-muted/90' },
    waiting: { icon: '🔵', text: '대기중', color: 'bg-blue-500/70' },
    success: { icon: '🟢', text: '스캔 완료!', color: 'bg-green-500/70' },
    error: { icon: '🔴', text: '형식 오류', color: 'bg-red-500/70' },
  };

  const config = statusConfig[scanStatus];

  return (
    <div
      className="absolute left-4 z-50 bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
    >
      <div className="flex items-center gap-3 text-white text-sm font-medium">
        <span className={`px-2 py-0.5 rounded-full ${config.color}`}>
          {config.icon} {config.text}
        </span>
        {remainingTime <= 10 && remainingTime > 0 && (
          <span className="text-yellow-400">⏱️ {remainingTime}초</span>
        )}
      </div>
    </div>
  );
}

/**
 * 하단 컨트롤 (플래시, 초점, 스캔)
 */
function BottomControls({
  flashOn,
  autoFocus,
  isScanning,
  onToggleFlash,
  onToggleAutoFocus,
  onToggleScanning,
}: {
  flashOn: boolean;
  autoFocus: boolean;
  isScanning: boolean;
  onToggleFlash: () => void;
  onToggleAutoFocus: () => void;
  onToggleScanning: () => void;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 16px)` }}
    >
      <div className="bg-black/50 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          {/* 플래시 */}
          <button
            onClick={onToggleFlash}
            className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/10 transition-all active:scale-95"
          >
            <Flashlight className={flashOn ? 'w-6 h-6 text-yellow-400' : 'w-6 h-6 text-white'} />
            <span className="text-white text-xs font-medium">{flashOn ? 'ON' : 'OFF'}</span>
          </button>

          {/* 자동 초점 */}
          <button
            onClick={onToggleAutoFocus}
            className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/10 transition-all active:scale-95"
          >
            <Focus className={autoFocus ? 'w-6 h-6 text-accent' : 'w-6 h-6 text-white/50'} />
            <span className="text-white text-xs font-medium">{autoFocus ? 'ON' : 'OFF'}</span>
          </button>

          {/* 스캔 시작/중지 */}
          <button
            onClick={onToggleScanning}
            className={`px-8 py-4 rounded-full font-medium text-base transition-all active:scale-95 shadow-lg ${
              isScanning
                ? 'bg-destructive/90 text-destructive-foreground hover:bg-destructive'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {isScanning ? '⏹️ 중지' : '📸 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
