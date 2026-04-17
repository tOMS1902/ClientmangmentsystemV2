import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

async function resolveAccess(clientId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return { error: 'Unauthorized', status: 401 as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile?.role) return { error: 'Unauthorized', status: 401 as const }

  if (profile.role === 'client') {
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('user_id', user.id).single()
    if (clientRecord?.id !== clientId) return { error: 'Forbidden', status: 403 as const }
  }

  if (profile.role === 'coach') {
    const { data: clientRecord } = await supabase.from('clients').select('id').eq('id', clientId).eq('coach_id', user.id).single()
    if (!clientRecord) return { error: 'Forbidden', status: 403 as const }
  }

  return { error: null, status: 200 as const }
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const access = await resolveAccess(clientId)
  if (access.error) return NextResponse.json({ error: access.error }, { status: access.status })

  const formData = await request.formData()
  const audio = formData.get('audio') as Blob | null
  if (!audio) return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
  if (audio.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Audio too large (max 10MB)' }, { status: 400 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ext = audio.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`
  const buffer = await audio.arrayBuffer()

  const { error: uploadError } = await adminSupabase.storage
    .from('message-voice-notes')
    .upload(path, buffer, { contentType: audio.type, upsert: false })

  if (uploadError) {
    console.error('[voice upload]', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  return NextResponse.json({ path })
}
