import io from 'socket.io-client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key-min-8-chars';
const deviceId = 'device-test-123';
const screenId = 'screen-1';

const token = jwt.sign(
  {
    sub: 'user-demo',
    deviceId: deviceId,
    screenId: screenId,
    scopes: [`display:${screenId}`],
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('✅ JWT 토큰 생성 완료');
console.log('');

console.log('🔌 서버에 연결 중...');
const socket = io('http://localhost:3000/display', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ 서버 연결 성공! Socket ID:', socket.id);
  console.log('🔐 인증 시작...');
  
  socket.emit('auth', {
    token: token,
    deviceId: deviceId,
    screenId: screenId,
  });
});

socket.on('auth_success', (data) => {
  console.log('');
  console.log('🎉 ============================');
  console.log('🎉 인증 성공!');
  console.log('🎉 ============================');
  console.log('📺 Screen ID:', data.screenId);
  console.log('');
  console.log('✅ 테스트 완료! 서버와 정상적으로 연결되었습니다.');
  
  setTimeout(() => {
    console.log('');
    console.log('👋 연결 종료 중...');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('auth_failed', (data) => {
  console.error('');
  console.error('❌ ============================');
  console.error('❌ 인증 실패!');
  console.error('❌ ============================');
  console.error('⚠️  이유:', data.reason);
  console.error('');
  socket.disconnect();
  process.exit(1);
});

socket.on('connect_error', (error) => {
  console.error('');
  console.error('❌ 연결 오류:', error.message);
  process.exit(1);
});

console.log('⏳ 서버 응답 대기 중...');
