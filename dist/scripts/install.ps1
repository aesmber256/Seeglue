# Resolve script directory
$CurrentDir = (Get-Location).Path

# --- Step 0: Clone or update the GitHub repo ---
$RepoUrl = "https://github.com/aesmber256/Seeglue.git"   # <-- Replace with your repo
$RepoDir = Join-Path $CurrentDir "seeglue"                # Clone here

if (-not (Test-Path $RepoDir)) {
    Write-Host "Cloning repository from $RepoUrl..."
    git clone $RepoUrl $RepoDir
} else {
    Write-Error "Seeglue already exists!"
    exit 1
}

# Compute target directories
$DistDir = Join-Path $RepoDir "dist"
$DenoDir = Join-Path $DistDir "deno"
$BinDir = Join-Path $DistDir "bin"
$ScriptDir = Join-Path $DistDir "scripts"

# Create directories if they don't exist
foreach ($dir in @($DenoDir, $BinDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

# --- Step 1: Download Deno binary ---
$DenoUrl = "https://github.com/denoland/deno/releases/download/v2.5.2/deno-x86_64-pc-windows-msvc.zip"
$DenoZip = Join-Path $DenoDir "deno.zip"

Write-Host "Downloading Deno from $DenoUrl..."
Invoke-WebRequest -Uri $DenoUrl -OutFile $DenoZip

# Extract the ZIP (assumes PowerShell 5+)
Write-Host "Extracting Deno..."
Expand-Archive -LiteralPath $DenoZip -DestinationPath $DenoDir -Force
Remove-Item $DenoZip

# --- Step 2: Move seeglue.cmd into ../bin ---
$SourceCmd = Join-Path $ScriptDir "seeglue.cmd"
$TargetCmd = Join-Path $BinDir "seeglue.cmd"

Write-Host "Moving seeglue.cmd to $BinDir"
Move-Item -Path $SourceCmd -Destination $TargetCmd -Force

# --- Step 3: Add ../bin to user PATH ---
# Expand to absolute path
$BinFullPath = (Resolve-Path $BinDir).Path

# Read current user PATH
$CurrentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

if ($CurrentPath -notlike "*$BinFullPath*") {
    Write-Host "Adding $BinFullPath to user PATH"
    $NewPath = "$CurrentPath;$BinFullPath"
    [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
    Write-Host "You may need to restart your terminal for PATH changes to take effect."
} else {
    Write-Host "$BinFullPath is already in PATH."
}

Write-Host "Setup complete."