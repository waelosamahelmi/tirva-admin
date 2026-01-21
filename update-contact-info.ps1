# Script to replace contact information in tirva-admin folder
# Updates address and phone number

$rootPath = $PSScriptRoot
if (-not $rootPath) {
    $rootPath = Get-Location
}

Write-Host "Starting contact info update in: $rootPath" -ForegroundColor Green

# File extensions to process
$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.html", "*.css", "*.md", "*.sql", "*.yml", "*.yaml", "*.toml", "*.xml", "*.gradle", "*.properties")

# Folders to exclude
$excludeFolders = @("node_modules", "dist", "build", ".git", "android/build", "android/.gradle", "android/app/build")

# Get all files to process
$files = @()
foreach ($ext in $extensions) {
    $files += Get-ChildItem -Path $rootPath -Filter $ext -Recurse -File | Where-Object {
        $exclude = $false
        foreach ($folder in $excludeFolders) {
            if ($_.FullName -like "*\$folder\*") {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }
}

Write-Host "Found $($files.Count) files to process" -ForegroundColor Cyan

# Order matters - more specific patterns first
$replacements = @(
    @{Old = "Vapaudenkatu 28, 15140"; New = "Pasintie 2, 45410 Utti"}
    @{Old = "Vapaudenkatu 28"; New = "Pasintie 2"}
    @{Old = "15140"; New = "45410"}
    @{Old = "Utti, Finland"; New = "Pasintie 2, 45410 Utti"}
    @{Old = "+358-3-781-2222"; New = "+358-3-589-9089"}
    @{Old = "+358-3781-2222"; New = "+358 41 3152619"}
    @{Old = "+35837812222"; New = "+35835899089"}
    @{Old = "+358 3 781 2222"; New = "+358 41 3152619"}
    @{Old = "+358 50 304 8009"; New = "+358 41 3152619"}
    @{Old = "+358503048009"; New = "+358358990089"}
    @{Old = "050 304 8009"; New = "3 589 9089"}
    @{Old = "3-781-2222"; New = "3-589-9089"}
    @{Old = "3781-2222"; New = "3589-9089"}
    @{Old = "37812222"; New = "35899089"}
)

$totalReplacements = 0

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $fileReplacements = 0
        
        foreach ($replacement in $replacements) {
            $oldValue = $replacement.Old
            $newValue = $replacement.New
            if ($content -match [regex]::Escape($oldValue)) {
                $content = $content -replace [regex]::Escape($oldValue), $newValue
                $fileReplacements++
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            $totalReplacements += $fileReplacements
            Write-Host "Updated: $($file.FullName.Replace($rootPath, '.'))" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Completed! Total replacements: $totalReplacements" -ForegroundColor Green
Write-Host "Files processed: $($files.Count)" -ForegroundColor Green
