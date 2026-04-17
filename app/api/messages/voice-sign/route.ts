import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Validate path format: must be `{uuid}/{uuid}.{ext}`
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const VOICE_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|mp4|ogg|m4a)$/i
  if (!VOICE_PATH_REGEX.test(path)) {
    return NextResponse.json({ error: 'Invalid path format' }, { status: 400 })
  }

  // The path is `{clientId}/{uuid}.{ext}` — extract clientId for access check
  const clientId = path.split('/')[0]
  if (!UUID_REGEX.test(clientId)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (profile.role === 'client') {
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('user_id', user.id).single()
    if (clientRecord?.id !== clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (profile.role === 'coach') {
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
    if (!clientRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error: signError } = await adminSupabase.storage
    .from('message-voice-notes')
    .createSignedUrl(path, 3600) // 1 hour

  if (signError || !data) {
    console.error('[voice-sign]', signError)
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
