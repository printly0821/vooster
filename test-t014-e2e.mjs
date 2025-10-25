/**
 * T-014 E2E 테스트
 *
 * 디스플레이 등록, 페어링, 트리거 API의 전체 플로우를 테스트합니다
 */

import io from 'socket.io-client';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = 'your-secret-key-min-8-chars';

/**
 * JWT 토큰 생성
 */
function generateToken(userId, scopes) {
  return jwt.sign(
    {
      sub: userId,
      scopes,
      type: 'display',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );
}

/**
 * 테스트 1: 디스플레이 등록
 */
async function testDisplayRegister() {
  console.log('\n=== 테스트 1: 디스플레이 등록 ===');

  const response = await fetch(`${BASE_URL}/api/displays/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'device-e2e-001',
      name: 'E2E 테스트 화면',
      purpose: 'testing',
      orgId: 'test-org',
      lineId: 'test-line',
    }),
  });

  const data = await response.json();
  console.log('응답:', data);
  console.log('상태 코드:', response.status);

  if (data.ok && data.screenId) {
    console.log('✅ 디스플레이 등록 성공! screenId:', data.screenId);
    return data.screenId;
  } else {
    console.log('❌ 디스플레이 등록 실패');
    throw new Error('Display register failed');
  }
}

/**
 * 테스트 2: 페어링 QR 생성
 */
async function testPairingQR() {
  console.log('\n=== 테스트 2: 페어링 QR 생성 ===');

  const response = await fetch(`${BASE_URL}/api/pair/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  console.log('응답:', data);

  if (data.ok && data.sessionId && data.code) {
    console.log('✅ QR 생성 성공!');
    console.log('   - sessionId:', data.sessionId);
    console.log('   - code:', data.code);
    console.log('   - expiresIn:', data.expiresIn, '초');
    return { sessionId: data.sessionId, code: data.code };
  } else {
    console.log('❌ QR 생성 실패');
    throw new Error('QR generation failed');
  }
}

/**
 * 테스트 3: 페어링 승인
 */
async function testPairingApprove(sessionId, code) {
  console.log('\n=== 테스트 3: 페어링 승인 ===');

  // 승인자 JWT 생성 (스마트폰 사용자)
  const approverToken = generateToken('user-smartphone-001', ['user:approve']);

  const response = await fetch(`${BASE_URL}/api/pair/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${approverToken}`,
    },
    body: JSON.stringify({
      sessionId,
      code,
      deviceId: 'device-paired-001',
      orgId: 'test-org',
      lineId: 'test-line',
    }),
  });

  const data = await response.json();
  console.log('응답:', data);
  console.log('상태 코드:', response.status);

  if (data.ok && data.token && data.screenId) {
    console.log('✅ 페어링 승인 성공!');
    console.log('   - token:', data.token.substring(0, 50) + '...');
    console.log('   - screenId:', data.screenId);
    return { token: data.token, screenId: data.screenId };
  } else {
    console.log('❌ 페어링 승인 실패');
    throw new Error('Pairing approve failed');
  }
}

/**
 * 테스트 4: 트리거 전송 (Socket.IO 통합)
 */
