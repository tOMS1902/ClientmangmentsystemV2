'use client'

import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function PendingPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClientSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-4xl text-gold mb-6" style={{ fontFamily: 'var(--font-display)' }}>LE</div>
        <h1 className="text-3xl text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Access Pending
        </h1>
        <p className="text-grey-muted mb-8">
          Your onboarding has been received. Calum will review your profile and activate your access shortly.
        </p>
        <Button variant="ghost" size="md" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  )
}
