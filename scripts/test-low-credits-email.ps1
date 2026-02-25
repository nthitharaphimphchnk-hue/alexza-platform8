Param(
  [string]$BaseUrl = "https://alexza-platform8.onrenderer.com",
  [string]$AdminKey = "alexza_super_admin_2024_secure_key",
  [string]$UserId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "== Debug routes ==" -ForegroundColor Cyan
$routes = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/_debug/routes" -Headers @{
  "x-admin-key" = $AdminKey
}
$routes | ConvertTo-Json -Depth 8

Write-Host "== Test low credits notification ==" -ForegroundColor Cyan
$body = if ([string]::IsNullOrWhiteSpace($UserId)) { "{}" } else { "{`"userId`":`"$UserId`"}" }
try {
  $result = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/admin/notifications/test-low-credits" -Headers @{
    "x-admin-key" = $AdminKey
  } -ContentType "application/json" -Body $body
  $result | ConvertTo-Json -Depth 8
} catch {
  $response = $_.Exception.Response
  if ($response -and $response.GetResponseStream) {
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host $errorBody -ForegroundColor Yellow
  } else {
    Write-Host $_.Exception.Message -ForegroundColor Yellow
  }
}
