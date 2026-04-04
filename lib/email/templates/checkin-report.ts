interface ReportData {
  headline: string
  summary: string
  flags: string[]
  clientWords: {
    biggestWin: string
    mainChallenge: string
  }
  suggestions: string[]
}

export function buildCheckinReportHtml(data: ReportData, clientPageUrl: string): string {
  const flagsHtml = data.flags.length
    ? data.flags.map(f => `<li style="margin-bottom:6px;color:#f87171;">${f}</li>`).join('')
    : '<li style="color:#9ca3af;">No major flags this week.</li>'

  const suggestionsHtml = data.suggestions
    .map(s => `<li style="margin-bottom:8px;color:#e5e7eb;">${s}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.headline}</title>
</head>
<body style="margin:0;padding:0;background:#0f1623;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1623;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #c9a84c;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;text-transform:uppercase;">RuFlo Coaching</p>
              <h1 style="margin:0;font-size:24px;color:#ffffff;font-family:Georgia,serif;">${data.headline}</h1>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">SUMMARY</p>
              <p style="margin:8px 0 0;font-size:15px;line-height:1.7;color:#d1d5db;">${data.summary}</p>
            </td>
          </tr>

          <!-- Flags -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">KEY FLAGS</p>
              <ul style="margin:8px 0 0;padding-left:20px;">
                ${flagsHtml}
              </ul>
            </td>
          </tr>

          <!-- Client's Words -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">CLIENT'S WORDS</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="background:#1a2332;padding:16px;vertical-align:top;">
                    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">BIGGEST WIN</p>
                    <p style="margin:0;font-size:14px;color:#e5e7eb;font-style:italic;">"${data.clientWords.biggestWin}"</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#1a2332;padding:16px;vertical-align:top;">
                    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">MAIN CHALLENGE</p>
                    <p style="margin:0;font-size:14px;color:#e5e7eb;font-style:italic;">"${data.clientWords.mainChallenge}"</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Coaching Suggestions -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;color:#c9a84c;font-family:Arial,sans-serif;">COACHING SUGGESTIONS</p>
              <ul style="margin:8px 0 0;padding-left:20px;">
                ${suggestionsHtml}
              </ul>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 0 0;">
              <a href="${clientPageUrl}" style="display:inline-block;background:#c9a84c;color:#0f1623;padding:12px 24px;font-size:13px;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;letter-spacing:1px;">VIEW CLIENT PROFILE</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0;border-top:1px solid #1e2d42;margin-top:32px;">
              <p style="margin:8px 0 0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">This report was generated automatically by RuFlo AI after your client submitted their weekly check-in.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
