import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClientReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) redirect('/portal')

  const { data: reports } = await supabase
    .from('diagnostic_reports')
    .select('id, report_title, report_date, report_type, health_score, lab_source')
    .eq('client_id', clientRecord.id)
    .eq('status', 'published')
    .order('report_date', { ascending: false })

  const reportList = (reports ?? []) as {
    id: string
    report_title: string
    report_date: string
    report_type: string
    health_score: number
    lab_source: string
  }[]

  return (
    <div>
      <h1 className="text-2xl text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
        Your Reports
      </h1>
      <p className="text-sm text-grey-muted mb-8">Diagnostic reports shared by your coach</p>

      {reportList.length === 0 ? (
        <div className="bg-navy-card border border-white/8 p-8 text-center">
          <p className="text-grey-muted text-sm">No reports available yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reportList.map(report => (
            <Link
              key={report.id}
              href={`/portal/reports/${report.id}`}
              className="bg-navy-card border border-white/8 hover:border-gold/30 p-5 flex items-center justify-between transition-colors group"
            >
              <div>
                <p className="text-white text-sm font-medium group-hover:text-gold transition-colors">
                  {report.report_title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-grey-muted">
                    {new Date(report.report_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {report.lab_source && (
                    <span className="text-xs text-grey-muted">{report.lab_source}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {report.report_type === 'bloodwork' && report.health_score > 0 && (
                  <span className={`text-lg font-bold ${
                    report.health_score >= 80 ? 'text-green-400' :
                    report.health_score >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {report.health_score}%
                  </span>
                )}
                <span className="text-grey-muted group-hover:text-gold transition-colors text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
