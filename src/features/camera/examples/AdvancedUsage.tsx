/**
 * Advanced camera usage example
 *
 * Demonstrates device selection, error handling, and manual controls
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useCamera,
  useCameraState,
  useCameraActions,
  useCameraError,
} from '../hooks';
import { getCameraDisplayName } from '../lib';

/**
 * Advanced camera component with device selector and manual controls
 */
export function AdvancedCameraUsage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isManualMode, setIsManualMode] = useState(false);

  // Separate state and actions for optimized re-renders
  const {
    permissionState,
    devices,
    selectedDevice,
    stream,
    isStreamActive,
    isCheckingPermission,
    isEnumeratingDevices,
  } = useCameraState();

  const {
    requestPermission,
    enumerateDevices,
    selectDevice,
    startStream,
    stopStream,
  } = useCameraActions();

  const { error, hasError, isRetryable, clearError, retry } = useCameraError();

  // Attach stream to video
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-start flow (unless manual mode)
  useEffect(() => {
    if (!isManualMode) {
      if (permissionState === 'prompt') {
        requestPermission();
      }
    }
  }, [permissionState, requestPermission, isManualMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Manual control handlers
  const handleRequestPermission = async () => {
    const state = await requestPermission();
    if (state === 'granted') {
      await enumerateDevices();
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    await selectDevice(deviceId);
    if (isStreamActive) {
      // Restart stream with new device
      stopStream();
      setTimeout(() => startStream(), 100);
    }
  };

  const handleStartCamera = async () => {
    try {
      await startStream();
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  };

  // Error display
  if (hasError) {
    return (
      <div className="camera-error-panel">
        <h2>Camera Error</h2>
        <div className="error-details">
          <p className="error-message">{error!.userMessage}</p>
          <p className="error-technical">Code: {error!.code}</p>
          <p className="error-severity">Severity: {error!.severity}</p>
        </div>

        <div className="recovery-suggestions">
          <h3>How to fix:</h3>
          <ul>
            {error!.recoverySuggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>

        <div className="error-actions">
          {isRetryable && <button onClick={retry}>Retry</button>}
          <button onClick={clearError}>Dismiss</button>
        </div>
      </div>
    );
  }

  // Permission required
  if (permissionState !== 'granted') {
    return (
      <div className="permission-panel">
        <h2>Camera Permission Required</h2>
        <p>This app needs camera access to scan barcodes.</p>

        <div className="permission-status">
          <p>
            Status: <strong>{permissionState}</strong>
          </p>
        </div>

        {permissionState === 'denied' && (
          <div className="denied-info">
            <p>Camera access was denied.</p>
            <p>Please check your browser settings to enable camera access.</p>
          </div>
        )}

        <button
          onClick={handleRequestPermission}
          disabled={isCheckingPermission}
        >
          {isCheckingPermission ? 'Checking...' : 'Request Camera Access'}
        </button>
      </div>
    );
  }

  // Device selection
  if (!selectedDevice || isEnumeratingDevices) {
    return (
      <div className="device-selection-panel">
        <h2>Select Camera</h2>
        {isEnumeratingDevices ? (
          <p>Detecting cameras...</p>
        ) : devices.length === 0 ? (
          <p>No cameras detected. Please connect a camera and try again.</p>
        ) : (
          <>
            <p>{devices.length} camera(s) detected</p>
            <button onClick={enumerateDevices}>Refresh Cameras</button>
          </>
        )}
      </div>
    );
  }

  // Active camera controls
  return (
    <div className="advanced-camera-panel">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: '800px',
            height: 'auto',
            borderRadius: '8px',
            backgroundColor: '#000',
          }}
        />
      </div>

      <div className="camera-controls">
        {/* Device Selector */}
        <div className="device-selector">
          <label htmlFor="camera-select">Camera:</label>
          <select
            id="camera-select"
            value={selectedDevice.deviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            disabled={devices.length <= 1}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {getCameraDisplayName(device)}
              </option>
            ))}
          </select>
        </div>

        {/* Stream Controls */}
        <div className="stream-controls">
          {isStreamActive ? (
            <button onClick={stopStream} className="stop-button">
              Stop Camera
            </button>
          ) : (
            <button onClick={handleStartCamera} className="start-button">
              Start Camera
            </button>
          )}
        </div>

        {/* Status Display */}
        <div className="status-display">
          <p>
            Status:{' '}
            <span className={isStreamActive ? 'active' : 'inactive'}>
              {isStreamActive ? 'Active' : 'Inactive'}
            </span>
          </p>
          <p>Device: {selectedDevice.label || selectedDevice.deviceId}</p>
          {selectedDevice.facingMode && (
            <p>Facing: {selectedDevice.facingMode}</p>
          )}
        </div>

        {/* Manual Mode Toggle */}
        <div className="manual-mode">
          <label>
            <input
              type="checkbox"
              checked={isManualMode}
              onChange={(e) => setIsManualMode(e.target.checked)}
            />
            Manual mode (disable auto-start)
          </label>
        </div>
      </div>

      {/* Debug Info */}
      <details className="debug-info">
        <summary>Debug Information</summary>
        <pre>
          {JSON.stringify(
            {
              permissionState,
              deviceCount: devices.length,
              selectedDeviceId: selectedDevice?.deviceId,
              isStreamActive,
              streamId: stream?.id,
              tracks: stream?.getTracks().map((t) => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
              })),
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
