#!/bin/bash

# Next.js 개발 서버 프로세스 정리 스크립트

echo "🧹 Next.js 개발 서버 프로세스 정리 중..."
echo ""

# 실행 중인 프로세스 확인
PROCESS_COUNT=$(ps aux | grep -E "next-server|next dev" | grep -v grep | wc -l)

if [ "$PROCESS_COUNT" -eq 0 ]; then
    echo "✓ 실행 중인 Next.js 프로세스가 없습니다."
else
    echo "⚠ $PROCESS_COUNT 개의 Next.js 프로세스 발견"
    echo ""

    # 프로세스 목록 출력
    echo "종료할 프로세스 목록:"
    ps aux | grep -E "next-server|next dev" | grep -v grep | awk '{print "  PID:", $2, "| CMD:", $11, $12, $13}'
    echo ""

    # 프로세스 종료
    echo "프로세스 종료 중..."
    ps aux | grep -E "next-server|next dev" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
    sleep 1

    echo "✓ 모든 프로세스 종료 완료"
fi

echo ""
echo "포트 상태 확인:"
for port in 3000 3001 3002 3003 3004 3005 3006 3007; do
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "  ⚠ 포트 $port: 사용 중"
    else
        echo "  ✓ 포트 $port: 사용 가능"
    fi
done

echo ""
echo "✅ 정리 완료! 이제 'npm run dev'를 실행하세요."
