'use client';

import * as React from 'react';

import {
  CameraProvider,
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  CameraStatusIndicator,
  CameraStatusBadge,
  InsecureContextWarning,
  useCameraState,
  useCameraActions,
} from '../index';

/**
 * Complete Camera UI Example
 *
 * Demonstrates all camera UI components working together
 */
export function CameraUIExample() {
  return (
    <CameraProvider
      options={{
        autoRequest: false,
      }}
    >
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">카메라 UI 컴포넌트</h1>
              <p className="text-muted-foreground">
                모든 카메라 UI 컴포넌트 예제
              </p>
            </div>
            <CameraStatusBadge />
          </div>

          {/* Insecure context warning (shows only on HTTP) */}
          <InsecureContextWarning showPWAPrompt />

          {/* Error banner (shows when error occurs) */}
          <CameraErrorBanner
            showRetryButton
            showCloseButton
            onDismiss={() => console.log('Error dismissed')}
            onRetry={() => console.log('Retrying...')}
          />

          {/* Main camera setup flow */}
          <CameraSetupFlow />
        </div>
      </div>
    </CameraProvider>
  );
}

/**
 * Camera setup flow component
 */
function CameraSetupFlow() {
  const { permissionState, selectedDevice, isStreamActive, stream, error } = useCameraState();
  const { startStream, stopStream } = useCameraActions();
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('🎥 Camera State:', {
      permissionState,
      selectedDevice: selectedDevice?.label,
      isStreamActive,
      hasStream: !!stream,
      hasError: !!error,
      errorMessage: error?.userMessage,
    });
  }, [permissionState, selectedDevice, isStreamActive, stream, error]);

  // Auto-connect stream to video when stream becomes available
  React.useEffect(() => {
    if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
      console.log('📹 Connecting stream to video element');
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Show permission prompt if not granted
  if (permissionState !== 'granted') {
    return (
      <div className="space-y-4">
        <CameraPermissionPrompt
          showBrowserInstructions
          onPermissionGranted={() => console.log('Permission granted!')}
          onPermissionRequest={() => console.log('Permission requested')}
        />

        {/* Status indicator */}
        <div className="flex justify-center">
          <CameraStatusIndicator showText size="md" animate />
        </div>
      </div>
    );
  }

  // Show device selector when permission granted
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
      </div>

      {/* Status indicator */}
      <CameraStatusIndicator showText size="md" animate />

      {/* Camera controls */}
      {selectedDevice && (
        <div className="space-y-4">
          {/* Video preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
          </div>

          {/* Stream controls */}
          <div className="flex gap-2">
            {!isStreamActive ? (
              <button
                onClick={async () => {
                  console.log('▶️ Start button clicked');
                  try {
                    console.log('🎬 Calling startStream...');
                    const stream = await startStream();
                    console.log('✅ startStream returned:', stream);

                    if (videoRef.current && stream) {
                      videoRef.current.srcObject = stream;
                      console.log('📺 Video element srcObject set');
                    } else {
                      console.warn('⚠️ Missing video element or stream', {
                        hasVideoRef: !!videoRef.current,
                        hasStream: !!stream,
                      });
                    }
                  } catch (error) {
                    console.error('❌ Failed to start camera:', error);
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                카메라 시작
              </button>
            ) : (
              <button
                onClick={() => {
                  console.log('⏹️ Stop button clicked');
                  stopStream();
                  if (videoRef.current) {
                    videoRef.current.srcObject = null;
                    console.log('📺 Video element srcObject cleared');
                  }
                }}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                카메라 중지
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal camera example
 */
export function MinimalCameraExample() {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  return (
    <CameraProvider>
      <div className="space-y-4 p-4">
        {/* Status */}
        <CameraStatusIndicator showText />

        {/* Warnings and errors */}
        <InsecureContextWarning />
        <CameraErrorBanner />

        {/* Permission prompt */}
        <CameraPermissionPrompt />

        {/* Device selector */}
        <CameraDeviceSelector />

        {/* Video preview */}
        <CameraVideoPreview videoRef={videoRef as React.RefObject<HTMLVideoElement>} />
      </div>
    </CameraProvider>
  );
}

/**
 * Video preview component
 */
function CameraVideoPreview({
  videoRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const { isStreamActive } = useCameraState();
  const { startStream, stopStream } = useCameraActions();

  React.useEffect(() => {
    if (isStreamActive) {
      startStream().then((stream) => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }
      });
    } else {
      stopStream();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isStreamActive, startStream, stopStream, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full aspect-video bg-black rounded-lg"
    />
  );
}

/**
 * Custom styled example
 */
export function CustomStyledCameraExample() {
  return (
    <CameraProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Custom header */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">스캐너 준비</h2>
              <CameraStatusBadge dotOnly />
            </div>

            <InsecureContextWarning className="border-2" />

            <CameraErrorBanner
              className="shadow-md"
              showRetryButton
            />

            <CameraPermissionPrompt
              title="📸 카메라를 활성화하세요"
              description="QR 코드와 바코드를 스캔하려면 카메라 권한이 필요합니다."
              buttonText="카메라 켜기"
            />

            <CameraDeviceSelector
              placeholder="사용할 카메라를 선택하세요"
              className="bg-gray-50 dark:bg-gray-800"
            />

            <div className="flex justify-center pt-4">
              <CameraStatusIndicator
                showText
                size="lg"
                animate
              />
            </div>
          </div>
        </div>
      </div>
    </CameraProvider>
  );
}

/**
 * Status indicator variants example
 */
export function StatusIndicatorExample() {
  return (
    <CameraProvider>
      <div className="p-8 space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Status Indicator Sizes</h3>
          <div className="flex flex-wrap gap-4">
            <CameraStatusIndicator size="sm" showText />
            <CameraStatusIndicator size="md" showText />
            <CameraStatusIndicator size="lg" showText />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Status Badges</h3>
          <div className="flex flex-wrap gap-4">
            <CameraStatusBadge />
            <CameraStatusBadge dotOnly />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Without Text</h3>
          <div className="flex flex-wrap gap-4">
            <CameraStatusIndicator showText={false} size="sm" />
            <CameraStatusIndicator showText={false} size="md" />
            <CameraStatusIndicator showText={false} size="lg" />
          </div>
        </div>
      </div>
    </CameraProvider>
  );
}
