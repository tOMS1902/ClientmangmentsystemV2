import { NextResponse } from 'next/server'

// Test endpoint disabled — remove this file before next deployment
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
