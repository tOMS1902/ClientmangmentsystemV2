import { NextRequest, NextResponse } from 'next/server'

const SENTRY_HOST = 'o4511133792272384.ingest.de.sentry.io'
const SENTRY_PROJECT_ID = '4511133804331088'

export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text()
    const header = envelope.split('\n')[0]
    const { dsn } = JSON.parse(header)

    const url = new URL(dsn)
    if (url.hostname !== SENTRY_HOST) {
      return NextResponse.json({ error: 'Invalid DSN' }, { status: 400 })
    }

    const projectId = url.pathname.replace('/', '')
    if (projectId !== SENTRY_PROJECT_ID) {
      return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
    }

    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`
    const res = await fetch(sentryUrl, {
      method: 'POST',
      body: envelope,
    })

    return new NextResponse(res.body, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 })
  }
}
