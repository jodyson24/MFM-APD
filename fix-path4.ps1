$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw
$content = $content -replace "require\('..\\/utils/templateRenderer'\)", "require('../../utils/templateRenderer')"
Set-Content -Path "C:\MFM-APD\services\emailService.js" -Value $content -Encoding UTF8
Write-Host 'Fixed path'