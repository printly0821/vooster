# Socket.IO 클라이언트 사용 예제

Socket.IO 서버와 통신하는 클라이언트 코드 예제입니다.

## 1. 기본 연결

### React Hook 예제

```typescript
import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

function useSocket(token: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 소켓 연결
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // 연결 이벤트
    socket.on('connect', () => {
      console.log('✓ Socket 연결됨:', socket.id);
      setConnected(true);
    });

    // 연결 해제 이벤트
    socket.on('disconnect', () => {
      console.log('✗ Socket 연결 해제');
      setConnected(false);
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      console.error('연결 에러:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef.current;
}

export { useSocket };
```

## 2. 클라이언트 등록 및 세션 참여

```typescript
function BarcodeScannerApp() {
  const [sessionId, setSessionId] = useState('');
  const [role, setRole] = useState<'mobile' | 'monitor'>('mobile');
  const socket = useSocket(authToken);

  const registerAndJoinSession = async () => {
    if (!socket || !sessionId) return;

    // 클라이언트 역할 등록
    socket.emit('registerClient', { role });

    socket.once('registered', (data) => {
      console.log('클라이언트 등록됨:', data.socketId);

      // 세션 참여
      socket.emit('joinSession', { sessionId });
    });

    socket.once('joinedSession', (data) => {
      console.log('세션 참여:', data);
    });
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Session ID"
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
      />
      <select value={role} onChange={(e) => setRole(e.target.value as any)}>
        <option value="mobile">Mobile</option>
        <option value="monitor">Monitor</option>
      </select>
      <button onClick={registerAndJoinSession}>
        세션 참여
      </button>
    </div>
  );
}
```

## 3. 바코드 스캔 이벤트

### 모바일 클라이언트 (바코드 전송)

```typescript
function BarcodeScanner({ socket, sessionId }) {
  const handleScan = (barcode: string) => {
    const orderNo = extractOrderNumber(barcode);

    // 바코드 스캔 이벤트 전송
    socket.emit('scanOrder', {
      sessionId,
      orderNo,
      ts: Date.now(),
      nonce: generateNonce(),
    });

    console.log('주문 스캔 전송:', orderNo);
  };

  return (
    <BarcodeReader onScan={handleScan} />
  );
}

function extractOrderNumber(barcode: string): string {
  // 바코드에서 주문번호 추출 로직
  return barcode.slice(0, 10);
}

function generateNonce(): string {
  return Math.random().toString(36).substr(2, 9);
}
```

### 모니터 클라이언트 (이벤트 수신)

```typescript
function MonitorDisplay({ socket, sessionId }) {
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    // navigate 이벤트 수신
    socket.on('navigate', (data) => {
      console.log('주문 네비게이션:', data);
      setCurrentOrder({
        orderNo: data.orderNo,
        from: data.from,
        timestamp: new Date(data.ts),
      });

      // 주문 정보 API 호출
      fetchOrderDetails(data.orderNo);
    });

    return () => {
      socket.off('navigate');
    };
  }, [socket, sessionId]);

  const fetchOrderDetails = async (orderNo: string) => {
    try {
      const response = await fetch(`/api/orders/${orderNo}`);
      const order = await response.json();
      setCurrentOrder(prev => ({ ...prev, ...order }));
    } catch (error) {
      console.error('주문 조회 실패:', error);
    }
  };

  return (
    <div className="monitor-display">
      {currentOrder && (
        <div>
          <h2>주문번호: {currentOrder.orderNo}</h2>
          <p>상태: {currentOrder.status}</p>
          <p>수량: {currentOrder.quantity}</p>
          {/* 썸네일 그리드 등 */}
        </div>
      )}
    </div>
  );
}
```

## 4. 하트비트 (연결 유지)

```typescript
function useHeartbeat(socket: Socket, interval: number = 30000) {
  useEffect(() => {
    if (!socket) return;

    const heartbeatTimer = setInterval(() => {
      socket.emit('heartbeat');

      socket.once('heartbeat:ack', (timestamp) => {
        console.log('하트비트 응답:', new Date(timestamp).toISOString());
      });
    }, interval);

    return () => clearInterval(heartbeatTimer);
  }, [socket, interval]);
}

// 사용
function App() {
  const socket = useSocket(token);
  useHeartbeat(socket);

  return <div>...</div>;
}
```

## 5. 이벤트 리스너 등록

