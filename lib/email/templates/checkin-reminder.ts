export function buildCheckinReminderHtml(clientName: string, checkinUrl: string): string {
  const firstName = clientName.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Time for your weekly check-in</title>
</head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;text-transform:uppercase;">RuFlo Coaching</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-family:Georgia,serif;">Weekly Check-In Due</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 0 0;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">Hi ${firstName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#d1d5db;">
                Today is your weekly check-in day. Take a few minutes to log your progress — your coach reviews every submission personally.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#d1d5db;">
                Consistent check-ins are one of the biggest factors in long-term results. It only takes 2 minutes.
              </p>
              <a href="${checkinUrl}" style="display:inline-block;background:#c9a84c;color:#0f1623;padding:14px 28px;font-size:13px;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;letter-spacing:1px;">
                SUBMIT CHECK-IN
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:36px 0 0;border-top:1px solid #1e2d42;margin-top:36px;">
              <p style="margin:8px 0 0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">
                You're receiving this because today is your scheduled check-in day. Reply to this email if you have any questions.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
