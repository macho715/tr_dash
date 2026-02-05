export function Footer() {
  const buildEnv = process.env.VERCEL_ENV ?? "development"
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7)
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? ""

  return (
    <footer className="text-center text-xs text-slate-500 py-6 border-t border-accent/15 mt-4">
      <p className="font-semibold text-slate-400">HVDC TR Transport Project</p>
      <p className="mt-1">
        Samsung C&T × Mammoet | LCT BUSHRA | Option C Confirmed | Generated: January
        21, 2026 | AGI Site Destination
      </p>
      <p className="mt-2 text-slate-600" title="Build stamp: ENV / Git SHA / Deployment ID">
        ENV: {buildEnv}
        {buildSha && ` | SHA: ${buildSha}`}
        {deploymentId && ` | Deployed: ${deploymentId.slice(0, 8)}`}
      </p>
    </footer>
  )
}