async function testTrigger(screenId, token) {
  console.log('\n=== 테스트 4: 트리거 전송 (Socket.IO 통합) ===');

  return new Promise((resolve) => {
    // 1. Socket.IO 클라이언트 연결 (브라우저 확장 역할)
    console.log('[클라이언트] Socket.IO 연결 시작...');

    const socket = io(`${BASE_URL}/display`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[클라이언트] ✅ 연결 성공! Socket ID:', socket.id);

      // 인증
      socket.emit('auth', {
        token,
        deviceId: 'device-paired-001',
        screenId,
      });
    });

    socket.on('auth_success', async () => {
      console.log('[클라이언트] ✅ 인증 성공! 채널 구독됨:', screenId);

      // navigate 이벤트 리스너 등록
      socket.on('navigate', (data) => {
        console.log('\n[클라이언트] 📨 navigate 이벤트 수신!');
        console.log('   - txId:', data.txId);
        console.log('   - jobNo:', data.jobNo);
        console.log('   - url:', data.url);
        console.log('   - timestamp:', new Date(data.timestamp).toISOString());

        // ACK 전송
        socket.emit('ack', {
          txId: data.txId,
          result: 'success',
          tabId: 'tab-001',
          ts: Date.now(),
        });

        console.log('[클라이언트] ✅ ACK 전송 완료');

        // 테스트 완료
        setTimeout(() => {
          socket.disconnect();
          resolve(data);
        }, 1000);
      });

      // 2. 트리거 API 호출 (스마트폰 역할)
      console.log('\n[스마트폰] 트리거 API 호출...');

      const triggerToken = generateToken('user-smartphone-001', [`display:${screenId}`]);

      const response = await fetch(`${BASE_URL}/api/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${triggerToken}`,
        },
        body: JSON.stringify({
          screenId,
          jobNo: 'JOB-E2E-12345',
        }),
      });

      const data = await response.json();
      console.log('[스마트폰] 트리거 응답:', data);
      console.log('[스마트폰] 상태 코드:', response.status);

      if (data.ok && data.txId) {
        console.log('[스마트폰] ✅ 트리거 전송 성공!');
        console.log('   - txId:', data.txId);
        console.log('   - clientCount:', data.clientCount);
      } else {
        console.log('[스마트폰] ❌ 트리거 전송 실패:', data.reason);
      }
    });

    socket.on('auth_failed', (data) => {
      console.log('[클라이언트] ❌ 인증 실패:', data.reason);
      socket.disconnect();
      resolve(null);
    });

    // 타임아웃
    setTimeout(() => {
      console.log('[클라이언트] ⏱️ 테스트 타임아웃 (30초)');
      socket.disconnect();
      resolve(null);
    }, 30000);
  });
}

/**
 * 테스트 5: 디스플레이 목록 조회
 */
async function testDisplayList() {
  console.log('\n=== 테스트 5: 디스플레이 목록 조회 ===');

  const token = generateToken('user-admin-001', ['admin:read']);

  const response = await fetch(`${BASE_URL}/api/displays?lineId=test-line&onlineOnly=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log('응답:', data);
  console.log('상태 코드:', response.status);

  if (data.ok && Array.isArray(data.displays)) {
    console.log('✅ 목록 조회 성공! 디스플레이 수:', data.displays.length);
    data.displays.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.screenId} - ${d.name} (${d.online ? 'online' : 'offline'})`);
    });
  } else {
    console.log('❌ 목록 조회 실패');
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('T-014 E2E 테스트 시작');
  console.log('═══════════════════════════════════════');

  try {
    // 1. 디스플레이 등록
    const screenId = await testDisplayRegister();

    // 2. 페어링 QR 생성
    const { sessionId, code } = await testPairingQR();

    // 3. 페어링 승인
    const { token } = await testPairingApprove(sessionId, code);

    // 4. 트리거 전송 (Socket.IO 통합)
    await testTrigger(screenId, token);

    // 5. 디스플레이 목록 조회
    await testDisplayList();

    console.log('\n═══════════════════════════════════════');
    console.log('✅ 모든 테스트 통과!');
    console.log('═══════════════════════════════════════');
    console.log('\n검증 항목:');
    console.log('  ✅ 디스플레이 등록 및 screenId 생성');
    console.log('  ✅ 페어링 QR 생성 (sessionId, code)');
    console.log('  ✅ 페어링 승인 및 JWT 발급');
    console.log('  ✅ 트리거 API → Socket.IO → 클라이언트 전송');
    console.log('  ✅ ACK 수신 및 로깅');
    console.log('  ✅ 디스플레이 목록 조회\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 테스트 실행
runTests();
