$content = Get-Content "C:\MFM-APD\services\emailService.js" -Raw
$startIdx = $content.IndexOf("function buildInviteHtml({")
Write-Host "Start: $startIdx"

# Search for various end patterns
$patterns = @(
    "`n`n/**",
    "`n`n`n/**", 
    "`n`n`nfunction ",
    "`n`nfunction ",
    "function getFromAddress",
    "/**",
    "`n`n`n"
)

foreach ($p in $patterns) {
    $idx = $content.IndexOf($p, $startIdx + 10)
    Write-Host "Pattern '$p': $idx"
}

# Show context around start
$context = $content.Substring($startIdx, 200)
Write-Host "Context: $context"