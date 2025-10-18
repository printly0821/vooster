import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

  // Webpack 최적화 (개발 서버 성능 개선)
  webpack: (config, { dev }) => {
    if (dev) {
      // refractor를 core.js로 강제 리디렉션 (경량화)
      config.resolve.alias = {
        ...config.resolve.alias,
        'refractor$': 'refractor/lib/core.js',
      };
    }
    return config;
  },

  // 실험적 기능: 외부 패키지 최적화
  experimental: {
    serverComponentsExternalPackages: ['refractor'],
  },
};

export default nextConfig;
