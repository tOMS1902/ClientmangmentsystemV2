import { NextResponse } from 'next/server'
import { getResend } from '@/lib/email/resend'

// DELETE THIS FILE after testing
export async function GET() {
  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'toms1ephens@gmail.com',
      subject: 'RuFlo — Email test',
      html: '<p>Your Resend integration is working correctly.</p>',
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
