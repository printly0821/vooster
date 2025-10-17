/**
 * Basic camera usage example
 *
 * Demonstrates the simplest way to use the camera feature
 */

'use client';

import { useEffect, useRef } from 'react';
import { useCamera, useCameraReady, useCameraError } from '../hooks';

/**
 * Basic barcode scanner component
 *
 * Shows minimal implementation with camera preview
 */
export function BasicCameraUsage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    permissionState,
    selectedDevice,
    stream,
    requestPermission,
    startStream,
    stopStream,
  } = useCamera();

  const isReady = useCameraReady();
  const { error, retry } = useCameraError();

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-request permission and start stream
  useEffect(() => {
    if (permissionState === 'prompt') {
      requestPermission();
    }
  }, [permissionState, requestPermission]);

  useEffect(() => {
    if (isReady && !stream) {
      startStream();
    }
  }, [isReady, stream, startStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Error state
  if (error) {
    return (
      <div className="camera-error">
        <h2>Camera Error</h2>
        <p>{error.userMessage}</p>
        <ul>
          {error.recoverySuggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
        {error.isRetryable && <button onClick={retry}>Retry</button>}
      </div>
    );
  }

  // Loading state
  if (permissionState !== 'granted') {
    return (
      <div className="camera-loading">
        <p>Requesting camera permission...</p>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className="camera-loading">
        <p>Detecting cameras...</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="camera-loading">
        <p>Starting camera...</p>
      </div>
    );
  }

  // Active camera preview
  return (
    <div className="camera-preview">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          maxWidth: '640px',
          height: 'auto',
          borderRadius: '8px',
        }}
      />
      <div className="camera-controls">
        <button onClick={stopStream}>Stop Camera</button>
        <p>
          Using: {selectedDevice.label || 'Camera ' + selectedDevice.deviceId}
        </p>
      </div>
    </div>
  );
}
