'use client'

import { useMemo } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { PhotoUploadSlot } from './PhotoUploadSlot'
import { Eyebrow } from '@/components/ui/Eyebrow'
import type { CheckInPhoto } from '@/lib/types'

interface ProgressPhotoUploadProps {
  clientId: string
  weekNumber: number
  checkInId?: string
  existingPhotos?: CheckInPhoto[]
}

export function ProgressPhotoUpload({
  clientId,
  weekNumber,
  checkInId,
  existingPhotos = [],
}: ProgressPhotoUploadProps) {
  const frontPhoto = useMemo(
    () => existingPhotos.find(p => p.photo_type === 'front'),
    [existingPhotos]
  )
  const backPhoto = useMemo(
    () => existingPhotos.find(p => p.photo_type === 'back'),
    [existingPhotos]
  )

  const uploadPhoto = async (file: File, photoType: 'front' | 'back') => {
    const supabase = createClientSupabaseClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${clientId}/wk${weekNumber}_${photoType}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const res = await fetch(`/api/photos/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_number: weekNumber,
        photo_type: photoType,
        storage_path: path,
        file_size_bytes: file.size,
        check_in_id: checkInId ?? null,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error ?? 'Failed to save photo metadata.')
    }
  }

  return (
    <section>
      <Eyebrow>Progress Photos (Optional)</Eyebrow>
      <p className="text-grey-muted text-sm mt-1 mb-4">
        Front and back photos help track visual changes week to week. Only you and your coach can see these.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <PhotoUploadSlot
          label="Front — facing camera"
          photoType="front"
          existingPhoto={frontPhoto}
          onFileSelected={(file) => uploadPhoto(file, 'front')}
        />
        <PhotoUploadSlot
          label="Back — facing away"
          photoType="back"
          existingPhoto={backPhoto}
          onFileSelected={(file) => uploadPhoto(file, 'back')}
        />
      </div>
    </section>
  )
}
