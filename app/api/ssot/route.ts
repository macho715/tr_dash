import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * API route to serve option_c.json for client-side MapPanel
 * Reads from data/schedule/option_c_v0.8.0.json (Contract v0.8.0 format)
 */
export async function GET() {
  const root = process.cwd()
  const candidates = [
    path.join(root, 'data', 'schedule', 'option_c_v0.8.0.json'),
    path.join(root, 'tests', 'fixtures', 'option_c_baseline.json'),
    path.join(root, 'option_c.json'),
    path.join(root, 'data', 'schedule', 'option_c.json'),
  ]

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        const raw = await readFile(p, 'utf-8')
        const data = JSON.parse(raw)
        return NextResponse.json(data)
      } catch (e) {
        console.error(`Failed to load SSOT from ${p}:`, e)
      }
    }
  }

  return NextResponse.json(
    { error: 'SSOT file not found' },
    { status: 404 }
  )
}
