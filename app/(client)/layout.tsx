import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ClientPortalNav } from '@/components/client/ClientPortalNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: legalProfile } = await supabase
    .from('profiles')
    .select('legal_onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!legalProfile?.legal_onboarding_complete) redirect('/onboarding')

  let showReports = false
  if (user) {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (clientRecord) {
      const { count } = await supabase
        .from('diagnostic_reports')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientRecord.id)
        .eq('status', 'published')

      showReports = (count ?? 0) > 0
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      <ClientPortalNav showReports={showReports} />

      {/* Main content */}
      <main className="max-w-[860px] mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
