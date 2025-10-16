@echo off
chcp 65001 > nul
echo.
echo ========================================
echo WSL2 모바일 접근 설정
echo ========================================
echo.
echo 관리자 권한으로 실행 중...
echo.

PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& {Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0setup-mobile-access.ps1""' -Verb RunAs}"

echo.
echo 스크립트 실행이 완료되면 새 창이 닫힙니다.
echo.
pause
