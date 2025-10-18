import type { NextConfig } from 'next';

const nextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },

  // Vercel 배포: .md 파일 추적 설정 (Next.js 15.5+ 최상위 레벨)
  outputFileTracingIncludes: {
    '/api/**/*': ['./docs/**/*', './vooster-docs/**/*'],
    '/app/**/*': ['./docs/**/*', './vooster-docs/**/*'],
  },

  // Webpack 최적화 (개발 서버 성능 개선)
  webpack: (config: any, { dev }: { dev: boolean }) => {
    if (dev) {
      // refractor를 core.js로 강제 리디렉션 (경량화)
      config.resolve.alias = {
        ...config.resolve.alias,
        'refractor$': 'refractor/lib/core.js',
      };
    }
    return config;
  },

  // 외부 패키지 최적화 (Next.js 15.5+ 새 위치)
  serverExternalPackages: ['refractor'],
} satisfies NextConfig;

export default nextConfig;
