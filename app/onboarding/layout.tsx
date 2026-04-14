import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, legal_onboarding_complete')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'coach') redirect('/dashboard')
  if (profile?.legal_onboarding_complete) redirect('/portal')

  return <>{children}</>
}
