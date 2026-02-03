$migrationsDir = "C:\Mahsub-App\supabase\migrations"
$outputFile = "C:\Mahsub-App\supabase\complete_schema_v2.sql"

# Get all .sql files in order
$files = Get-ChildItem -Path $migrationsDir -Filter *.sql | Sort-Object Name

$content = "-- ============================================================================`n"
$content += "-- MAHSUB SYSTEM - COMPLETE SCHEMA & PERFORMANCE OPTIMIZATIONS`n"
$content += "-- Consolidated from 15 migrations`n"
$content += "-- Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$content += "-- ============================================================================`n`n"

foreach ($file in $files) {
    $content += "-- --- START OF MIGRATION: $($file.Name) ---`n"
    $content += Get-Content $file.FullName -Raw
    $content += "`n-- --- END OF MIGRATION: $($file.Name) ---`n`n"
}

$content | Set-Content -Path $outputFile -Encoding utf8
Write-Output "Successfully consolidated 15 migrations into $outputFile"
