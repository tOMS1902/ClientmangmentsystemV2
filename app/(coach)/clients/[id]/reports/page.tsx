import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Client, DiagnosticReport } from '@/lib/types'

export default async function ReportsListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: client }, { data: reports }] = await Promise.all([
    supabase.from('clients').select('id, full_name').eq('id', id).single<Pick<Client, 'id' | 'full_name'>>(),
    supabase
      .from('diagnostic_reports')
      .select('*')
      .eq('client_id', id)
      .order('report_date', { ascending: false }),
  ])

  const reportList = (reports as DiagnosticReport[] | null) ?? []

  return (
    <div style={{ maxWidth: 900, padding: '0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <Link href={`/clients/${id}`} style={{ fontSize: 12, color: '#8A9AB8', textDecoration: 'none' }}>
            ← {client?.full_name ?? 'Client'}
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#E8F0FC', marginTop: 8, fontFamily: 'var(--font-display)' }}>
            Diagnostic Reports
          </h1>
        </div>
        <Link
          href={`/clients/${id}/reports/new`}
          style={{
            backgroundColor: '#3ECF8E', color: '#0A1E10', fontWeight: 600, fontSize: 13,
            padding: '10px 18px', borderRadius: 8, textDecoration: 'none', display: 'inline-block',
          }}
        >
          + New Report
        </Link>
      </div>

      {reportList.length === 0 ? (
        <div style={{
          backgroundColor: '#0F1827', border: '1px solid #1A2A40', borderRadius: 12,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: '#8A9AB8', marginBottom: 16 }}>No reports yet for this client.</div>
          <Link
            href={`/clients/${id}/reports/new`}
            style={{ color: '#3ECF8E', fontSize: 13, textDecoration: 'none' }}
          >
            Create the first report →
          </Link>
        </div>
      ) : (
        <div style={{ backgroundColor: '#0F1827', border: '1px solid #1A2A40', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px 80px 120px',
            padding: '10px 20px', borderBottom: '1px solid #1A2A40',
            fontSize: 10, fontWeight: 600, color: '#4A5A7A', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>Report</span><span>Type</span><span>Date</span><span>Lab</span><span>Score</span><span>Actions</span>
          </div>

          {reportList.map((report, i) => (
            <div
              key={report.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px 80px 120px',
                padding: '14px 20px',
                borderBottom: i < reportList.length - 1 ? '1px solid #1A2A40' : 'none',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E8F0FC' }}>{report.report_title}</div>
                <div style={{ fontSize: 11, color: '#4A5A7A', marginTop: 2 }}>{report.lab_source}</div>
              </div>
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  backgroundColor: report.report_type === 'genetics' ? '#1a1040' : '#0A1E10',
                  color: report.report_type === 'genetics' ? '#a78bfa' : '#3ECF8E',
                  border: `1px solid ${report.report_type === 'genetics' ? '#4c2a8a' : '#1A4A2E'}`,
                }}>
                  {report.report_type === 'genetics' ? 'Genetics' : 'Bloodwork'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#C8D4E8' }}>
                {new Date(report.report_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 12, color: '#8A9AB8' }}>{report.lab_source || '—'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: report.health_score >= 80 ? '#3ECF8E' : report.health_score >= 60 ? '#FBBF24' : '#F87171' }}>
                {report.report_type === 'bloodwork' ? `${report.health_score}` : '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase',
                  backgroundColor: report.status === 'published' ? '#0A1E10' : '#1A1A2E',
                  color: report.status === 'published' ? '#3ECF8E' : '#8A9AB8',
                  border: `1px solid ${report.status === 'published' ? '#1A4A2E' : '#2A2A4A'}`,
                }}>
                  {report.status}
                </span>
                <Link
                  href={`/clients/${id}/reports/${report.id}/edit`}
                  style={{ fontSize: 12, color: '#B89A5C', textDecoration: 'none' }}
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
