# Vercel production deploy (requires VERCEL_TOKEN in .env.vercel)
# Get token: https://vercel.com/account/tokens
# Create .env.vercel with one line: VERCEL_TOKEN=your_token_here
# By default blocks deploy if there are uncommitted changes or commits not pushed to origin/main. Use -Force to skip (emergency only).

param([switch]$Force)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $Force) {
    $porcelain = git status --porcelain 2>$null
    if ($porcelain) {
        Write-Host "ERROR: There are uncommitted changes. Commit and push to main first, then deploy. Or use -Force to skip (emergency only)."
        exit 1
    }
    git fetch origin 2>$null
    $originMain = git rev-parse --verify origin/main 2>$null
    if ($originMain) {
        $ahead = git rev-list --count origin/main..HEAD 2>$null
        if ($ahead -and [int]$ahead -gt 0) {
            Write-Host "ERROR: Local branch is ahead of origin/main ($ahead commit(s)). Push to main first, then deploy. Or use -Force to skip (emergency only)."
            exit 1
        }
    }
}

$envFile = Join-Path $root ".env.vercel"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*VERCEL_TOKEN\s*=\s*(.+)\s*$') {
            $env:VERCEL_TOKEN = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}
if (-not $env:VERCEL_TOKEN) {
    Write-Host "ERROR: .env.vercel not found or VERCEL_TOKEN missing. Create .env.vercel with: VERCEL_TOKEN=your_token"
    Write-Host "Get token: https://vercel.com/account/tokens"
    exit 1
}
# Run vercel from project root so it finds .vercel/project.json (avoids "Downloads" / "---" project name on Windows)
$rootQuoted = "`"$root`""
& cmd /c "cd /d $rootQuoted && npx vercel --prod --yes"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Vercel deployment failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
