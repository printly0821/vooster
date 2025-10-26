export default {
  projects: [
    // 메인 프로젝트 (Next.js / React)
    {
      displayName: 'client',
      testEnvironment: 'happy-dom',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)', '<rootDir>/src/**/*.test.ts?(x)'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    // Socket.IO 서버
    {
      displayName: 'server',
      testEnvironment: 'node',
      preset: 'ts-jest',
      rootDir: '<rootDir>/server',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              module: 'ES2020',
              target: 'ES2020',
            },
          },
        ],
      },
    },
  ],
};
