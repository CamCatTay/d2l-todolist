# package-extension.ps1
# Builds a release zip containing only the extension files.
# Tests, dev dependencies, and tooling configs are excluded.
#
# Usage: npm run package
#        -- or --
#        powershell -ExecutionPolicy Bypass -File ./scripts/package-extension.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Read version straight from manifest.json so the zip name is always in sync
$manifest = Get-Content "$PSScriptRoot\..\manifest.json" | ConvertFrom-Json
$version  = $manifest.version
$outFile  = "$PSScriptRoot\..\spark-for-brightspace-v$version.zip"

# Files and folders that belong in the extension package
$include = @(
    "$PSScriptRoot\..\manifest.json",
    "$PSScriptRoot\..\src",
    "$PSScriptRoot\..\styles",
    "$PSScriptRoot\..\icons"
)

# Remove a previous zip with the same name before creating a fresh one
if (Test-Path $outFile) {
    Remove-Item $outFile -Force
    Write-Host "Removed existing $outFile"
}

Compress-Archive -Path $include -DestinationPath $outFile

Write-Host ""
Write-Host "Release package created: spark-for-brightspace-v$version.zip"