```typescript
useEffect(() => {
  if (!socket) return;

  // 새 클라이언트가 참여했을 때
  socket.on('clientJoined', (data) => {
    console.log('클라이언트 참여:', data);
    // 예: 참여자 목록 업데이트
  });

  // 클라이언트가 떠났을 때
  socket.on('clientLeft', (data) => {
    console.log('클라이언트 퇴장:', data);
    // 예: 참여자 목록에서 제거
  });

  // 에러 처리
  socket.on('error', (data) => {
    console.error('서버 에러:', data.message);
  });

  return () => {
    socket.off('clientJoined');
    socket.off('clientLeft');
    socket.off('error');
  };
}, [socket]);
```

## 6. 완전한 예제: 바코드 스캐너 앱

```typescript
import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

const BarcodeScanApp: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionId, setSessionId] = useState('session-' + Date.now());
  const [role, setRole] = useState<'mobile' | 'monitor'>('mobile');
  const [connected, setConnected] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // Socket 초기화
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000', {
      auth: { token: authToken },
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✓ 연결됨');
      setConnected(true);

      // 클라이언트 등록
      newSocket.emit('registerClient', { role });

      // 세션 참여
      newSocket.emit('joinSession', { sessionId });
    });

    newSocket.on('disconnect', () => {
      console.log('✗ 연결 해제');
      setConnected(false);
    });

    newSocket.on('joinedSession', (data) => {
      console.log('세션 참여:', data);
    });

    // navigate 이벤트 수신
    newSocket.on('navigate', (data) => {
      console.log('주문:', data);
      setCurrentOrder({
        orderNo: data.orderNo,
        from: data.from,
      });
      setOrders(prev => [data, ...prev]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('연결 에러:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authToken, role, sessionId]);

  // 바코드 스캔 시뮬레이션
  const simulateScan = () => {
    if (!socket || !connected) {
      alert('서버에 연결되지 않았습니다.');
      return;
    }

    const orderNo = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    socket.emit('scanOrder', {
      sessionId,
      orderNo,
      ts: Date.now(),
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>바코드 주문 조회</h1>

      <div style={{ marginBottom: '20px' }}>
        <p>상태: <strong>{connected ? '✓ 연결됨' : '✗ 연결 안됨'}</strong></p>
        <p>역할: <strong>{role}</strong></p>
        <p>세션: <strong>{sessionId}</strong></p>
      </div>

      {role === 'mobile' && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={simulateScan}>
            {connected ? '주문 스캔 (시뮬레이션)' : '연결 대기중...'}
          </button>
        </div>
      )}

      {currentOrder && (
        <div style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '20px' }}>
          <h2>현재 주문</h2>
          <p>주문번호: {currentOrder.orderNo}</p>
          <p>발신자: {currentOrder.from}</p>
        </div>
      )}

      {orders.length > 0 && (
        <div>
          <h3>최근 주문 내역</h3>
          <ul>
            {orders.slice(0, 10).map((order, idx) => (
              <li key={idx}>
                {order.orderNo} ({order.from})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanApp;
```

## 7. TypeScript 타입 정의

클라이언트 측 타입을 정의하려면:

```typescript
// types/socket.ts
export interface SocketEvents {
  // 클라이언트 → 서버
  registerClient: (data: { role: 'mobile' | 'monitor' }) => void;
  joinSession: (data: { sessionId: string }) => void;
  scanOrder: (data: {
    sessionId: string;
    orderNo: string;
    ts: number;
    nonce?: string;
  }) => void;
  heartbeat: () => void;

  // 서버 → 클라이언트
  registered: (data: { success: boolean; socketId: string }) => void;
  joinedSession: (data: {
    sessionId: string;
    status: { isActive: boolean; hasMobile: boolean; hasMonitor: boolean };
  }) => void;
  navigate: (data: {
    orderNo: string;
    ts: number;
    nonce?: string;
    from: 'mobile' | 'monitor';
    fromSocketId: string;
  }) => void;
  clientJoined: (data: {
    socketId: string;
    role: 'mobile' | 'monitor';
    status: any;
  }) => void;
  clientLeft: (data: { socketId: string; status: any }) => void;
  'heartbeat:ack': (timestamp: number) => void;
  error: (data: { message: string }) => void;
}
```

## 참고 사항

1. **JWT 토큰**: 클라이언트는 서버로부터 유효한 JWT 토큰을 받아야 합니다.
2. **CORS**: 클라이언트의 도메인이 서버의 CORS 설정에 포함되어야 합니다.
3. **보안**: 프로덕션 환경에서는 HTTPS/WSS를 사용하세요.
4. **에러 처리**: 항상 연결 실패와 네트워크 오류를 처리하세요.
5. **재연결**: Socket.IO는 기본적으로 자동 재연결을 지원합니다.
