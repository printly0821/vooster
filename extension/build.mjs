/**
 * Chrome Extension 빌드 스크립트
 *
 * esbuild를 사용하여 Service Worker를 번들링합니다
 */

import esbuild from 'esbuild';
import { execSync } from 'child_process';

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

// 1. TypeScript 타입 체크
console.log('🔍 TypeScript 타입 체크 중...');
try {
  execSync('tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ 타입 체크 통과\n');
} catch (error) {
  console.error('✗ 타입 체크 실패');
  process.exit(1);
}

// 2. esbuild 설정
const commonOptions = {
  bundle: true,
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
  },
};

const buildOptions = [
  {
    ...commonOptions,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/service-worker.js',
  },
  {
    ...commonOptions,
    entryPoints: ['src/options/index.tsx'],
    outfile: 'dist/options.js',
  },
];

// 3. 빌드 실행
async function build() {
  try {
    if (isWatch) {
      console.log('🔄 Watch 모드 시작...\n');
      const contexts = await Promise.all(buildOptions.map(opt => esbuild.context(opt)));
      await Promise.all(contexts.map(ctx => ctx.watch()));
      console.log('👀 파일 변경 감지 중...');
    } else {
      console.log('📦 빌드 시작...\n');
      await Promise.all(buildOptions.map(opt => esbuild.build(opt)));
      console.log('✓ 빌드 완료');
    }
  } catch (error) {
    console.error('✗ 빌드 실패:', error);
    process.exit(1);
  }
}

build();
