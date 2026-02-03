# Script to display migration SQL for copy-paste to Supabase
# Run this script to see the SQL you need to run in Supabase SQL Editor

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Receipt Viewer Fix - Database Migration" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Add receipt columns to transactions table" -ForegroundColor Yellow
Write-Host "Copy and paste this SQL into your Supabase SQL Editor:" -ForegroundColor White
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Gray

Get-Content "supabase\migrations\20260202_add_receipt_columns.sql"

Write-Host "---------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "STEP 2 (Optional): Migrate existing receipt data" -ForegroundColor Yellow
Write-Host "If you have existing transactions with receipts, run this:" -ForegroundColor White
Write-Host ""
Write-Host "---------------------------------------------------" -ForegroundColor Gray

Get-Content "supabase\migrations\20260202_migrate_existing_receipts.sql"

Write-Host "---------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "After running these migrations:" -ForegroundColor Green
Write-Host "1. Reload your app" -ForegroundColor White
Write-Host "2. Open any transaction with a receipt" -ForegroundColor White
Write-Host "3. Click on the receipt preview to view it" -ForegroundColor White
Write-Host ""
Write-Host "Documentation: docs\receipt-viewer-fix-ar.md" -ForegroundColor Cyan
Write-Host ""
