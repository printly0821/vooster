/**
 * 채널 관리 서비스 테스트
 *
 * channelManager.ts의 모든 함수를 테스트하여
 * 채널 구독, 메시지 브로드캐스트, ACK 처리의 정확성을 검증합니다
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server, Socket, Namespace } from 'socket.io';
import {
  subscribeToChannel,
  emitToChannel,
  getChannelStatus,
  logAck,
} from '../channelManager';

/**
 * 테스트용 모킹 Socket.IO 인스턴스
 */
function createMockSocket(): Partial<Socket> {
  return {
    id: 'test-socket-123',
    join: vi.fn(),
    on: vi.fn(),
    data: { deviceId: 'device-1', screenId: 'screen-1' },
    handshake: {
      address: '127.0.0.1',
    },
  };
}

/**
 * 테스트용 모킹 Namespace
 */
function createMockNamespace(): Partial<Namespace> {
  const rooms = new Map();
  return {
    adapter: {
      rooms,
    },
  };
}

/**
 * 테스트용 모킹 Server
 */
function createMockServer(namespace?: Partial<Namespace>): Partial<Server> {
  return {
    of: vi.fn(() => namespace || createMockNamespace()),
  };
}

describe('channelManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeToChannel', () => {
    it('should join socket to room with screenId', () => {
      const socket = createMockSocket() as any;
      const joinMock = vi.fn();
      socket.join = joinMock;

      subscribeToChannel(socket, 'screen-1');

      expect(joinMock).toHaveBeenCalledWith('screen-1');
    });

    it('should register ack event listener', () => {
      const socket = createMockSocket() as any;
      const onMock = vi.fn();
      socket.on = onMock;

      subscribeToChannel(socket, 'screen-1');

      expect(onMock).toHaveBeenCalledWith('ack', expect.any(Function));
    });
  });

  describe('emitToChannel', () => {
    it('should return error if payload has no txId', () => {
      const io = createMockServer() as any;
      const result = emitToChannel(io, 'screen-1', 'navigate', {
        // no txId
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('error');
    });

    it('should detect duplicate txId', () => {
      const io = createMockServer() as any;
      const payload = { txId: 'tx-duplicate-test-123', url: 'https://example.com' };

      // 첫 번째 메시지 전송 (실패: 클라이언트 없음)
      const result1 = emitToChannel(io, 'screen-1', 'navigate', payload);
      expect(result1.ok).toBe(false);

      // 같은 txId로 재전송 (실패: 중복)
      const result2 = emitToChannel(io, 'screen-1', 'navigate', payload);
      expect(result2.ok).toBe(false);
      expect(result2.reason).toBe('duplicate');
    });

    it('should return error if no clients connected', () => {
      const io = createMockServer() as any;

      const result = emitToChannel(io, 'screen-1', 'navigate', {
        txId: 'tx-no-clients-456',
        url: 'https://example.com',
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('no_clients');
    });

    it('should broadcast message successfully', () => {
      const namespace = {
        adapter: {
          rooms: new Map([['screen-1', new Set(['socket-1', 'socket-2'])]]),
        },
        to: vi.fn().mockReturnValue({
          emit: vi.fn(),
        }),
      } as any;

      const io = {
        of: vi.fn(() => namespace),
      } as any;

      const result = emitToChannel(io, 'screen-1', 'navigate', {
        txId: 'tx-broadcast-789',
        url: 'https://example.com',
      });

      expect(result.ok).toBe(true);
      expect(result.txId).toBe('tx-broadcast-789');
      expect(result.clientCount).toBe(2);
      expect(namespace.to).toHaveBeenCalledWith('screen-1');
    });
  });

  describe('getChannelStatus', () => {
    it('should return channel status with no clients', () => {
      const io = createMockServer() as any;

      const status = getChannelStatus(io, 'screen-1');

      expect(status.screenId).toBe('screen-1');
      expect(status.connected).toBe(0);
      expect(status.online).toBe(false);
    });

    it('should return channel status with connected clients', () => {
      const namespace = {
        adapter: {
          rooms: new Map([['screen-1', new Set(['socket-1', 'socket-2', 'socket-3'])]]),
        },
      } as any;

      const io = {
        of: vi.fn(() => namespace),
      } as any;

      const status = getChannelStatus(io, 'screen-1');

      expect(status.screenId).toBe('screen-1');
      expect(status.connected).toBe(3);
      expect(status.online).toBe(true);
    });
  });

  describe('logAck', () => {
    it('should log success ack without error', () => {
      // logAck 함수는 logger를 사용하므로 에러 없이 실행되는지만 확인
      expect(() => {
        logAck('tx-001', 'success', 'screen-1', 'tab-1');
      }).not.toThrow();
    });

    it('should log failed ack with error without throwing', () => {
      expect(() => {
        logAck('tx-001', 'failed', 'screen-1', 'tab-1', 'Element not found');
      }).not.toThrow();
    });

    it('should log timeout ack without error', () => {
      expect(() => {
        logAck('tx-001', 'timeout', 'screen-1', 'tab-1');
      }).not.toThrow();
    });

    it('should handle logAck with optional tabId', () => {
      expect(() => {
        logAck('tx-002', 'success', 'screen-2');
      }).not.toThrow();
    });
  });
});
