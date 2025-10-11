'use client';

import * as React from 'react';
import { Camera } from 'lucide-react';

import {
  CameraProvider,
  CameraErrorBanner,
  CameraPermissionPrompt,
  CameraDeviceSelector,
  CameraStatusBadge,
  InsecureContextWarning,
  BarcodeScanner,
  useCameraState,
  useCameraActions,
  useCameraVideoRef,
  type BarcodeResult,
} from '../index';

/**
 * Barcode Scanner Example
 *
 * Demonstrates barcode scanning functionality with camera integration
 */
export function BarcodeScannerExample() {
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
              <h1 className="text-3xl font-bold">바코드 스캐너</h1>
              <p className="text-muted-foreground">
                1D/2D 바코드 실시간 인식 (10개 포맷 지원)
              </p>
            </div>
            <CameraStatusBadge />
          </div>

          {/* Insecure context warning (shows only on HTTP) */}
          <InsecureContextWarning showPWAPrompt />

          {/* Error banner (shows when error occurs) */}
          <CameraErrorBanner showRetryButton showCloseButton />

          {/* Main barcode scanner flow */}
          <BarcodeScannerFlow />
        </div>
      </div>
    </CameraProvider>
  );
}

/**
 * Barcode scanner flow component
 */
function BarcodeScannerFlow() {
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

  // Scan results history
  const [scanHistory, setScanHistory] = React.useState<BarcodeResult[]>([]);

  // Register video element with CameraProvider
  React.useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  // Debug: Monitor stream changes
  React.useEffect(() => {
    console.log('📡 Stream changed:', {
      hasStream: !!stream,
      streamId: stream?.id,
      streamActive: stream?.active,
      tracks: stream?.getTracks().length,
    });
  }, [stream]);

  // Connect stream to video element
  React.useEffect(() => {
    if (!stream || !videoRef.current) {
      return;
    }

    // Check if already connected by comparing stream IDs (more reliable than object reference)
    const currentStream = videoRef.current.srcObject as MediaStream | null;
    if (currentStream && currentStream.id === stream.id) {
      console.log('✅ Video already connected to this stream (ID match)');
      return;
    }

    console.log('📹 Connecting stream to video element...', stream.id);

    const video = videoRef.current;
    video.srcObject = stream;

    // Auto-play video (only if not already playing)
    if (video.paused) {
      video.play()
        .then(() => {
          console.log('✅ Video playing successfully');
        })
        .catch((err) => {
          // Ignore AbortError (happens when video is being reloaded)
          if (err.name !== 'AbortError') {
            console.error('❌ Failed to play video:', err);
          }
        });
    } else {
      console.log('✅ Video already playing');
    }
  }, [stream]);

  // Handle barcode detection
  const handleBarcodeDetected = React.useCallback((result: BarcodeResult) => {
    console.log('🔍 Barcode detected:', result);

    // Add to history
    setScanHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10

    // Optional: Navigate to order page
    // router.push(`/order/${result.text}`);
  }, []);

  // Start scanning
  const handleStartScanning = React.useCallback(async () => {
    try {
      console.log('🎬 Starting camera...');

      // Start camera stream - BarcodeScanner component will auto-start scanning
      const newStream = await startStream();
      console.log('📹 Stream started:', newStream?.id);
      console.log('✅ Camera ready for barcode scanning');
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
    }
  }, [startStream]);

  // Stop scanning
  const handleStopScanning = React.useCallback(() => {
    console.log('⏹️ Stopping camera...');
    // BarcodeScanner component will auto-stop when stream ends
    stopStream();
  }, [stopStream]);

  // Cleanup on unmount
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
      <div className="space-y-4">
        <CameraPermissionPrompt
          title="📸 카메라 권한 필요"
          description="바코드를 스캔하려면 카메라 접근 권한이 필요합니다."
          showBrowserInstructions
        />
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
        {!selectedDevice && (
          <p className="text-sm text-muted-foreground">
            📹 카메라를 선택하면 바코드 스캔을 시작할 수 있습니다.
          </p>
        )}
      </div>

      {/* Camera preview with barcode scanner overlay */}
      {selectedDevice ? (
        <div className="space-y-4">
          {/* Video preview with scanner overlay */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Video element - Always rendered */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Placeholder when stream is not active */}
            {!isStreamActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <p>카메라 미리보기</p>
              </div>
            )}

            {/* Barcode Scanner Overlay - Always rendered to prevent unmount/mount cycles */}
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
                showTorchToggle
                showFocusButton
                showScanGuide
              />
            </div>
          </div>

          {/* Scanner controls */}
          <div className="flex gap-2">
            {!isStreamActive ? (
              <button
                onClick={handleStartScanning}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                📸 스캔 시작
              </button>
            ) : (
              <button
                onClick={handleStopScanning}
                className="px-6 py-3 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors font-medium"
              >
                ⏹️ 스캔 중지
              </button>
            )}
          </div>

          {/* Scanner status */}
          {barcodeScanner && (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">스캐너 상태</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    barcodeScanner.isScanning
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {barcodeScanner.isScanning ? '스캔 중' : '대기 중'}
                </span>
              </div>

              {barcodeScanner.lastResult && (
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">최근 스캔:</span>
                    <code className="px-2 py-1 bg-muted rounded font-mono text-xs">
                      {barcodeScanner.lastResult.text}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">포맷:</span>
                    <span className="text-xs">{barcodeScanner.lastResult.format}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan history */}
          {scanHistory.length > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">스캔 내역</h3>
                <button
                  onClick={() => setScanHistory([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  전체 삭제
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scanHistory.map((result, index) => (
                  <div
                    key={`${result.timestamp}-${index}`}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <code className="font-mono text-sm break-all">
                        {result.text}
                      </code>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{result.format}</span>
                        <span>
                          {new Date(result.timestamp).toLocaleTimeString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.text);
                        console.log('📋 Copied to clipboard:', result.text);
                      }}
                      className="ml-3 px-3 py-1 text-xs bg-background rounded hover:bg-background/80 transition-colors"
                    >
                      복사
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supported formats info */}
          <details className="rounded-lg border bg-card p-4">
            <summary className="text-sm font-medium cursor-pointer">
              지원되는 바코드 포맷 (10종)
            </summary>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {[
                'QR_CODE',
                'CODE_128',
                'CODE_39',
                'EAN_13',
                'EAN_8',
                'UPC_A',
                'UPC_E',
                'DATA_MATRIX',
                'ITF',
                'CODABAR',
              ].map((format) => (
                <div
                  key={format}
                  className="px-2 py-1 bg-muted rounded text-center"
                >
                  {format}
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">카메라 디바이스를 선택해주세요</h3>
          <p className="text-sm text-muted-foreground">
            위에서 카메라를 선택하시면 바코드 스캔을 시작할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Minimal barcode scanner example
 */
export function MinimalBarcodeScannerExample() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { setVideoElement } = useCameraVideoRef();
  const { startBarcodeScanning } = useCameraActions();

  React.useEffect(() => {
    if (videoRef.current) {
      setVideoElement(videoRef.current);
    }
  }, [setVideoElement]);

  const handleScan = React.useCallback((result: BarcodeResult) => {
    console.log('Scanned:', result.text);
    alert(`스캔 완료: ${result.text}`);
  }, []);

  return (
    <CameraProvider>
      <div className="space-y-4 p-4">
        <InsecureContextWarning />
        <CameraErrorBanner />
        <CameraPermissionPrompt />
        <CameraDeviceSelector />

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full"
          />
          <BarcodeScanner
            stream={null}
            videoElement={videoRef.current}
            onScan={handleScan}
          />
        </div>

        <button
          onClick={() =>
            startBarcodeScanning({
              onDetected: handleScan,
            })
          }
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          스캔 시작
        </button>
      </div>
    </CameraProvider>
  );
}
