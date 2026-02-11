param(
  [string]$SourceBranch = "develop",
  [string]$ReleaseBranch = "release/general",
  [string]$RemoteName = "origin",
  [string]$TargetBranch = "main",
  [switch]$DryRun,
  [switch]$SkipQualityGate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. "$PSScriptRoot/common.ps1"

if ($args -contains "--dry-run") {
  $DryRun = $true
}

if ($args -contains "--skip-quality-gate") {
  $SkipQualityGate = $true
}

AssertRemoteExists -RemoteName $RemoteName
AssertBranchExists -BranchName $SourceBranch
AssertCurrentBranch -ExpectedBranch $SourceBranch
AssertNoTrackedSecrets

if ($DryRun) {
  Write-ReleaseInfo "Dry-run mode: no branch mutation or push will occur."
  Write-ReleaseInfo "[dry-run] Working tree clean check skipped."
} else {
  AssertCleanTree
}

if (-not $SkipQualityGate -and -not $DryRun) {
  RunQualityGate
} elseif ($SkipQualityGate) {
  Write-ReleaseInfo "Quality gate skipped by flag."
} else {
  Write-ReleaseInfo "[dry-run] Quality gate skipped."
}

$currentBranch = Get-CurrentBranch

try {
  SyncReleaseBranch -SourceBranch $SourceBranch -ReleaseBranch $ReleaseBranch -DryRun:$DryRun

  if ($DryRun) {
    Write-ReleaseInfo "[dry-run] git switch $ReleaseBranch"
    Write-ReleaseInfo "[dry-run] git push $RemoteName refs/heads/${ReleaseBranch}:refs/heads/${ReleaseBranch}"
    Write-ReleaseInfo "[dry-run] git push $RemoteName refs/heads/${ReleaseBranch}:refs/heads/${TargetBranch}"
    return
  }

  Invoke-Checked -FilePath "git" -Arguments @("switch", $ReleaseBranch)
  Invoke-Checked -FilePath "git" -Arguments @("push", $RemoteName, "refs/heads/${ReleaseBranch}:refs/heads/${ReleaseBranch}")
  Invoke-Checked -FilePath "git" -Arguments @("push", $RemoteName, "refs/heads/${ReleaseBranch}:refs/heads/${TargetBranch}")

  Write-ReleaseInfo "General release uploaded: $ReleaseBranch -> $RemoteName/$TargetBranch"
}
finally {
  if (-not $DryRun) {
    $branchAfter = Get-CurrentBranch
    if ($branchAfter -ne $currentBranch) {
      Invoke-Checked -FilePath "git" -Arguments @("switch", $currentBranch)
    }
  }
}
