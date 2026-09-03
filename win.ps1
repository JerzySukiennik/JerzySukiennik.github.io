# gzowo.fun/win.ps1 - step 2: enable OpenSSH server + install Mac key.
# Run in Terminal (Admin):  irm gzowo.fun/win.ps1 | iex
$ErrorActionPreference = "Continue"
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host "Open Terminal as ADMIN (Win+X -> Terminal (Admin)) and run again." -ForegroundColor Red; return }

Write-Host "[1/6] Installing OpenSSH Server (takes a minute)..." -ForegroundColor Cyan
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null

Write-Host "[2/6] Starting sshd service..." -ForegroundColor Cyan
Set-Service sshd -StartupType Automatic
Start-Service sshd

Write-Host "[3/6] PowerShell as default SSH shell..." -ForegroundColor Cyan
New-Item -Path "HKLM:\SOFTWARE\OpenSSH" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force | Out-Null

Write-Host "[4/6] Installing Mac SSH key..." -ForegroundColor Cyan
$key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIztAuHHEkQt2+Kmiw716xm6IR98/9+y0hzXIPipZy71 brain-main-mac"
$f = "C:\ProgramData\ssh\administrators_authorized_keys"
Set-Content -Path $f -Value $key -Encoding ascii
icacls $f /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null
Restart-Service sshd

Write-Host "[5/6] Firewall + private network..." -ForegroundColor Cyan
Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private
if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
}

Write-Host "[6/6] No sleep while plugged in..." -ForegroundColor Cyan
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" }).IPAddress
Write-Host "`nDONE. Laptop IP: $ip" -ForegroundColor Green
Write-Host "Tell Claude: done + $ip"
