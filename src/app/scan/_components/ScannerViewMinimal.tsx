'use client';

import * as React from 'react';
import {
  CameraErrorBanner,
  CameraPermissionPrompt,
  BarcodeScanner,
  useCameraState,
  useCameraActions,
  useCameraVideoRef,
  type BarcodeResult,
} from '@/features/camera';
import { SafeAreaGuide } from './SafeAreaGuide';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { useLastUsedCamera } from '../_hooks/useLastUsedCamera';
import { ScannerSettings } from '../_types/settings';
import { cn } from '@/lib/utils';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

interface ScannerViewMinimalProps {
  onBarcodeDetected: (result: BarcodeResult) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenInfo: () => void;
  settings: ScannerSettings;
  scanStatus: ScanStatus;
}

/**
 * 미니멀 바코드 스캐너 뷰
 * - Safe Area 가이드선 기반
 * - 상단/하단 미니멀 UI
 * - 전체 화면 스캔 가능 영역
 */
export function ScannerViewMinimal({
  onBarcodeDetected,
  onOpenSettings,
  onOpenHistory,
  onOpenInfo,
  settings,
  scanStatus,
}: ScannerViewMinimalProps) {
  return (
    <ScannerFullscreenMinimal
      onBarcodeDetected={onBarcodeDetected}
      onOpenSettings={onOpenSettings}
      onOpenHistory={onOpenHistory}
      onOpenInfo={onOpenInfo}
      settings={settings}
      scanStatus={scanStatus}
    />
  );
}

/**
 * 전체 화면 미니멀 스캐너
 */
function ScannerFullscreenMinimal({
  onBarcodeDetected,
  onOpenSettings,
  onOpenHistory,
  onOpenInfo,
  settings,
  scanStatus,
}: Omit<ScannerViewMinimalProps, 'onBarcodeDetected'> & {
  onBarcodeDetected: (result: BarcodeResult) => void;
}) {
  const {
    permissionState,
    selectedDevice,
    isStreamActive,
    stream,
    devices,
  } = useCameraState();
  const { startStream, stopStream, selectDevice } = useCameraActions();
  const { lastCameraId, rememberCamera } = useLastUsedCamera();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { setVideoElement } = useCameraVideoRef();
  const hasAutoStartedRef = React.useRef(false);

  // 줌 상태
  const [zoom, setZoom] = React.useState(1.0);

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

  // 자동 시작 로직: 권한이 승인되면 자동으로 카메라 시작
  React.useEffect(() => {
    if (!rememberCamera || hasAutoStartedRef.current) return;
    if (permissionState !== 'granted' || devices.length === 0) return;
    if (isStreamActive || selectedDevice) return;

    const autoStart = async () => {
      try {
        // 1. 마지막 사용 카메라가 있으면 그 카메라 선택
        if (lastCameraId && devices.some(d => d.deviceId === lastCameraId)) {
          await selectDevice(lastCameraId);
        } else {
          // 2. 후면 카메라 또는 첫 번째 카메라 선택
          const backCamera = devices.find(d =>
            d.label?.toLowerCase().includes('back') ||
            d.label?.toLowerCase().includes('rear') ||
            d.facingMode === 'environment'
          );
          if (backCamera) {
            await selectDevice(backCamera.deviceId);
          } else if (devices.length > 0 && devices[0]) {
            await selectDevice(devices[0].deviceId);
          }
        }

        // 3. 스트림 시작
        await startStream();
        hasAutoStartedRef.current = true;
        console.log('✅ 카메라 자동 시작 완료');
      } catch (error) {
        console.error('❌ 카메라 자동 시작 실패:', error);
      }
    };

    autoStart();
  }, [permissionState, devices, rememberCamera, lastCameraId, isStreamActive, selectedDevice, selectDevice, startStream]);

  // Cleanup on unmount
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
        <TopBar
          onOpenSettings={onOpenSettings}
          onOpenHistory={onOpenHistory}
          onOpenInfo={onOpenInfo}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* 경고 배너 (상단) */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <CameraErrorBanner showRetryButton showCloseButton />
      </div>

      {/* Layer 1: 전체 화면 카메라 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!isStreamActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
          <div className="text-center space-y-4">
            <p className="text-lg">카메라 미리보기</p>
            {selectedDevice && (
              <button
                onClick={() => startStream()}
                className="px-8 py-4 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-all active:scale-95 shadow-lg"
              >
                📸 스캔 시작하기
              </button>
            )}
          </div>
        </div>
      )}

      {/* Layer 2: Safe Area 가이드선 */}
      <SafeAreaGuide status={scanStatus} />

      {/* Layer 3: BarcodeScanner (보이지 않는 스캔 레이어) */}
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
            showScanGuide={false}
            showTorchToggle={false}
            showFocusButton={false}
          />
        </div>
      )}

      {/* Layer 4: 상단 UI (TopBar) */}
      <TopBar
        onOpenSettings={onOpenSettings}
        onOpenHistory={onOpenHistory}
        onOpenInfo={onOpenInfo}
      />

      {/* Layer 5: 하단 UI (BottomBar) */}
      <BottomBar
        zoom={zoom}
        onZoomChange={setZoom}
        flashMode={settings.flashMode}
        scanStatus={scanStatus}
      />

      {/* 스캔 성공/실패 피드백 (전체 화면 플래시) */}
      {(scanStatus === 'success' || scanStatus === 'error') && (
        <div
          className={cn(
            'absolute inset-0 pointer-events-none z-30',
            'animate-pulse',
            scanStatus === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
          )}
          style={{
            animation: `pulse 300ms ease-out`,
          }}
        />
      )}
    </div>
  );
}
