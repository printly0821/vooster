/**
 * Test utilities for camera feature
 *
 * Provides mock helpers for navigator APIs, MediaStream, and MediaStreamTrack
 */

import { vi } from 'vitest';

/**
 * Mock MediaStreamTrack
 */
export class MockMediaStreamTrack implements MediaStreamTrack {
  kind: 'audio' | 'video' = 'video';
  id = 'mock-track-id';
  label = 'Mock Camera Track';
  enabled = true;
  muted = false;
  readonly = false;
  readyState: MediaStreamTrackState = 'live';
  contentHint = '';

  private listeners: Map<string, Set<EventListener>> = new Map();

  onended: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => any) | null = null;

  stop = vi.fn(() => {
    this.readyState = 'ended';
    const event = new Event('ended');
    this.dispatchEvent(event);
  });

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack();
  }

  getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  getSettings(): MediaTrackSettings {
    return {
      width: 1280,
      height: 720,
      deviceId: 'mock-device-id',
      facingMode: 'environment',
    };
  }

  applyConstraints(constraints?: MediaTrackConstraints): Promise<void> {
    return Promise.resolve();
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  }
}

/**
 * Mock MediaStream
 */
export class MockMediaStream implements MediaStream {
  id = 'mock-stream-id';
  active = true;

  private tracks: MockMediaStreamTrack[] = [new MockMediaStreamTrack()];
  private listeners: Map<string, Set<EventListener>> = new Map();

  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null = null;

  getTracks(): MediaStreamTrack[] {
    return this.tracks;
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }

  getTrackById(trackId: string): MediaStreamTrack | null {
    return this.tracks.find((track) => track.id === trackId) || null;
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track as MockMediaStreamTrack);
  }

  removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
  }

  clone(): MediaStream {
    return new MockMediaStream();
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  }
}

/**
 * Mock PermissionStatus
 */
export class MockPermissionStatus extends EventTarget implements PermissionStatus {
  state: PermissionState = 'prompt';
  name: PermissionName = 'camera' as PermissionName;

  onchange: ((this: PermissionStatus, ev: Event) => any) | null = null;

  constructor(initialState: PermissionState = 'prompt') {
    super();
    this.state = initialState;
  }

  setState(newState: PermissionState): void {
    this.state = newState;
    const event = new Event('change');
    this.dispatchEvent(event);
    if (this.onchange) {
      this.onchange.call(this, event);
    }
  }
}

/**
 * Mock navigator.mediaDevices
 */
export function createMockMediaDevices() {
  const getUserMedia = vi.fn(
    (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      return Promise.resolve(new MockMediaStream());
    }
  );

  const enumerateDevices = vi.fn((): Promise<MediaDeviceInfo[]> => {
    return Promise.resolve([
      {
        deviceId: 'camera-1',
        kind: 'videoinput',
        label: 'Back Camera',
        groupId: 'group-1',
        toJSON: () => ({}),
      },
      {
        deviceId: 'camera-2',
        kind: 'videoinput',
        label: 'Front Camera',
        groupId: 'group-2',
        toJSON: () => ({}),
      },
    ] as MediaDeviceInfo[]);
  });

  const getSupportedConstraints = vi.fn((): MediaTrackSupportedConstraints => {
    return {
      aspectRatio: true,
      facingMode: true,
      frameRate: true,
      height: true,
      width: true,
    };
  });

  const mockMediaDevices = {
    getUserMedia,
    enumerateDevices,
    getSupportedConstraints,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaDevices;

  return {
    mediaDevices: mockMediaDevices,
    getUserMedia,
    enumerateDevices,
    getSupportedConstraints,
  };
}

/**
 * Mock navigator.permissions
 */
export function createMockPermissions() {
  const permissionStatus = new MockPermissionStatus('prompt');

  const query = vi.fn(
    (descriptor: PermissionDescriptor): Promise<PermissionStatus> => {
      return Promise.resolve(permissionStatus);
    }
  );

  const mockPermissions = {
    query,
  } as unknown as Permissions;

  return {
    permissions: mockPermissions,
    permissionStatus,
    query,
  };
}

/**
 * Mock localStorage
 */
export function createMockLocalStorage() {
  const storage = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get length() {
      return storage.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    }),
  };
}

/**
 * Setup global navigator mocks
 */
export function setupNavigatorMocks() {
  const mediaDevicesMock = createMockMediaDevices();
  const permissionsMock = createMockPermissions();

  Object.defineProperty(global, 'navigator', {
    value: {
      ...global.navigator,
      mediaDevices: mediaDevicesMock.mediaDevices,
      permissions: permissionsMock.permissions,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    writable: true,
    configurable: true,
  });

  return {
    ...mediaDevicesMock,
    ...permissionsMock,
  };
}

/**
 * Setup iOS user agent
 */
export function setupIOSUserAgent(version = '15.0') {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: `Mozilla/5.0 (iPhone; CPU iPhone OS ${version.replace('.', '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Mobile/15E148 Safari/604.1`,
    writable: true,
    configurable: true,
  });
}

/**
 * Setup Safari user agent
 */
export function setupSafariUserAgent() {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    writable: true,
    configurable: true,
  });
}

/**
 * Setup Chrome user agent
 */
export function setupChromeUserAgent() {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    writable: true,
    configurable: true,
  });
}

/**
 * Create mock DOMException
 */
export function createDOMException(name: string, message: string): DOMException {
  const error = new DOMException(message, name);
  Object.defineProperty(error, 'name', {
    value: name,
    writable: false,
    configurable: true,
  });
  return error;
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks();
}
