param(
  [string]$RemoteName,
  [string]$RemoteUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function FailPush {
  param([Parameter(Mandatory = $true)][string]$Message)
  Write-Host "[pre-push-guard] $Message" -ForegroundColor Red
  exit 1
}

$stdin = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($stdin)) {
  exit 0
}

$allowedMainMap = @{
  "origin" = "release/general"
  "mobile-origin" = "release/mobile"
}

$lines = $stdin -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
foreach ($line in $lines) {
  $parts = $line -split "\s+"
  if ($parts.Count -lt 4) {
    continue
  }

  $localRef = $parts[0]
  $remoteRef = $parts[2]

  if ($localRef -notlike "refs/heads/*" -or $remoteRef -notlike "refs/heads/*") {
    continue
  }

  $localBranch = $localRef.Substring("refs/heads/".Length)
  $remoteBranch = $remoteRef.Substring("refs/heads/".Length)

  if ($remoteBranch -ne "main") {
    continue
  }

  if ($localBranch -eq "develop") {
    FailPush -Message "Direct push from develop to */main is blocked. Use pnpm release:general or pnpm release:mobile."
  }

  if (-not $allowedMainMap.ContainsKey($RemoteName)) {
    FailPush -Message "Push to $RemoteName/main is blocked by policy. Allowed remotes for main: origin, mobile-origin."
  }

  $requiredLocalBranch = $allowedMainMap[$RemoteName]
  if ($localBranch -ne $requiredLocalBranch) {
    FailPush -Message "Push to $RemoteName/main requires local branch '$requiredLocalBranch' (current: '$localBranch')."
  }
}

exit 0
