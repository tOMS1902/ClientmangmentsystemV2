import { NextResponse } from 'next/server'
import { getResend } from '@/lib/email/resend'

// DELETE THIS FILE after testing
export async function GET() {
  const mockSection = `
<div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #1e2d42;">
  <h2 style="margin:0 0 4px;font-size:18px;color:#ffffff;font-family:Georgia,serif;">Callum Test</h2>
  <p style="margin:0 0 16px;font-size:13px;color:#c9a84c;font-family:Arial,sans-serif;">Week 6 Check-in — Callum Test</p>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#d1d5db;">Callum had a solid week overall — weight is trending in the right direction and training compliance was good. Energy dipped slightly mid-week but recovered by the weekend.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td width="48%" style="vertical-align:top;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#c9a84c;font-family:Arial,sans-serif;">FLAGS</p>
        <ul style="margin:0;padding-left:18px;">
          <li style="color:#f87171;margin-bottom:4px;">Energy score dropped to 5 this week</li>
        </ul>
      </td>
      <td width="4%"></td>
      <td width="48%" style="vertical-align:top;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#c9a84c;font-family:Arial,sans-serif;">SUGGESTIONS</p>
        <ul style="margin:0;padding-left:18px;">
          <li style="color:#e5e7eb;margin-bottom:4px;">Prioritise sleep this week — aim for 8 hours</li>
          <li style="color:#e5e7eb;margin-bottom:4px;">Keep protein at target on rest days</li>
        </ul>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="48%" style="background:#1a2332;padding:12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">WIN</p>
        <p style="margin:0;font-size:13px;color:#e5e7eb;font-style:italic;">"Hit all 4 training sessions this week"</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background:#1a2332;padding:12px;vertical-align:top;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">CHALLENGE</p>
        <p style="margin:0;font-size:13px;color:#e5e7eb;font-style:italic;">"Staying on track with nutrition at the weekend"</p>
      </td>
    </tr>
  </table>
</div>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">RUFLO COACHING</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;">Daily Check-In Report</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;">Test — ${new Date().toDateString()}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 24px;font-size:15px;color:#d1d5db;">Hi Coach, here's a summary of today's check-ins.</p>
              ${mockSection}
              <a href="https://clientmangmentsystem-v2.vercel.app/clients" style="display:inline-block;background:#c9a84c;color:#0f1623;padding:12px 24px;font-size:12px;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;letter-spacing:1px;">VIEW ALL CLIENTS</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0;border-top:1px solid #1e2d42;">
              <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Generated automatically by RuFlo AI at end of day.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const resend = getResend()
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'toms1ephens@gmail.com',
      subject: 'RuFlo — Daily Check-In Report (Test)',
      html,
    })
    return NextResponse.json({ ok: true, message: 'Test email sent to toms1ephens@gmail.com' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
