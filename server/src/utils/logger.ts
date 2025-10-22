/**
 * Pino 기반 로거 설정
 */

import pino from 'pino';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 환경에 맞는 로거를 생성합니다.
 */
export function createLogger(logLevel: LogLevel = 'info'): pino.Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const logger = pino(
    {
      level: logLevel,
    },
    isDevelopment
      ? pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        })
      : undefined
  );

  return logger;
}

/**
 * 기본 로거 인스턴스
 */
export const logger = createLogger();
