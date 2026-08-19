$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw
$old = "require('../utils/templateRenderer')"
$new = "require('../../utils/templateRenderer')"
$content = $content.Replace($old, $new)
Set-Content -Path "C:\MFM-APD\services\emailService.js" -Value $content -Encoding UTF8
Write-Host "Done"