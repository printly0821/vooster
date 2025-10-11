/**
 * Tests for camera error handling infrastructure
 *
 * Covers error class instantiation, error mapping, serialization,
 * type guards, and factory functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CameraError,
  CameraErrorCode,
  CameraErrorSeverity,
  CameraPermissionError,
  CameraDeviceError,
  CameraStreamError,
  mapNativeErrorToCameraError,
  createUnsupportedBrowserError,
  createInsecureContextError,
  createPermissionCheckError,
  createDeviceEnumerationError,
  createTimeoutError,
  isCameraError,
  isCameraPermissionError,
  isCameraDeviceError,
  isCameraStreamError,
} from '../errors';
import { createDOMException } from '../../__tests__/test-utils';

describe('CameraError', () => {
  it('should create a CameraError with all required properties', () => {
    const error = new CameraError({
      code: CameraErrorCode.UNKNOWN_ERROR,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'User message',
      technicalMessage: 'Technical message',
      recoverySuggestions: ['Suggestion 1', 'Suggestion 2'],
      isRetryable: true,
    });

    expect(error.name).toBe('CameraError');
    expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
    expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
    expect(error.userMessage).toBe('User message');
    expect(error.technicalMessage).toBe('Technical message');
    expect(error.recoverySuggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
    expect(error.isRetryable).toBe(true);
    expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should default isRetryable to false when not specified', () => {
    const error = new CameraError({
      code: CameraErrorCode.BROWSER_NOT_SUPPORTED,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'Not supported',
      technicalMessage: 'Browser not supported',
      recoverySuggestions: [],
    });

    expect(error.isRetryable).toBe(false);
  });

  it('should store original error when provided', () => {
    const originalError = new Error('Original error');
    const error = new CameraError({
      code: CameraErrorCode.UNKNOWN_ERROR,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'Wrapped error',
      technicalMessage: 'Technical',
      recoverySuggestions: [],
      originalError,
    });

    expect(error.originalError).toBe(originalError);
  });

  it('should serialize to JSON correctly', () => {
    const originalError = new Error('Original');
    const error = new CameraError({
      code: CameraErrorCode.PERMISSION_DENIED,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'Permission denied',
      technicalMessage: 'User denied permission',
      recoverySuggestions: ['Grant permission'],
      originalError,
      isRetryable: true,
    });

    const json = error.toJSON();

    expect(json).toMatchObject({
      name: 'CameraError',
      code: CameraErrorCode.PERMISSION_DENIED,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'Permission denied',
      technicalMessage: 'User denied permission',
      recoverySuggestions: ['Grant permission'],
      isRetryable: true,
    });
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
    expect(json.originalError).toEqual({
      name: 'Error',
      message: 'Original',
    });
  });

  it('should serialize without originalError when not present', () => {
    const error = new CameraError({
      code: CameraErrorCode.UNKNOWN_ERROR,
      severity: CameraErrorSeverity.CRITICAL,
      userMessage: 'Error',
      technicalMessage: 'Technical',
      recoverySuggestions: [],
    });

    const json = error.toJSON();
    expect(json.originalError).toBeUndefined();
  });
});

describe('CameraPermissionError', () => {
  it('should create a permission error with correct defaults', () => {
    const error = new CameraPermissionError(
      'Permission denied',
      'User denied camera access',
      ['Grant permission in settings']
    );

    expect(error.name).toBe('CameraPermissionError');
    expect(error.code).toBe(CameraErrorCode.PERMISSION_DENIED);
    expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
    expect(error.isRetryable).toBe(true);
    expect(error.userMessage).toBe('Permission denied');
    expect(error.technicalMessage).toBe('User denied camera access');
    expect(error.recoverySuggestions).toEqual(['Grant permission in settings']);
  });

  it('should store original error', () => {
    const original = new Error('Original');
    const error = new CameraPermissionError('Denied', 'Technical', [], original);

    expect(error.originalError).toBe(original);
  });
});

describe('CameraDeviceError', () => {
  it('should create a device error with correct properties', () => {
    const error = new CameraDeviceError(
      CameraErrorCode.DEVICE_NOT_FOUND,
      'Camera not found',
      'No camera available',
      ['Check connections'],
      'camera-id-123'
    );

    expect(error.name).toBe('CameraDeviceError');
    expect(error.code).toBe(CameraErrorCode.DEVICE_NOT_FOUND);
    expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
    expect(error.isRetryable).toBe(true);
    expect(error.deviceId).toBe('camera-id-123');
  });

  it('should work without deviceId', () => {
    const error = new CameraDeviceError(
      CameraErrorCode.DEVICE_NOT_READABLE,
      'Cannot read device',
      'Device in use',
      []
    );

    expect(error.deviceId).toBeUndefined();
  });
});

describe('CameraStreamError', () => {
  it('should create a stream error with constraints', () => {
    const constraints: MediaStreamConstraints = {
      video: { facingMode: 'environment' },
    };

    const error = new CameraStreamError(
      CameraErrorCode.STREAM_START_FAILED,
      'Stream failed',
      'Could not start',
      [],
      constraints
    );

    expect(error.name).toBe('CameraStreamError');
    expect(error.code).toBe(CameraErrorCode.STREAM_START_FAILED);
    expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
    expect(error.constraints).toBe(constraints);
  });
});

describe('mapNativeErrorToCameraError', () => {
  describe('DOMException mapping', () => {
    it('should map NotAllowedError to CameraPermissionError', () => {
      const domError = createDOMException('NotAllowedError', 'Permission denied');
      const error = mapNativeErrorToCameraError(domError, 'test context');

      expect(isCameraPermissionError(error)).toBe(true);
      expect(error.code).toBe(CameraErrorCode.PERMISSION_DENIED);
      expect(error.userMessage).toContain('권한이 거부');
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
      expect(error.originalError).toBe(domError);
    });

    it('should map NotFoundError to CameraDeviceError', () => {
      const domError = createDOMException('NotFoundError', 'No camera found');
      const error = mapNativeErrorToCameraError(domError);

      expect(isCameraDeviceError(error)).toBe(true);
      expect(error.code).toBe(CameraErrorCode.DEVICE_NOT_FOUND);
      expect(error.userMessage).toContain('찾을 수 없습니다');
    });

    it('should map NotReadableError to CameraDeviceError', () => {
      const domError = createDOMException('NotReadableError', 'Device in use');
      const error = mapNativeErrorToCameraError(domError);

      expect(isCameraDeviceError(error)).toBe(true);
      expect(error.code).toBe(CameraErrorCode.DEVICE_NOT_READABLE);
      expect(error.userMessage).toContain('접근할 수 없습니다');
    });

    it('should map OverconstrainedError to CameraStreamError', () => {
      const domError = createDOMException(
        'OverconstrainedError',
        'Constraints not satisfiable'
      );
      const error = mapNativeErrorToCameraError(domError);

      expect(isCameraStreamError(error)).toBe(true);
      expect(error.code).toBe(CameraErrorCode.STREAM_OVERCONSTRAINED);
      expect(error.userMessage).toContain('지원하지 않습니다');
    });

    it('should map SecurityError correctly', () => {
      const domError = createDOMException('SecurityError', 'Insecure context');
      const error = mapNativeErrorToCameraError(domError);

      expect(error.code).toBe(CameraErrorCode.INSECURE_CONTEXT);
      expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
      expect(error.isRetryable).toBe(false);
      expect(error.userMessage).toContain('HTTPS');
    });

    it('should map AbortError correctly', () => {
      const domError = createDOMException('AbortError', 'Operation aborted');
      const error = mapNativeErrorToCameraError(domError);

      expect(error.code).toBe(CameraErrorCode.STREAM_START_FAILED);
      expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
      expect(error.isRetryable).toBe(true);
    });

    it('should map TypeError correctly', () => {
      const domError = createDOMException('TypeError', 'Invalid constraints');
      const error = mapNativeErrorToCameraError(domError);

      expect(error.code).toBe(CameraErrorCode.STREAM_START_FAILED);
      expect(error.userMessage).toContain('잘못된');
    });

    it('should handle unknown DOMException names', () => {
      const domError = createDOMException('UnknownError', 'Unknown issue');
      const error = mapNativeErrorToCameraError(domError);

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
      expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
      expect(error.isRetryable).toBe(true);
    });
  });

  describe('Error mapping', () => {
    it('should map generic Error to CameraError', () => {
      const genericError = new Error('Something went wrong');
      const error = mapNativeErrorToCameraError(genericError, 'test');

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
      expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
      expect(error.originalError).toBe(genericError);
      expect(error.technicalMessage).toContain('test');
    });
  });

  describe('Unknown error types', () => {
    it('should handle string errors', () => {
      const error = mapNativeErrorToCameraError('string error', 'context');

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
      expect(error.technicalMessage).toContain('string error');
      expect(error.technicalMessage).toContain('context');
    });

    it('should handle null', () => {
      const error = mapNativeErrorToCameraError(null);

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
      expect(error.isRetryable).toBe(true);
    });

    it('should handle undefined', () => {
      const error = mapNativeErrorToCameraError(undefined);

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
    });

    it('should handle objects', () => {
      const error = mapNativeErrorToCameraError({ foo: 'bar' });

      expect(error.code).toBe(CameraErrorCode.UNKNOWN_ERROR);
    });
  });
});

describe('Factory functions', () => {
  describe('createUnsupportedBrowserError', () => {
    it('should create error with correct properties', () => {
      const error = createUnsupportedBrowserError();

      expect(error.code).toBe(CameraErrorCode.BROWSER_NOT_SUPPORTED);
      expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
      expect(error.isRetryable).toBe(false);
      expect(error.userMessage).toContain('지원하지 않습니다');
      expect(error.technicalMessage).toContain('MediaDevices API');
      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('createInsecureContextError', () => {
    it('should create error with protocol information', () => {
      const error = createInsecureContextError('http:');

      expect(error.code).toBe(CameraErrorCode.INSECURE_CONTEXT);
      expect(error.severity).toBe(CameraErrorSeverity.CRITICAL);
      expect(error.isRetryable).toBe(false);
      expect(error.technicalMessage).toContain('http:');
      expect(error.userMessage).toContain('HTTPS');
    });
  });

  describe('createPermissionCheckError', () => {
    it('should create error without original error', () => {
      const error = createPermissionCheckError();

      expect(error.code).toBe(CameraErrorCode.PERMISSION_CHECK_FAILED);
      expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
      expect(error.isRetryable).toBe(true);
      expect(error.technicalMessage).toContain('unknown');
    });

    it('should include original error message', () => {
      const original = new Error('Original message');
      const error = createPermissionCheckError(original);

      expect(error.technicalMessage).toContain('Original message');
      expect(error.originalError).toBe(original);
    });
  });

  describe('createDeviceEnumerationError', () => {
    it('should create device enumeration error', () => {
      const error = createDeviceEnumerationError();

      expect(error.code).toBe(CameraErrorCode.DEVICE_ENUMERATION_FAILED);
      expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
      expect(error.isRetryable).toBe(true);
      expect(error.userMessage).toContain('가져올 수 없습니다');
    });

    it('should include original error', () => {
      const original = new Error('Enum failed');
      const error = createDeviceEnumerationError(original);

      expect(error.technicalMessage).toContain('Enum failed');
      expect(error.originalError).toBe(original);
    });
  });

  describe('createTimeoutError', () => {
    it('should create timeout error with operation details', () => {
      const error = createTimeoutError('stream start', 5000);

      expect(error.code).toBe(CameraErrorCode.TIMEOUT);
      expect(error.severity).toBe(CameraErrorSeverity.RECOVERABLE);
      expect(error.isRetryable).toBe(true);
      expect(error.technicalMessage).toContain('stream start');
      expect(error.technicalMessage).toContain('5000ms');
      expect(error.userMessage).toContain('초과');
    });
  });
});

describe('Type guards', () => {
  describe('isCameraError', () => {
    it('should return true for CameraError instances', () => {
      const error = new CameraError({
        code: CameraErrorCode.UNKNOWN_ERROR,
        severity: CameraErrorSeverity.CRITICAL,
        userMessage: 'Error',
        technicalMessage: 'Technical',
        recoverySuggestions: [],
      });

      expect(isCameraError(error)).toBe(true);
    });

    it('should return true for CameraError subclasses', () => {
      const permError = new CameraPermissionError('Msg', 'Tech', []);
      const deviceError = new CameraDeviceError(
        CameraErrorCode.DEVICE_NOT_FOUND,
        'Msg',
        'Tech',
        []
      );
      const streamError = new CameraStreamError(
        CameraErrorCode.STREAM_START_FAILED,
        'Msg',
        'Tech',
        []
      );

      expect(isCameraError(permError)).toBe(true);
      expect(isCameraError(deviceError)).toBe(true);
      expect(isCameraError(streamError)).toBe(true);
    });

    it('should return false for non-CameraError instances', () => {
      expect(isCameraError(new Error('Regular error'))).toBe(false);
      expect(isCameraError('string')).toBe(false);
      expect(isCameraError(null)).toBe(false);
      expect(isCameraError(undefined)).toBe(false);
      expect(isCameraError({})).toBe(false);
    });
  });

  describe('isCameraPermissionError', () => {
    it('should return true for CameraPermissionError', () => {
      const error = new CameraPermissionError('Msg', 'Tech', []);
      expect(isCameraPermissionError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const cameraError = new CameraError({
        code: CameraErrorCode.UNKNOWN_ERROR,
        severity: CameraErrorSeverity.CRITICAL,
        userMessage: 'Error',
        technicalMessage: 'Technical',
        recoverySuggestions: [],
      });

      expect(isCameraPermissionError(cameraError)).toBe(false);
      expect(isCameraPermissionError(new Error('Regular'))).toBe(false);
    });
  });

  describe('isCameraDeviceError', () => {
    it('should return true for CameraDeviceError', () => {
      const error = new CameraDeviceError(
        CameraErrorCode.DEVICE_NOT_FOUND,
        'Msg',
        'Tech',
        []
      );
      expect(isCameraDeviceError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const permError = new CameraPermissionError('Msg', 'Tech', []);
      expect(isCameraDeviceError(permError)).toBe(false);
    });
  });

  describe('isCameraStreamError', () => {
    it('should return true for CameraStreamError', () => {
      const error = new CameraStreamError(
        CameraErrorCode.STREAM_START_FAILED,
        'Msg',
        'Tech',
        []
      );
      expect(isCameraStreamError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const deviceError = new CameraDeviceError(
        CameraErrorCode.DEVICE_NOT_FOUND,
        'Msg',
        'Tech',
        []
      );
      expect(isCameraStreamError(deviceError)).toBe(false);
    });
  });
});

describe('Error codes coverage', () => {
  it('should cover all error codes in enum', () => {
    const allCodes = Object.values(CameraErrorCode);
    expect(allCodes).toContain('CAMERA_PERMISSION_DENIED');
    expect(allCodes).toContain('CAMERA_DEVICE_NOT_FOUND');
    expect(allCodes).toContain('CAMERA_STREAM_START_FAILED');
    expect(allCodes).toContain('CAMERA_INSECURE_CONTEXT');
    expect(allCodes).toContain('CAMERA_BROWSER_NOT_SUPPORTED');
    expect(allCodes).toContain('CAMERA_UNKNOWN_ERROR');
    expect(allCodes.length).toBeGreaterThan(10);
  });
});

describe('Error severity levels', () => {
  it('should have all severity levels', () => {
    const severities = Object.values(CameraErrorSeverity);
    expect(severities).toContain('critical');
    expect(severities).toContain('recoverable');
    expect(severities).toContain('warning');
    expect(severities).toContain('info');
  });
});
