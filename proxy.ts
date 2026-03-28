import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next()
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect logged-in users away from login / root
  if (pathname === '/' || pathname === '/login') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'coach') return NextResponse.redirect(new URL('/dashboard', request.url))
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    return response
  }

  // Public: auth callback
  if (pathname.startsWith('/api/auth')) {
    return response
  }

  // Not logged in — send to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .single()

  const isCoach = profile?.role === 'coach'
  const isClient = profile?.role === 'client'

  // ── Coach routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/clients')) {
    if (!isCoach) return NextResponse.redirect(new URL('/portal', request.url))
    return response
  }

  // ── Client portal routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/portal')) {
    if (!isClient) return NextResponse.redirect(new URL('/dashboard', request.url))

    // Gate pages are always accessible
    if (pathname === '/portal/onboarding' || pathname === '/portal/pending') {
      return response
    }

    // Check onboarding completed
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('client_id', user.id)
      .maybeSingle()

    if (!onboarding) {
      return NextResponse.redirect(new URL('/portal/onboarding', request.url))
    }

    // Try to find client record by user_id
    let { data: clientRecord } = await supabase
      .from('clients')
      .select('portal_access')
      .eq('user_id', user.id)
      .maybeSingle()

    // If not linked yet, match by email and write user_id
    if (!clientRecord && user.email) {
      await supabase
        .from('clients')
        .update({ user_id: user.id })
        .eq('email', user.email)
        .is('user_id', null)

      const { data: linked } = await supabase
        .from('clients')
        .select('portal_access')
        .eq('user_id', user.id)
        .maybeSingle()

      clientRecord = linked
    }

    if (!clientRecord?.portal_access) {
      return NextResponse.redirect(new URL('/portal/pending', request.url))
    }

    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
