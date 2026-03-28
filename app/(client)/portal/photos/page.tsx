import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PhotosTab } from '@/components/client/tabs/PhotosTab'
import type { WeeklyCheckin } from '@/lib/types'

function getWeekNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  return Math.max(1, Math.ceil((today.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
}

export default async function ClientPhotosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, start_date')
    .eq('user_id', user.id)
    .single()

  if (!clientRecord) return <p className="text-grey-muted p-4">Client record not found.</p>

  const { data: checkins } = await supabase
    .from('weekly_checkins')
    .select('week_number, weight, check_in_date')
    .eq('client_id', clientRecord.id)
    .order('week_number', { ascending: false })

  const weekNumber = getWeekNumber(clientRecord.start_date)

  return (
    <PhotosTab
      clientId={clientRecord.id}
      weekNumber={weekNumber}
      checkins={(checkins as WeeklyCheckin[]) || []}
    />
  )
}
