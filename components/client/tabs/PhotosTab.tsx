'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'
import { PhotoUploadSlot } from '@/components/photos/PhotoUploadSlot'
import { PhotoHistoryGrid } from '@/components/photos/PhotoHistoryGrid'
import { PhotoCompareView } from '@/components/photos/PhotoCompareView'
import type { CheckInPhoto } from '@/lib/types'

interface PhotosTabProps {
  clientId: string
  weekNumber: number
  checkins: { week_number: number; weight: number; check_in_date: string }[]
}

interface PhotoSlotDisplayProps {
  photo: CheckInPhoto | undefined
  label: string
  clientId: string
  weekNumber: number
  photoType: 'front' | 'back'
  onUploaded: () => void
}

function PhotoSlotDisplay({ photo, label, clientId, weekNumber, photoType, onUploaded }: PhotoSlotDisplayProps) {
  const handleCoachUpload = useCallback(async (file: File) => {
    const { createClientSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = createClientSupabaseClient()
    const path = `${clientId}/wk${weekNumber}_${photoType}_${Date.now()}.jpg`
    const { error } = await supabase.storage.from('progress-photos').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const res = await fetch(`/api/photos/${clientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_number: weekNumber, photo_type: photoType, storage_path: path, file_size_bytes: file.size }),
    })
    if (!res.ok) throw new Error('Failed to save photo record')
    onUploaded()
  }, [clientId, weekNumber, photoType, onUploaded])

  if (photo) {
    return (
      <div className="bg-navy-card border border-white/8 p-4">
        <p className="text-grey-muted text-xs mb-3" style={{ fontFamily: 'var(--font-label)' }}>
          {label.toUpperCase()}
        </p>
        {photo.signed_url ? (
          <img
            src={photo.signed_url}
            alt={`${label} photo — Week ${weekNumber}`}
            className="w-full object-cover mb-3"
            style={{ maxHeight: 360 }}
          />
        ) : (
          <div className="w-full bg-navy-mid flex items-center justify-center mb-3" style={{ height: 200 }}>
            <span className="text-grey-muted text-sm">Preview unavailable</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-grey-muted text-xs">
            {new Date(photo.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {photo.signed_url && (
            <a
              href={photo.signed_url}
              download={`week-${weekNumber}-${photoType}.jpg`}
              className="text-xs text-gold"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Download
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-navy-card border border-white/8 p-4">
      <p className="text-grey-muted text-xs mb-3" style={{ fontFamily: 'var(--font-label)' }}>
        {label.toUpperCase()}
      </p>
      <div className="w-full bg-navy-mid flex flex-col items-center justify-center mb-3" style={{ minHeight: 180 }}>
        <p className="text-grey-muted text-sm mb-4">
          No {label.toLowerCase()} photo for Week {weekNumber}
        </p>
        <PhotoUploadSlot
          label={label}
          photoType={photoType}
          onFileSelected={handleCoachUpload}
        />
      </div>
    </div>
  )
}

export function PhotosTab({ clientId, weekNumber, checkins }: PhotosTabProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(weekNumber)
  const [photos, setPhotos] = useState<CheckInPhoto[]>([])
  const [allWeeks, setAllWeeks] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [compareMode, setCompareMode] = useState(false)

  const fetchPhotos = useCallback(async (week: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/photos/${clientId}?week=${week}`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data || [])
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchPhotos(selectedWeek)
  }, [fetchPhotos, selectedWeek])

  useEffect(() => {
    async function fetchWeeks() {
      try {
        const res = await fetch(`/api/photos/${clientId}/weeks`)
        if (res.ok) {
          const data = await res.json()
          setAllWeeks(data || [])
        }
      } catch {
        // ignore
      }
    }
    fetchWeeks()
  }, [clientId])

  function refreshPhotos() {
    fetchPhotos(selectedWeek)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Eyebrow>Progress Photos</Eyebrow>
          <GoldRule />
        </div>
        {allWeeks.length >= 2 && (
          <button
            onClick={() => setCompareMode(true)}
            className="text-sm text-gold border border-gold px-3 py-1"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            Compare Weeks
          </button>
        )}
      </div>

      {compareMode ? (
        <PhotoCompareView
          clientId={clientId}
          availableWeeks={allWeeks}
          initialWeekA={allWeeks[1]}
          initialWeekB={allWeeks[0]}
          checkins={checkins}
        />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm text-grey-muted">Week</label>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              className="bg-navy-mid border border-white/20 text-white text-sm px-3 py-1.5"
            >
              {Array.from({ length: weekNumber }, (_, i) => weekNumber - i).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <PhotoSlotDisplay
              photo={photos.find(p => p.photo_type === 'front')}
              label="Front"
              clientId={clientId}
              weekNumber={selectedWeek}
              photoType="front"
              onUploaded={refreshPhotos}
            />
            <PhotoSlotDisplay
              photo={photos.find(p => p.photo_type === 'back')}
              label="Back"
              clientId={clientId}
              weekNumber={selectedWeek}
              photoType="back"
              onUploaded={refreshPhotos}
            />
          </div>

          {allWeeks.length > 0 && (
            <>
              <Eyebrow>Photo History</Eyebrow>
              <GoldRule />
              <PhotoHistoryGrid
                clientId={clientId}
                weeks={allWeeks}
                selectedWeek={selectedWeek}
                onSelectWeek={setSelectedWeek}
              />
            </>
          )}

          {allWeeks.length === 0 && !loading && (
            <p className="text-grey-muted text-sm mt-8">
              No progress photos uploaded yet for this client.
            </p>
          )}
        </>
      )}
    </div>
  )
}
