Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-ReleaseInfo {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[release] $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

function Get-CurrentBranch {
  $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
  if (-not $branch) {
    throw "Unable to resolve current git branch."
  }

  return $branch
}

function AssertCleanTree {
  param([string[]]$IgnorePatterns = @("^\?\?\s+backups([/\\].*)?$"))

  $statusLines = @(& git status --porcelain)
  if (-not $statusLines -or $statusLines.Count -eq 0) {
    return
  }

  $remaining = @()
  foreach ($line in $statusLines) {
    $ignore = $false
    foreach ($pattern in $IgnorePatterns) {
      if ($line -match $pattern) {
        $ignore = $true
        break
      }
    }

    if (-not $ignore) {
      $remaining += $line
    }
  }

  if ($remaining.Count -gt 0) {
    throw "Working tree must be clean before release. Remaining changes:`n$($remaining -join "`n")"
  }
}

function AssertNoTrackedSecrets {
  $tracked = @(& git ls-files)
  if (-not $tracked -or $tracked.Count -eq 0) {
    return
  }

  $violations = @()
  foreach ($path in $tracked) {
    $normalized = $path -replace "\\", "/"

    $looksLikeEnvSecret = (
      $normalized -match "(^|/)\.env($|\.)" -or
      $normalized -match "(^|/)\.env\.vercel\." -or
      $normalized -match "(^|/)env\.vercel\."
    )

    $isAllowedTemplate = (
      $normalized -match "\.example$" -or
      $normalized -match "\.sample$" -or
      $normalized -match "\.template$"
    )

    if ($looksLikeEnvSecret -and -not $isAllowedTemplate) {
      $violations += $path
    }
  }

  if ($violations.Count -gt 0) {
    throw "Tracked secret-like env files detected (remove from git tracking):`n$($violations -join "`n")"
  }
}

function AssertBranchExists {
  param([Parameter(Mandatory = $true)][string]$BranchName)

  & git show-ref --verify --quiet "refs/heads/$BranchName"
  if ($LASTEXITCODE -ne 0) {
    throw "Local branch '$BranchName' does not exist."
  }
}

function AssertRemoteExists {
  param([Parameter(Mandatory = $true)][string]$RemoteName)

  & git remote get-url $RemoteName | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Git remote '$RemoteName' does not exist."
  }
}

function AssertCurrentBranch {
  param([Parameter(Mandatory = $true)][string]$ExpectedBranch)

  $current = Get-CurrentBranch
  if ($current -ne $ExpectedBranch) {
    throw "Current branch must be '$ExpectedBranch' (current: '$current')."
  }
}

function RunQualityGate {
  Write-ReleaseInfo "Running release quality gate: typecheck -> lint -> tests"

  Invoke-Checked -FilePath "pnpm" -Arguments @("exec", "tsc", "--noEmit", "--incremental", "false")
  Invoke-Checked -FilePath "pnpm" -Arguments @("exec", "eslint", ".", "--quiet")
  Invoke-Checked -FilePath "pnpm" -Arguments @("test:run")
}

function SyncReleaseBranch {
  param(
    [Parameter(Mandatory = $true)][string]$SourceBranch,
    [Parameter(Mandatory = $true)][string]$ReleaseBranch,
    [switch]$DryRun
  )

  if ($DryRun) {
    Write-ReleaseInfo "[dry-run] git branch -f $ReleaseBranch $SourceBranch"
    return
  }

  Invoke-Checked -FilePath "git" -Arguments @("branch", "-f", $ReleaseBranch, $SourceBranch)
  Write-ReleaseInfo "Release branch '$ReleaseBranch' synced to '$SourceBranch'."
}