import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: report } = await supabase
    .from('diagnostic_reports')
    .select('id, coach_id')
    .eq('id', id)
    .single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  if (report.coach_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })

  const fileBuffer = await file.arrayBuffer()
  const storagePath = `reports/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  const { error: uploadError } = await supabase.storage
    .from('diagnostics-pdfs')
    .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('[pdf] upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('diagnostics-pdfs')
    .getPublicUrl(storagePath)

  await supabase
    .from('diagnostic_reports')
    .update({ pdf_file_url: publicUrl })
    .eq('id', id)

  return NextResponse.json({ pdf_file_url: publicUrl, filename: file.name })
}
