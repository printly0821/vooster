# 다단계 빌드: 의존성 설치
FROM node:22-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 다단계 빌드: 개발 의존성으로 빌드
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Next.js 빌드
RUN npm run build
# 서버 빌드
RUN npm run server:build

# 최종 이미지: 실행 환경
FROM node:22-slim

# 보안: 메타데이터 설정
LABEL maintainer="barcode-app@example.com"
LABEL version="1.0"
LABEL description="Barcode Order Inquiry App - Production Image"

# 작업 디렉토리
WORKDIR /app

# 보안: 비루트 사용자 생성 및 전환
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

# 다단계 빌드에서 프로덕션 의존성 복사
COPY --from=dependencies /app/node_modules ./node_modules

# 빌드된 파일 및 소스 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# 로그 디렉토리 생성
RUN mkdir -p ./logs && chown -R nodeuser:nodeuser /app

# 소유권 변경 (보안)
RUN chown -R nodeuser:nodeuser /app

# 비루트 사용자로 전환
USER nodeuser

# 포트 노출
EXPOSE 3000 3001

# 헬스체크 (T-009)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 시작 명령어
# PM2를 사용하는 경우: npm install -g pm2 && pm2-runtime start ecosystem.config.js
# 직접 실행하는 경우:
CMD ["node", "--expose-gc", "--max-old-space-size=1024", "server/dist/index.js"]
