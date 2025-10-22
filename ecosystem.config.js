/**
 * PM2 Ecosystem Configuration
 * 실시간 서버 및 Next.js 앱 프로세스 관리 (T-009)
 */

module.exports = {
  apps: [
    /**
     * 실시간 통신 서버 (Socket.IO)
     * 클러스터 모드로 멀티 코어 활용
     */
    {
      name: 'realtime-server',
      script: './server/dist/index.js',
      instances: 'max', // CPU 코어 수만큼 프로세스 생성
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 재시작 정책
      max_memory_restart: '512M', // 512MB 초과 시 재시작
      max_restarts: 10, // 1시간 내 10회 이상 재시작 실패 시 멈춤
      min_uptime: '10s', // 10초 이상 실행되어야 카운트
      listen_timeout: 10000,
      kill_timeout: 5000,

      // 로깅
      output: './logs/realtime-server.log',
      error: './logs/realtime-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 자동 재시작
      autorestart: true,
      watch: false, // 프로덕션에서는 비활성화
      ignore_watch: ['node_modules', 'logs', '.git'],

      // 메트릭
      instance_var: 'INSTANCE_ID',
      merge_logs: true, // 여러 프로세스의 로그를 하나의 파일로
    },

    /**
     * Next.js 앱 (브라우저 서빙)
     * 단일 프로세스로 실행 (Next.js 자체가 최적화됨)
     */
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      autorestart: true,
      watch: false,

      output: './logs/nextjs-app.log',
      error: './logs/nextjs-app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],

  /**
   * 모니터링 및 로그 설정
   */
  monitor: {
    monitoring_interval: 5000,
  },

  deploy: {
    production: {
      user: 'node',
      host: 'your-production-server.com',
      ref: 'origin/master',
      repo: 'git@github.com:your-org/barcode-app.git',
      path: '/var/www/barcode-app',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
    staging: {
      user: 'node',
      host: 'your-staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/barcode-app.git',
      path: '/var/www/barcode-app-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
