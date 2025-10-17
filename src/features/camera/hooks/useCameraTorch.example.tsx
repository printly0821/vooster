/**
 * useCameraTorch Hook - Usage Examples
 *
 * Demonstrates how to use the camera torch (flashlight) control hook
 * in various scenarios with proper error handling.
 */

'use client';

import React from 'react';
import { useCameraTorch } from './useCameraTorch';

/**
 * Example 1: Basic torch toggle button
 */
export function BasicTorchToggle({ stream }: { stream: MediaStream | null }) {
  const { torchCapability, toggleTorch, error } = useCameraTorch(stream);

  if (!torchCapability.isSupported) {
    return null; // Hide button if torch not supported
  }

  return (
    <button
      onClick={async () => {
        try {
          await toggleTorch();
        } catch (err) {
          console.error('Failed to toggle torch:', err);
        }
      }}
      className="torch-button"
    >
      {torchCapability.isEnabled ? '🔦 Turn Off Flash' : '💡 Turn On Flash'}
      {error && <span className="error">{error.message}</span>}
    </button>
  );
}

/**
 * Example 2: Separate on/off buttons
 */
export function SeparateTorchControls({ stream }: { stream: MediaStream | null }) {
  const { torchCapability, enableTorch, disableTorch } = useCameraTorch(stream);

  if (!torchCapability.isSupported) {
    return <p>Torch not supported on this device</p>;
  }

  return (
    <div className="torch-controls">
      <button
        onClick={() => enableTorch()}
        disabled={torchCapability.isEnabled}
        className="torch-on-button"
      >
        Turn On Flash
      </button>
      <button
        onClick={() => disableTorch()}
        disabled={!torchCapability.isEnabled}
        className="torch-off-button"
      >
        Turn Off Flash
      </button>
    </div>
  );
}

/**
 * Example 3: Toggle with loading state
 */
export function TorchToggleWithLoading({ stream }: { stream: MediaStream | null }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { torchCapability, toggleTorch, error } = useCameraTorch(stream);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await toggleTorch();
    } catch (err) {
      console.error('Torch toggle failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!torchCapability.isSupported) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`torch-button ${torchCapability.isEnabled ? 'active' : ''}`}
    >
      {isLoading ? (
        'Toggling...'
      ) : (
        <>
          {torchCapability.isEnabled ? '🔦' : '💡'}
          <span>Flash {torchCapability.isEnabled ? 'ON' : 'OFF'}</span>
        </>
      )}
      {error && <span className="error-badge">!</span>}
    </button>
  );
}

/**
 * Example 4: Torch with error handling and retry
 */
export function TorchWithErrorHandling({ stream }: { stream: MediaStream | null }) {
  const { torchCapability, toggleTorch, error, checkTorchSupport } =
    useCameraTorch(stream);

  const handleToggleWithRetry = async () => {
    try {
      await toggleTorch();
    } catch (err) {
      // Retry once after checking support again
      console.warn('First attempt failed, retrying...');
      checkTorchSupport();

      setTimeout(async () => {
        try {
          await toggleTorch();
        } catch (retryErr) {
          console.error('Retry failed:', retryErr);
        }
      }, 500);
    }
  };

  if (!torchCapability.isSupported) {
    return (
      <div className="torch-unsupported">
        <p>Flashlight not available on this device</p>
        <button onClick={checkTorchSupport} className="retry-button">
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="torch-with-errors">
      <button onClick={handleToggleWithRetry} className="torch-toggle">
        {torchCapability.isEnabled ? 'Disable' : 'Enable'} Torch
      </button>
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error.message}
          <button onClick={checkTorchSupport}>Retry</button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Torch as part of camera controls
 */
export function CameraControlPanel({ stream }: { stream: MediaStream | null }) {
  const { torchCapability, toggleTorch } = useCameraTorch(stream);
  const [autoTorch, setAutoTorch] = React.useState(false);

  // Auto-enable torch in low light (example)
  React.useEffect(() => {
    if (autoTorch && torchCapability.isSupported && !torchCapability.isEnabled) {
      toggleTorch().catch(console.error);
    }
  }, [autoTorch, torchCapability, toggleTorch]);

  return (
    <div className="camera-controls">
      <div className="control-row">
        <label>
          <input
            type="checkbox"
            checked={autoTorch}
            onChange={(e) => setAutoTorch(e.target.checked)}
          />
          Auto Flash
        </label>
      </div>

      {torchCapability.isSupported && (
        <button
          onClick={() => toggleTorch()}
          className={`control-button ${torchCapability.isEnabled ? 'active' : ''}`}
        >
          <span className="icon">{torchCapability.isEnabled ? '🔦' : '💡'}</span>
          <span className="label">Flash</span>
        </button>
      )}
    </div>
  );
}

/**
 * Example 6: Torch state indicator
 */
export function TorchIndicator({ stream }: { stream: MediaStream | null }) {
  const { torchCapability } = useCameraTorch(stream);

  if (!torchCapability.isSupported) {
    return null;
  }

  return (
    <div className={`torch-indicator ${torchCapability.isEnabled ? 'on' : 'off'}`}>
      <div className="indicator-light" />
      <span className="indicator-text">
        Flash: {torchCapability.isEnabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
