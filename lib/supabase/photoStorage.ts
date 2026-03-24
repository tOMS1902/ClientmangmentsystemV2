'use client'

import { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'progress-photos'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a JPEG, PNG, or WebP image'
  if (file.size > MAX_FILE_SIZE) return 'Photo must be under 10 MB'
  return null
}

export function buildStoragePath(
  clientId: string,
  weekNumber: number,
  photoType: 'front' | 'back'
): string {
  const timestamp = Date.now()
  return `${clientId}/wk${weekNumber}_${photoType}_${timestamp}.jpg`
}

export async function uploadPhotoToStorage(
  supabase: SupabaseClient,
  clientId: string,
  weekNumber: number,
  photoType: 'front' | 'back',
  file: File
): Promise<{ path: string; error: string | null }> {
  const path = buildStoragePath(clientId, weekNumber, photoType)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) return { path: '', error: error.message }
  return { path, error: null }
}

export async function getSignedPhotoUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (error || !data) return null
  return data.signedUrl
}

export async function deletePhotoFromStorage(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
}
