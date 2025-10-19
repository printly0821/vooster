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
  isPaused?: boolean;
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
  isPaused,
}: ScannerViewMinimalProps) {
  return (
    <ScannerFullscreenMinimal
      onBarcodeDetected={onBarcodeDetected}
      onOpenSettings={onOpenSettings}
      onOpenHistory={onOpenHistory}
      onOpenInfo={onOpenInfo}
      settings={settings}
      scanStatus={scanStatus}
      isPaused={isPaused}
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
  isPaused,
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

    // Performance fix: Clean up previous stream explicitly
    if (currentStream) {
      console.log('🧹 이전 스트림 정리');
      currentStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('⚠️ 트랙 정지 중 에러:', err);
        }
      });
    }

    const video = videoRef.current;

    // IIFE to handle async operations in useEffect
    (async () => {
      // Phase 6 Fix: Validate stream tracks before assignment
      const tracks = stream.getTracks();
      const activeTracks = tracks.filter(t => t.readyState === 'live');

      console.log('🎥 Stream 검증:', {
        streamId: stream.id,
        totalTracks: tracks.length,
        activeTracks: activeTracks.length,
        trackDetails: tracks.map(t => ({
          kind: t.kind,
          label: t.label,
          readyState: t.readyState,
          enabled: t.enabled,
          muted: t.muted,
        })),
      });

      // Critical check: Stream must have active tracks
      if (activeTracks.length === 0) {
        console.error('❌ Stream에 active track이 없음 - 카메라가 이미 정지됨');
        console.error('📋 전체 track 상태:', tracks.map(t => ({
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
        })));
        return;
      }

      if (tracks.length === 0) {
        console.error('❌ Stream에 track이 전혀 없음 - 유효하지 않은 stream');
        return;
      }

      console.log('✅ Stream 검증 통과 - active tracks 있음');

      // Phase 6 Fix: Verify video element is in DOM
      if (!document.body.contains(video)) {
        console.error('❌ Video element가 DOM에 없음 - srcObject 할당 불가능');
        return;
      }
      console.log('✅ Video element DOM 검증 통과');

      video.srcObject = stream;
      console.log('📺 video.srcObject 할당 완료');

      // Phase 6 Fix: Wait for loadedmetadata event explicitly
      // This ensures video dimensions and duration are available before play
      try {
        await new Promise<void>((resolve, reject) => {
          const metadataTimeout = setTimeout(() => {
            console.error('❌ loadedmetadata 이벤트 타임아웃 (3초)');
            reject(new Error('loadedmetadata event timeout after 3 seconds'));
          }, 3000);

          const handleLoadedMetadata = () => {
            clearTimeout(metadataTimeout);
            console.log('✅ loadedmetadata 이벤트 발생:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
              readyStateName: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState],
              duration: video.duration,
            });
            resolve();
          };

          // Check if already loaded
          if (video.readyState >= video.HAVE_METADATA) {
            console.log('✅ Video metadata 이미 로드됨 (즉시 진행)');
            clearTimeout(metadataTimeout);
            resolve();
            return;
          }

          video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
          console.log('⏳ loadedmetadata 이벤트 대기 중...');
        });

        console.log('✅ Video metadata 준비 완료');
      } catch (metadataError) {
        console.error('❌ Video metadata 로드 실패:', metadataError);
        console.error('📊 최종 video 상태:', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          srcObject: !!video.srcObject,
          networkState: video.networkState,
        });
        return; // Abort video setup
      }

      const playWithRetry = async (maxRetries = 5) => {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (video.paused) {
              console.log(`▶️ Video play 시도 ${attempt}/${maxRetries}`, {
                readyState: video.readyState,
                paused: video.paused,
                srcObject: !!video.srcObject,
              });
              await video.play();
              console.log('✅ Video play 성공');
              return;
            }
            console.log('✅ Video 이미 재생 중');
            return;
          } catch (err) {
            lastError = err as Error;
            console.warn(`⚠️ Play 시도 ${attempt}/${maxRetries} 실패:`, {
              name: lastError.name,
              message: lastError.message,
              readyState: video.readyState,
              paused: video.paused,
            });

            // AbortError는 정상적인 중단
            if (lastError.name === 'AbortError') {
              console.log('⏹️ Play 중단 (정상)');
              return;
            }

            // NotSupportedError는 재시도 불가능
            if (lastError.name === 'NotSupportedError') {
              console.error('❌ 브라우저가 video play를 지원하지 않음');
              throw lastError;
            }

            // NotAllowedError, 기타 에러 → 재시도
            if (attempt < maxRetries) {
              const delay = Math.min(1000, attempt * 300);
              console.log(`⏳ ${delay}ms 후 재시도...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        // 최종 실패
        console.error('❌ Video play 최종 실패 (모든 재시도 소진):', {
          error: lastError?.message,
          readyState: video.readyState,
          paused: video.paused,
          networkState: video.networkState,
          srcObject: !!video.srcObject,
        });

        throw lastError || new Error('Video play failed after all retries');
      };

      playWithRetry().catch(err => {
        console.error('❌ Video play 처리 실패:', err);
      });
    })();

    // Performance fix: Cleanup on unmount or stream change
    return () => {
      console.log('🧹 Video element cleanup (stream 변경 또는 unmount)');
      if (video.srcObject) {
        const oldStream = video.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.warn('⚠️ 정리 중 트랙 정지 에러:', err);
          }
        });
        video.srcObject = null;
      }
    };
  }, [stream]);

  // 줌 적용
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.transform = `scale(${zoom})`;
    }
  }, [zoom]);

  // Phase 9 Fix: Stabilize onBarcodeDetected with ref pattern to prevent BarcodeScanner remount
  const onBarcodeDetectedRef = React.useRef(onBarcodeDetected);

  // Keep ref updated with latest callback
  React.useEffect(() => {
    onBarcodeDetectedRef.current = onBarcodeDetected;
  }, [onBarcodeDetected]);

  // Handle barcode detection - now stable (no dependency changes)
  const handleBarcodeDetected = React.useCallback((result: BarcodeResult) => {
    console.log('🔍 Barcode detected:', result);
    onBarcodeDetectedRef.current(result);
  }, []); // Empty deps - never recreated

  // Phase 8 Fix: Memoize barcode scanner callbacks to prevent BarcodeScanner remount
  const handleBarcodeScanError = React.useCallback((error: any) => {
    console.error('❌ Barcode scan error:', error);
  }, []);

  // Phase 8 Fix: Memoize config to prevent BarcodeScanner remount
  const barcodeScannerConfig = React.useMemo(() => ({
    cooldownMs: settings.cooldownMs,
    onDetected: handleBarcodeDetected,
    onError: handleBarcodeScanError,
  }), [settings.cooldownMs, handleBarcodeDetected, handleBarcodeScanError]);

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
            config={barcodeScannerConfig}
            paused={isPaused}
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
