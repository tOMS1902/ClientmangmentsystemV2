interface ConsentSummary {
  bloodwork: string
  genetics: string
  photoStorage: string
  photoMarketing: string
}

export function buildClientConfirmationHtml(
  name: string,
  email: string,
  signedAt: string,
  consents: ConsentSummary,
): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Onboarding Complete</title></head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;text-transform:uppercase;">The Legal Edge</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-family:Georgia,serif;">Onboarding Complete</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 0 0;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">
              Thank you for completing your legal onboarding documentation. Your signed agreement has been recorded.
            </p>
            <table width="100%" cellpadding="12" cellspacing="0" style="background:#0a1628;border:1px solid rgba(200,168,76,0.2);margin-bottom:24px;">
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 4px;font-size:11px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Signed</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${signedAt}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 4px;font-size:11px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Bloodwork Review</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.bloodwork}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 4px;font-size:11px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Genetic Testing</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.genetics}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 4px;font-size:11px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Progress Photos</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.photoStorage}</p>
              </td></tr>
              <tr><td>
                <p style="margin:0 0 4px;font-size:11px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Marketing Use of Photos</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.photoMarketing}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#9ca3af;">
              To request a copy of your full submission or to exercise your GDPR/CCPA rights (access, erasure, portability), please email <a href="mailto:calumfraserfitness@gmail.com" style="color:#c9a84c;">calumfraserfitness@gmail.com</a>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 0 0;border-top:1px solid #1e2d42;">
            <p style="margin:0;font-size:11px;color:#6b7280;font-family:Arial,sans-serif;">
              The Legal Edge · Calum Fraser · Galway, Ireland · calumfraserfitness@gmail.com<br>
              GDPR &amp; CCPA Compliant · Electronic signature valid under Electronic Commerce Act 2000 (Ireland)
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildCoachNotificationHtml(
  clientName: string,
  clientEmail: string,
  signedAt: string,
  country: string,
  parqYesCount: number,
  consents: ConsentSummary,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Client Onboarding</title></head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;text-transform:uppercase;">The Legal Edge — Coach Alert</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-family:Georgia,serif;">New Client Onboarded</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 0 0;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#d1d5db;">
              <strong style="color:#ffffff;">${clientName}</strong> has completed their legal onboarding.
            </p>
            <table width="100%" cellpadding="10" cellspacing="0" style="background:#0a1628;border:1px solid rgba(200,168,76,0.2);margin-bottom:24px;">
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Email</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${clientEmail}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Country</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${country}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Signed At</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${signedAt}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">PAR-Q YES Answers</p>
                <p style="margin:0;font-size:14px;color:${parqYesCount > 0 ? '#f59e0b' : '#10b981'};">${parqYesCount > 0 ? `⚠ ${parqYesCount} YES answer${parqYesCount > 1 ? 's' : ''} — review health details in dashboard` : '✓ All clear'}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Bloodwork Consent</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.bloodwork}</p>
              </td></tr>
              <tr><td style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Genetics Consent</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">${consents.genetics}</p>
              </td></tr>
              <tr><td>
                <p style="margin:0 0 2px;font-size:10px;color:#c9a84c;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Photos</p>
                <p style="margin:0;font-size:14px;color:#ffffff;">Storage: ${consents.photoStorage} · Marketing: ${consents.photoMarketing}</p>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af;">View the full submission in the client dashboard under the Legal tab.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
