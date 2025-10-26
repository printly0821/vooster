# 배포 가이드 (T-009)

실시간 서버의 배포, 자동화, 모니터링 설정 가이드입니다.

## 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [Docker 이미지 빌드](#docker-이미지-빌드)
3. [Docker Compose로 실행](#docker-compose로-실행)
4. [PM2로 프로세스 관리](#pm2로-프로세스-관리)
5. [Nginx 프록시 설정](#nginx-프록시-설정)
6. [CI/CD 파이프라인](#cicd-파이프라인)
7. [모니터링 및 헬스체크](#모니터링-및-헬스체크)
8. [트러블슈팅](#트러블슈팅)

---

## 로컬 개발 환경

### 1. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 다음 변수를 설정하세요:
NODE_ENV=development
PORT=3001
SOCKET_JWT_SECRET=dev-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
```

### 2. 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 모드
npm run dev

# 또는 PM2로 실행
npm install -g pm2
pm2 start ecosystem.config.js --env development
pm2 logs
```

---

## Docker 이미지 빌드

### 1. 이미지 빌드

```bash
# 기본 빌드
docker build -t barcode-app:latest .

# 태그 지정
docker build -t barcode-app:v1.0.0 .
docker build -t barcode-app:$(date +%Y%m%d) .
```

### 2. 이미지 검증

```bash
# 이미지 정보 확인
docker inspect barcode-app:latest

# 레이어 확인
docker history barcode-app:latest

# 보안 스캔 (Trivy 필요)
trivy image barcode-app:latest
```

---

## Docker Compose로 실행

### 1. 시작

```bash
# 구성 파일 검증
docker-compose config

# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f realtime-server
docker-compose logs -f nginx-proxy
```

### 2. 상태 확인

```bash
# 실행 중인 컨테이너
docker-compose ps

# 헬스체크 상태
docker-compose ps --no-trunc
```

### 3. 서비스 관리

```bash
# 서비스 재시작
docker-compose restart realtime-server

# 서비스 업데이트
docker-compose pull realtime-server
docker-compose up -d realtime-server

# 종료
docker-compose down

# 정리 (볼륨 제거)
docker-compose down -v
```

---

## PM2로 프로세스 관리

### 1. PM2 설치

```bash
npm install -g pm2
pm2 install pm2-logrotate
pm2 install pm2-auto-pull
```

### 2. 시작

```bash
# ecosystem.config.js로 시작
pm2 start ecosystem.config.js

# 프로덕션 환경
pm2 start ecosystem.config.js --env production

# 자동 시작 설정
pm2 startup
pm2 save
```

### 3. 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 프로세스 목록
pm2 list

# 상세 정보
pm2 show realtime-server

# 로그 확인
pm2 logs
pm2 logs realtime-server --lines 100
```

### 4. 재시작 정책

```bash
# 프로세스 재시작
pm2 restart all
pm2 reload all  # 무중단 재시작 (클러스터 모드)

# 프로세스 중지
pm2 stop realtime-server
pm2 delete realtime-server

# 메모리 초과 시 자동 재시작
# ecosystem.config.js의 max_memory_restart 설정 참조
```

---

## Nginx 프록시 설정

### 1. SSL/TLS 인증서

#### 개발 환경 (자체 서명 인증서)

```bash
mkdir -p certs

# 자체 서명 인증서 생성 (10년 유효)
openssl req -new -newkey rsa:4096 -days 3650 -nodes \
  -x509 -keyout certs/server.key -out certs/server.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/CN=localhost"
```

#### 프로덕션 환경 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot certonly --standalone -d app.example.com

# 자동 갱신
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 2. Nginx 설정 검증

```bash
# 설정 문법 검사
docker-compose exec nginx-proxy nginx -t

# 설정 다시 로드 (무중단)
docker-compose exec nginx-proxy nginx -s reload
```

### 3. Nginx 로그 모니터링

```bash
# 접근 로그
docker-compose logs -f nginx-proxy

# 에러 확인
docker-compose logs nginx-proxy --tail 50
```

---

## CI/CD 파이프라인

### 1. GitHub Actions 워크플로우

워크플로우 파일: `.github/workflows/docker-build-and-deploy.yml`

#### 시크릿 설정

GitHub 저장소 Settings → Secrets and variables에서 다음을 설정하세요:

```
DOCKER_USERNAME: your-docker-hub-username
DOCKER_PASSWORD: your-docker-hub-password (또는 Personal Access Token)
GITHUB_TOKEN: 자동으로 생성됨
SSH_KEY: 배포 서버 SSH 프라이빗 키
```

#### 트리거 조건

- `main` 또는 `master` 브랜치로 push
- `develop` 브랜치로 push
- 태그 푸시 (v1.0.0 등)
- Pull Request

### 2. Docker Hub에 이미지 푸시

```bash
# 로컬에서 푸시
docker tag barcode-app:latest yourusername/barcode-app:latest
docker push yourusername/barcode-app:latest

# GitHub Actions가 자동으로 처리됨
```

---

## 모니터링 및 헬스체크

### 1. 헬스체크 엔드포인트

```bash
# 기본 헬스체크 (Next.js)
curl http://localhost:3000/health

# 실시간 서버 헬스체크
curl http://localhost:3001/health

# Nginx를 통한 헬스체크
curl https://localhost/healthz
```

### 2. 응답 예시

```json
{
  "status": "ok",
  "timestamp": "2025-10-22T12:00:00Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 50000000,
    "heapTotal": 100000000,
    "rss": 150000000
  }
}
```

### 3. 모니터링 도구

#### PM2 Plus (선택사항)

```bash
pm2 plus  # PM2 Plus 활성화
```

#### Prometheus + Grafana (선택사항)

docker-compose.yml의 주석을 제거하고 다음을 설정하세요:

```bash
# prometheus.yml 생성
# Grafana 대시보드 설정
```

---

## 트러블슈팅

### 1. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs realtime-server

# 사용 포트 확인
lsof -i :3001

# 포트 해제 후 재시작
sudo kill -9 <PID>
docker-compose restart realtime-server
```

### 2. WebSocket 연결 실패

```bash
# Nginx 로그 확인
docker-compose logs nginx-proxy

# WebSocket 헤더 확인
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3001/socket.io
```

### 3. 메모리 부족

```bash
# 메모리 사용량 확인
docker-compose stats

# 컨테이너 리스타트
docker-compose restart realtime-server

# ecosystem.config.js에서 max_memory_restart 조정
```

### 4. SSL/TLS 오류

```bash
# 인증서 확인
openssl x509 -in certs/server.crt -text -noout

# 인증서 만료 확인
openssl x509 -in certs/server.crt -noout -dates

# Nginx SSL 설정 검증
docker-compose exec nginx-proxy openssl s_client -connect localhost:443
```

---

## 배포 체크리스트

배포 전에 다음을 확인하세요:

- [ ] 모든 환경변수 설정
- [ ] SSL/TLS 인증서 설치
- [ ] Docker 이미지 빌드 및 테스트
- [ ] docker-compose 설정 검증
- [ ] Nginx 설정 문법 확인
- [ ] 헬스체크 엔드포인트 작동 확인
- [ ] 로그 로테이션 설정
- [ ] 모니터링 도구 설정
- [ ] 백업 계획 수립
- [ ] 롤백 절차 준비

---

## 참고 자료

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [PM2 문서](https://pm2.keymetrics.io/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
