$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw
$idx = $content.IndexOf("templateRenderer")
Write-Host "Idx: $idx"
if ($idx -ge 0) {
    Write-Host $content.Substring($idx - 30, 50)
}