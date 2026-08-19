$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw

$startIdx = $content.IndexOf("function buildInviteHtml({")
$endIdx = $content.IndexOf("function getFromAddress", $startIdx)

if ($startIdx -eq -1 -or $endIdx -eq -1) {
    Write-Host "Could not find boundaries"
    exit 1
}

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

$newContent = $before + $newFunc + "`n" + $after
Set-Content -Path "C:\MFM-APD\services\emailService.js" -Value $newContent -Encoding UTF8
Write-Host "Done"