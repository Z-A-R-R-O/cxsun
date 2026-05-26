param(
  [string]$IpAddress = "127.0.0.1",
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$domains = @(
  "aaran.codexsun.com",
  "office.codexsun.com",
  "codexsun.com",
  "www.codexsun.com",
  "sriganapathi.codexsun.com",
  "cotton.codexsun.com",
  "cottonknits.codexsun.com",
  "sukraa.codexsun.com",
  "mathan.codexsun.com",
  "polymade.codexsun.com",
  "amaltex.codexsun.com",
  "kgsprinting.codexsun.com",
  "thirumurugan.codexsun.com",
  "smsupvc.codexsun.com",
  "tirupurdirect.codexsun.com",
  "dealodeal.codexsun.com",
  "tenkasisports.codexsun.com",
  "altexlabs.codexsun.com",
  "business.codexsun.com",
  "connect.codexsun.com",
  "codexsun.local",
  "sukraa.local",
  "cotton.local",
  "aaran.local",
  "ganapathi.local",
  "amaltex.local",
  "smsupvc.local",
  "tirupurdirect.local",
  "tenkasisports.local",
  "aaranconnect.local"
)

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$content = if (Test-Path $hostsPath) { Get-Content $hostsPath -Raw } else { "" }
$missing = $domains | Where-Object { $content -notmatch "(?im)^\s*\S+\s+.*\b$([regex]::Escape($_))\b" }

if ($CheckOnly) {
  if ($missing.Count -eq 0) {
    Write-Host "All CXSun local tenant domains are already mapped."
    exit 0
  }

  Write-Host "Missing CXSun local tenant domains:"
  $missing | ForEach-Object { Write-Host "  $IpAddress $_" }
  exit 1
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Error "Run this command in an Administrator PowerShell window: npm run hosts:local"
}

if ($missing.Count -eq 0) {
  Write-Host "All CXSun local tenant domains are already mapped."
  exit 0
}

$block = @(
  "",
  "# CXSun local multi-tenant domains",
  ($missing | ForEach-Object { "$IpAddress $_" }),
  "# End CXSun local multi-tenant domains"
) -join [Environment]::NewLine

Add-Content -Path $hostsPath -Value $block
Write-Host "Added CXSun local tenant domains to $hostsPath"
$missing | ForEach-Object { Write-Host "  $IpAddress $_" }
