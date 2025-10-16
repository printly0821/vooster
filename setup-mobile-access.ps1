# WSL2 개발 서버에 모바일 접근 설정 스크립트
# 관리자 권한으로 실행 필요

Write-Host "================================" -ForegroundColor Cyan
Write-Host "WSL2 개발 서버 모바일 접근 설정" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. WSL2 IP 주소 가져오기
Write-Host "[1/4] WSL2 IP 주소 확인 중..." -ForegroundColor Yellow
$wslIp = (wsl hostname -I).Trim().Split(' ')[0]
Write-Host "✓ WSL2 IP: $wslIp" -ForegroundColor Green
Write-Host ""

# 2. Windows 호스트 IP 주소 가져오기
Write-Host "[2/4] Windows 호스트 IP 주소 확인 중..." -ForegroundColor Yellow
$hostIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" |
    Where-Object {$_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -eq "Dhcp"} |
    Select-Object -First 1).IPAddress

if (-not $hostIp) {
    $hostIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {$_.IPAddress -match "^192\.168\." -or $_.IPAddress -match "^10\."} |
        Select-Object -First 1).IPAddress
}

Write-Host "✓ Windows 호스트 IP: $hostIp" -ForegroundColor Green
Write-Host ""

# 3. 기존 포트 포워딩 삭제 (있을 경우)
Write-Host "[3/4] 기존 포트 포워딩 규칙 정리 중..." -ForegroundColor Yellow
$existingRule = netsh interface portproxy show v4tov4 | Select-String "3000"
if ($existingRule) {
    netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
    Write-Host "✓ 기존 규칙 삭제 완료" -ForegroundColor Green
} else {
    Write-Host "✓ 기존 규칙 없음" -ForegroundColor Green
}
Write-Host ""

# 4. 새로운 포트 포워딩 추가
Write-Host "[4/4] 새로운 포트 포워딩 규칙 추가 중..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
Write-Host "✓ 포트 포워딩 설정 완료 (0.0.0.0:3000 -> $wslIp:3000)" -ForegroundColor Green
Write-Host ""

# 5. 방화벽 규칙 추가
Write-Host "[5/5] 방화벽 규칙 확인 중..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "WSL2 Next.js Dev Server" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -DisplayName "WSL2 Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow | Out-Null
    Write-Host "✓ 방화벽 규칙 추가 완료" -ForegroundColor Green
} else {
    Write-Host "✓ 방화벽 규칙 이미 존재" -ForegroundColor Green
}
Write-Host ""

# 6. 설정 확인
Write-Host "================================" -ForegroundColor Cyan
Write-Host "설정 완료!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "모바일에서 접속할 주소:" -ForegroundColor Yellow
Write-Host "  http://${hostIp}:3000" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "테스트 페이지:" -ForegroundColor Yellow
Write-Host "  http://${hostIp}:3000/order/MOCK-12345" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "현재 포트 포워딩 규칙:" -ForegroundColor Yellow
netsh interface portproxy show v4tov4
Write-Host ""
Write-Host "주의사항:" -ForegroundColor Red
Write-Host "- PC와 스마트폰이 같은 WiFi 네트워크에 연결되어 있어야 합니다" -ForegroundColor White
Write-Host "- 개발 서버가 실행 중이어야 합니다 (npm run dev)" -ForegroundColor White
Write-Host "- WSL을 재시작하면 이 스크립트를 다시 실행해야 합니다" -ForegroundColor White
Write-Host ""
