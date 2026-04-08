import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { CoachSettings } from '@/components/coach/CoachSettings'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, email, avatar_url').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="max-w-2xl">
      <Eyebrow>Coach Portal</Eyebrow>
      <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      <GoldRule className="mt-3 mb-10" />
      <CoachSettings
        initialAvatarUrl={profile?.avatar_url ?? null}
        coachName={profile?.full_name ?? ''}
        coachEmail={profile?.email ?? ''}
        coachId={user?.id ?? ''}
      />
    </div>
  )
}
