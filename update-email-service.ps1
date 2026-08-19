$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw

# Replace the entire buildInviteHtml function with the new one
# Find the function start
$startIdx = $content.IndexOf("function buildInviteHtml({")
if ($startIdx -eq -1) { Write-Host "Function not found"; exit 1 }

# Find the end of the function (next function or section)
$searchStart = $startIdx + 50
$endIdx = $content.IndexOf("`n`n/**", $startIdx)
if ($endIdx -eq -1) { $endIdx = $content.IndexOf("`n`n`n/**", $startIdx) }
if ($endIdx -eq -1) { $endIdx = $content.IndexOf("`n`n`nfunction ", $startIdx) }

if ($endIdx -eq -1) { Write-Host "Could not find end of function"; exit 1 }

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newFunc = @"
function buildInviteHtml({
  name,
  link,
}) {
  return renderInviteEmail({ name, link });
}

"@

$newContent = $before + $newFunc + "`n" + $content.Substring($endIdx)
Set-Content -Path "C:\MFM-APD\services\emailService.js" -Value $newContent -Encoding UTF8
Write-Host "Done"