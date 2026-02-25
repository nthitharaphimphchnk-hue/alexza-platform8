Param(
  [string]$BaseUrl = "https://alexza-platform8.onrenderer.com",
  [string]$AdminKey = "alexza_super_admin_2024_secure_key"
)

$ErrorActionPreference = "Stop"

Write-Host "== Check debug routes ==" -ForegroundColor Cyan
$routesResponse = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/_debug/routes" -Headers @{
  "x-admin-key" = $AdminKey
}
$routesResponse | ConvertTo-Json -Depth 8

$required = @(
  "POST /api/admin/billing/cron/reset-monthly",
  "POST /api/admin/billing/force-reset-due"
)

foreach ($route in $required) {
  $present = $routesResponse.routes -contains $route
  if (-not $present) {
    Write-Host "Missing required route: $route" -ForegroundColor Yellow
  } else {
    Write-Host "Found route: $route" -ForegroundColor Green
  }
}

Write-Host "== Trigger cron reset endpoint ==" -ForegroundColor Cyan
$resetResponse = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/admin/billing/cron/reset-monthly" -Headers @{
  "x-admin-key" = $AdminKey
}
$resetResponse | ConvertTo-Json -Depth 8
