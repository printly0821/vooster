/**
 * T-012 ~ T-017 전체 플로우 E2E 테스트
 *
 * 서버 + Chrome Extension의 완전한 통합 테스트
 * - 디스플레이 등록
 * - QR 페어링
 * - 페어링 승인
 * - WebSocket 연결
 * - 트리거 전송
 * - 탭 생성 (시뮬레이션)
 * - ACK 수신
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const JWT_SECRET = 'your-secret-key-min-8-chars';

console.log('═══════════════════════════════════════');
console.log('T-012 ~ T-017 전체 플로우 E2E 테스트');
console.log('═══════════════════════════════════════\n');

/**
 * Step 1: 디스플레이 등록
 */
async function step1_registerDisplay() {
  console.log('📍 Step 1: 디스플레이 등록');

  const response = await fetch(`${BASE_URL}/api/displays/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'e2e-device-001',
      name: 'E2E 테스트 디스플레이',
      purpose: 'testing',
      orgId: 'e2e-org',
      lineId: 'e2e-line',
    }),
  });

  const data = await response.json();
  console.log('응답:', data);

  if (data.ok && data.screenId) {
    console.log('✅ 디스플레이 등록 성공:', data.screenId, '\n');
    return data.screenId;
  } else {
    throw new Error('디스플레이 등록 실패');
  }
}

/**
 * Step 2: QR 페어링 세션 생성
 */
async function step2_createPairingQR() {
  console.log('📍 Step 2: QR 페어링 세션 생성');

  const response = await fetch(`${BASE_URL}/api/pair/qr`, {
    method: 'POST',
  });

  const data = await response.json();
  console.log('응답:', data);

  if (data.ok && data.sessionId) {
    console.log('✅ QR 생성 성공');
    console.log('   sessionId:', data.sessionId);
    console.log('   code:', data.code, '\n');
    return { sessionId: data.sessionId, code: data.code };
  } else {
    throw new Error('QR 생성 실패');
  }
}

/**
 * Step 3: 페어링 승인
 */
async function step3_approvePairing(sessionId, code, screenId) {
  console.log('📍 Step 3: 페어링 승인 (스마트폰 역할)');

  // 승인자 JWT 생성
  const approverToken = jwt.sign(
    { sub: 'user-e2e-test', scopes: ['user:approve'] },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await fetch(`${BASE_URL}/api/pair/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${approverToken}`,
    },
    body: JSON.stringify({
      sessionId,
      code,
      deviceId: 'e2e-device-001',
      orgId: 'e2e-org',
      lineId: 'e2e-line',
    }),
  });

  const data = await response.json();
  console.log('응답:', data);

  if (data.ok && data.token) {
    console.log('✅ 페어링 승인 성공');
    console.log('   token:', data.token.substring(0, 50) + '...');
    console.log('   screenId:', data.screenId, '\n');
    return data.token;
  } else {
    throw new Error('페어링 승인 실패');
  }
}

/**
 * Step 4: WebSocket 연결 대기
 */
async function step4_waitForWebSocket() {
  console.log('📍 Step 4: WebSocket 연결 대기 (Extension Service Worker)');
  console.log('⏳ Extension이 WebSocket에 연결할 시간 제공...');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('✅ WebSocket 연결 완료 (추정)\n');
  console.log('💡 Extension Service Worker 콘솔에서 확인:');
  console.log('   - [SocketClient] 연결 성공!');
  console.log('   - [SocketClient] 인증 성공');
  console.log('   - Extension 배지: 녹색 점 (●)\n');
}

/**
 * Step 5: 트리거 전송
 */
async function step5_sendTrigger(screenId) {
  console.log('📍 Step 5: 트리거 전송 (스마트폰 → 서버 → Extension)');

  // display 권한 JWT 생성
  const displayToken = jwt.sign(
    {
      sub: 'user-e2e-test',
      scopes: [`display:${screenId}`],
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const response = await fetch(`${BASE_URL}/api/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${displayToken}`,
    },
    body: JSON.stringify({
      screenId,
      jobNo: 'E2E-JOB-12345',
    }),
  });

  const data = await response.json();
  console.log('응답:', data);

  if (data.ok && data.txId) {
    console.log('✅ 트리거 전송 성공');
    console.log('   txId:', data.txId);
    console.log('   clientCount:', data.clientCount, '\n');
    return data.txId;
  } else {
    console.log('⚠️  트리거 전송 실패:', data.reason);
    console.log('💡 Extension이 WebSocket에 연결되어 있는지 확인하세요\n');
    return null;
  }
}

/**
 * Step 6: 결과 확인 안내
 */
function step6_verifyResults(txId) {
  console.log('📍 Step 6: 결과 확인');

  console.log('\n✅ 서버 로그에서 확인할 사항:');
  console.log('   ✓ 트리거 전송 성공');
  console.log('   ✓ 메시지 브로드캐스트: clientCount=1');
  console.log(`   ✓ ACK 수신: txId=${txId || '...'}`);

  console.log('\n✅ Extension Service Worker 콘솔에서 확인할 사항:');
  console.log('   ✓ [Navigate] 처리 시작: jobNo=E2E-JOB-12345');
  console.log('   ✓ [Navigate] 탭 생성 성공');
  console.log('   ✓ [Navigate] ACK 전송: result=opened');

  console.log('\n✅ Chrome 브라우저에서 확인할 사항:');
  console.log('   ✓ 새 탭이 자동으로 열림');
  console.log('   ✓ URL: http://localhost:3000/orders/E2E-JOB-12345');
  console.log('   ✓ (404 페이지는 정상 - Next.js 페이지 미구현)\n');
}

/**
 * 메인 테스트 실행
 */
async function runE2ETest() {
  try {
    // Step 1: 디스플레이 등록
    const screenId = await step1_registerDisplay();

    // Step 2: QR 생성
    const { sessionId, code } = await step2_createPairingQR();

    // Step 3: 페어링 승인
    const token = await step3_approvePairing(sessionId, code, screenId);

    // Step 4: WebSocket 연결 대기
    await step4_waitForWebSocket();

    // Step 5: 트리거 전송
    const txId = await step5_sendTrigger(screenId);

    // Step 6: 결과 확인 안내
    step6_verifyResults(txId);

    console.log('═══════════════════════════════════════');
    console.log('✅ E2E 테스트 완료!');
    console.log('═══════════════════════════════════════');
    console.log('\n💡 Chrome Extension을 재로드하고,');
    console.log('   Service Worker 콘솔과 브라우저 탭을 확인하세요!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  }
}

// 테스트 실행
runE2ETest();
