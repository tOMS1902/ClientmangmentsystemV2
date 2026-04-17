import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// In-memory rate limiter — no external deps, works per edge instance
// ---------------------------------------------------------------------------
interface RateLimitEntry { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>()
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count++
  return entry.count > limit
}

function getIP(req: NextRequest): string {
  // On Vercel, req.ip is set by platform infrastructure and cannot be spoofed by clients
  const vercelIp = (req as unknown as { ip?: string }).ip
  if (vercelIp) return vercelIp
  // Fallback for local dev / self-hosted
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  let response = NextResponse.next()
  const { pathname } = request.nextUrl
  const ip = getIP(request)

  // Rate limit: /api/auth/login — 10 attempts per minute per IP
  if (pathname === '/api/auth/login') {
    if (checkRateLimit(`auth:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    return response
  }

  // Rate limit: /api/ai/* — 20 requests per minute per IP (expensive AI operations)
  if (pathname.startsWith('/api/ai/')) {
    if (checkRateLimit(`ai:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    return response
  }

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
      if (profile?.role === 'client') return NextResponse.redirect(new URL('/portal', request.url))
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
    if (!isCoach) return NextResponse.redirect(new URL(isClient ? '/portal' : '/login', request.url))
    return response
  }

  // ── Client portal routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/portal')) {
    if (!isClient) return NextResponse.redirect(new URL(isCoach ? '/dashboard' : '/login', request.url))

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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
    '/api/auth/login',
    '/api/ai/:path*',
  ],
}
