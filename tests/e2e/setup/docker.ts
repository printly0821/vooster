/**
 * Docker Compose 헬스체크 유틸리티
 *
 * E2E 테스트 시작 전 Docker 서비스가 준비될 때까지 대기합니다.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Docker Compose 서비스 대기
 *
 * Socket.IO 서버와 Redis가 모두 정상 실행될 때까지 대기합니다.
 *
 * @param timeoutSec - 최대 대기 시간 (초, 기본 60초)
 * @throws Docker 서비스가 시간 내에 준비되지 않으면 에러
 *
 * @example
 * // Playwright global-setup.ts에서 호출
 * await waitForDockerServices();
 */
export async function waitForDockerServices(timeoutSec: number = 60): Promise<void> {
  console.log('⏳ Docker 서비스 대기 중...');

  // 1. Socket.IO 서버 헬스체크
  console.log('  - Socket.IO 서버 확인 중...');
  await waitForHealthCheck('http://localhost:3001/health', timeoutSec);
  console.log('  ✅ Socket.IO 서버 준비 완료');

  // 2. Redis 연결 확인
  console.log('  - Redis 확인 중...');
  await waitForRedis(timeoutSec);
  console.log('  ✅ Redis 준비 완료');

  console.log('✅ 모든 Docker 서비스 준비 완료');
}

/**
 * HTTP 헬스체크 엔드포인트 대기
 *
 * @param url - 헬스체크 URL
 * @param timeoutSec - 최대 대기 시간 (초)
 * @throws 타임아웃 시 에러
 *
 * @private 내부 함수
 */
async function waitForHealthCheck(url: string, timeoutSec: number): Promise<void> {
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < timeoutSec) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          return;
        }
      }
    } catch (error) {
      // 재시도
    }

    // 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Health check timeout: ${url}`);
}

/**
 * Redis 연결 확인
 *
 * @param timeoutSec - 최대 대기 시간 (초)
 * @throws Redis 연결 실패 시 에러
 *
 * @private 내부 함수
 */
async function waitForRedis(timeoutSec: number): Promise<void> {
  const startTime = Date.now();

  while ((Date.now() - startTime) / 1000 < timeoutSec) {
    try {
      const { stdout } = await execAsync('docker exec vooster-redis redis-cli ping');
      if (stdout.trim() === 'PONG') {
        return;
      }
    } catch (error) {
      // 재시도
    }

    // 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Redis connection timeout');
}

/**
 * Docker Compose 서비스 중지
 *
 * @param serviceName - 서비스 이름 (예: 'socketio')
 */
export async function stopDockerService(serviceName: string): Promise<void> {
  console.log(`🛑 Docker 서비스 중지: ${serviceName}`);
  await execAsync(`docker-compose stop ${serviceName}`);
}

/**
 * Docker Compose 서비스 시작
 *
 * @param serviceName - 서비스 이름
 */
export async function startDockerService(serviceName: string): Promise<void> {
  console.log(`▶️  Docker 서비스 시작: ${serviceName}`);
  await execAsync(`docker-compose start ${serviceName}`);

  // 시작 대기
  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Redis 데이터 초기화
 *
 * 테스트 간 상태 격리를 위해 Redis 데이터를 모두 삭제합니다.
 */
export async function flushRedis(): Promise<void> {
  console.log('🗑️  Redis 데이터 초기화');
  await execAsync('docker exec vooster-redis redis-cli FLUSHALL');
}
