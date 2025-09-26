# Exit script on any error
$ErrorActionPreference = "Stop"

# Idk i was told this is a good thing
Set-Location $env:TEMP

# Resolve script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Compute root directory (two levels up from bin/)
$RootDir = Join-Path $ScriptDir "..\.."
$RootDir = Resolve-Path $RootDir

Write-Host "Root directory detected at $RootDir"

# Remove the directory
if (Test-Path $RootDir) {
    Write-Host "Removing root directory $RootDir..."
    try {
        Remove-Item -Path $RootDir -Recurse -Force
        Write-Host "Root directory removed."
    } catch {
        Write-Warning "Failed to remove some files. You may need to run PowerShell as Administrator."
    }
} else {
    Write-Host "Root directory does not exist. Nothing to remove."
}


# Remove from PATH
$BinDir = Join-Path $RootDir "dist\bin"
$BinFullPath = $BinDir

# Read current user PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

Write-Host $BinDir
Write-Host $BinFullPath
Write-Host $CurrentPath

if ($CurrentPath -like "*$BinFullPath*") {
    Write-Host "Removing $BinFullPath from user PATH..."
    # Remove the entry carefully
    $NewPath = ($CurrentPath -split ';' | Where-Object { $_ -ne $BinFullPath }) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
    Write-Host "$BinFullPath removed from PATH."
    Write-Host "You may need to restart your terminal for PATH changes to take effect."
} else {
    Write-Host "$BinFullPath was not in PATH."
}

Write-Host "Uninstall complete."
