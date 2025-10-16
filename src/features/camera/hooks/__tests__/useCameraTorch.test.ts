/**
 * useCameraTorch Hook Tests
 *
 * Tests for camera torch (flashlight) control functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCameraTorch } from '../useCameraTorch';

describe('useCameraTorch', () => {
  let mockStream: MediaStream;
  let mockTrack: MediaStreamTrack;

  beforeEach(() => {
    // Mock MediaStreamTrack
    mockTrack = {
      getCapabilities: vi.fn(),
      applyConstraints: vi.fn(),
      stop: vi.fn(),
      kind: 'video',
      id: 'test-track',
      label: 'Test Camera',
      enabled: true,
      muted: false,
      readyState: 'live',
    } as unknown as MediaStreamTrack;

    // Mock MediaStream
    mockStream = {
      getVideoTracks: vi.fn(() => [mockTrack]),
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Torch Support Detection', () => {
    it('should detect torch support when available', () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });

      const { result } = renderHook(() => useCameraTorch(mockStream));

      expect(result.current.torchCapability.isSupported).toBe(true);
      expect(result.current.torchCapability.isEnabled).toBe(false);
    });

    it('should detect when torch is not supported', () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({});

      const { result } = renderHook(() => useCameraTorch(mockStream));

      expect(result.current.torchCapability.isSupported).toBe(false);
      expect(result.current.torchCapability.isEnabled).toBe(false);
    });

    it('should handle null stream gracefully', () => {
      const { result } = renderHook(() => useCameraTorch(null));

      expect(result.current.torchCapability.isSupported).toBe(false);
      expect(result.current.torchCapability.isEnabled).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle getCapabilities errors', () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('getCapabilities not supported');
      });

      const { result } = renderHook(() => useCameraTorch(mockStream));

      expect(result.current.torchCapability.isSupported).toBe(false);
    });

    it('should update support when stream changes', async () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({});

      const { result, rerender } = renderHook(
        ({ stream }) => useCameraTorch(stream),
        { initialProps: { stream: mockStream } }
      );

      expect(result.current.torchCapability.isSupported).toBe(false);

      // Update mock to support torch
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });

      // Manually trigger support recheck
      act(() => {
        result.current.checkTorchSupport();
      });

      expect(result.current.torchCapability.isSupported).toBe(true);
    });
  });

  describe('Torch Toggle Functionality', () => {
    beforeEach(() => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('should toggle torch on', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await result.current.toggleTorch();
      });

      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }],
      });
      expect(result.current.torchCapability.isEnabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should toggle torch off', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      // Turn on first
      await act(async () => {
        await result.current.toggleTorch();
      });

      expect(result.current.torchCapability.isEnabled).toBe(true);

      // Turn off
      await act(async () => {
        await result.current.toggleTorch();
      });

      expect(mockTrack.applyConstraints).toHaveBeenLastCalledWith({
        advanced: [{ torch: false }],
      });
      expect(result.current.torchCapability.isEnabled).toBe(false);
    });

    it('should throw error when no video track available', async () => {
      (mockStream.getVideoTracks as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const { result } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await expect(result.current.toggleTorch()).rejects.toThrow(
          'No video track available'
        );
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should throw error when torch not supported', async () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({});

      const { result } = renderHook(() => useCameraTorch(mockStream));

      await expect(result.current.toggleTorch()).rejects.toThrow(
        'Torch not supported on this device'
      );
    });

    it('should handle applyConstraints errors', async () => {
      const constraintsError = new Error('Constraints failed');
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockRejectedValue(constraintsError);

      const { result } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await expect(result.current.toggleTorch()).rejects.toThrow('Constraints failed');
      });

      expect(result.current.error).toBe(constraintsError);
    });
  });

  describe('Specific Torch Control Functions', () => {
    beforeEach(() => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('should enable torch using enableTorch', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await result.current.enableTorch();
      });

      expect(result.current.torchCapability.isEnabled).toBe(true);
    });

    it('should disable torch using disableTorch', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      // Enable first
      await act(async () => {
        await result.current.enableTorch();
      });

      expect(result.current.torchCapability.isEnabled).toBe(true);

      // Disable
      await act(async () => {
        await result.current.disableTorch();
      });

      await waitFor(() => {
        expect(result.current.torchCapability.isEnabled).toBe(false);
      });
    });

    it('should not toggle if already in desired state', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await result.current.enableTorch();
      });

      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockClear();

      // Try to enable again
      await act(async () => {
        await result.current.enableTorch();
      });

      expect(mockTrack.applyConstraints).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup and Unmount', () => {
    beforeEach(() => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('should turn off torch on unmount if enabled', async () => {
      const { result, unmount } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await result.current.enableTorch();
      });

      expect(result.current.torchCapability.isEnabled).toBe(true);

      unmount();

      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: false }],
      });
    });

    it('should not try to turn off torch if not enabled', () => {
      const { unmount } = renderHook(() => useCameraTorch(mockStream));

      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockClear();

      unmount();

      expect(mockTrack.applyConstraints).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors silently', async () => {
      const { result, unmount } = renderHook(() => useCameraTorch(mockStream));

      await act(async () => {
        await result.current.enableTorch();
      });

      // Mock applyConstraints to return a rejected promise
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockReturnValue(
        Promise.reject(new Error('Cleanup failed'))
      );

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Manual Support Check', () => {
    it('should allow manual support recheck', () => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({});

      const { result } = renderHook(() => useCameraTorch(mockStream));

      expect(result.current.torchCapability.isSupported).toBe(false);

      // Update capabilities
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });

      act(() => {
        result.current.checkTorchSupport();
      });

      expect(result.current.torchCapability.isSupported).toBe(true);
    });
  });

  describe('Error State Management', () => {
    beforeEach(() => {
      (mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true });
    });

    it('should clear error on successful toggle', async () => {
      const { result } = renderHook(() => useCameraTorch(mockStream));

      // Cause an error first
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('First error')
      );

      await act(async () => {
        try {
          await result.current.toggleTorch();
        } catch {}
      });

      expect(result.current.error).not.toBeNull();

      // Successful toggle should clear error
      (mockTrack.applyConstraints as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.toggleTorch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
