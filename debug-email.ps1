$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw
$startIdx = $content.IndexOf("function buildInviteHtml({")
Write-Host "Start: $startIdx"
$searchStart = $startIdx + 50
$endIdx = $content.IndexOf("`n`n/**", $startIdx)
Write-Host "End1: $endIdx"
if ($endIdx -eq -1) { $endIdx = $content.IndexOf("`n`n`n/**", $startIdx) }
Write-Host "End2: $endIdx"
if ($endIdx -eq -1) { $endIdx = $content.IndexOf("`n`n`nfunction ", $startIdx) }
Write-Host "End3: $endIdx"
if ($endIdx -ne -1) {
    Write-Host "Found end at: $endIdx"
    $context = $content.Substring($startIdx, $endIdx - $startIdx + 50)
    Write-Host "Context: $context"
}