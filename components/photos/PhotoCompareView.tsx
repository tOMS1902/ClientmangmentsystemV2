'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CheckInPhoto } from '@/lib/types'

interface CheckInSummary {
  week_number: number
  weight: number | null
  check_in_date: string
}

interface PhotoCompareViewProps {
  clientId: string
  availableWeeks: number[]
  initialWeekA?: number
  initialWeekB?: number
  checkins?: CheckInSummary[]
}

type PhotoSide = 'front' | 'back'

export function PhotoCompareView({
  clientId,
  availableWeeks,
  initialWeekA,
  initialWeekB,
  checkins = [],
}: PhotoCompareViewProps) {
  const lastWeek = availableWeeks[availableWeeks.length - 1]
  const firstWeek = availableWeeks[0]

  const [weekA, setWeekA] = useState<number>(initialWeekA ?? firstWeek)
  const [weekB, setWeekB] = useState<number>(initialWeekB ?? lastWeek)
  const [photoSide, setPhotoSide] = useState<PhotoSide>('front')
  const [photosA, setPhotosA] = useState<CheckInPhoto[]>([])
  const [photosB, setPhotosB] = useState<CheckInPhoto[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPhotos = useCallback(
    async (week: number): Promise<CheckInPhoto[]> => {
      const res = await fetch(`/api/photos/${clientId}?week=${week}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.photos ?? data ?? []
    },
    [clientId]
  )

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPhotos(weekA), fetchPhotos(weekB)])
      .then(([a, b]) => {
        setPhotosA(a)
        setPhotosB(b)
      })
      .finally(() => setLoading(false))
  }, [weekA, weekB, fetchPhotos])

  const getCheckin = (week: number) => checkins.find(c => c.week_number === week)
  const checkinA = getCheckin(weekA)
  const checkinB = getCheckin(weekB)

  const weightDelta =
    checkinA?.weight != null && checkinB?.weight != null ? checkinB.weight - checkinA.weight : null

  const getPhoto = (photos: CheckInPhoto[]) =>
    photos.find(p => p.photo_type === photoSide)

  const photoA = getPhoto(photosA)
  const photoB = getPhoto(photosB)

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'

  return (
    <div className="flex flex-col gap-4">
      {/* Front / Back toggle */}
      <div className="flex self-start bg-navy-mid border border-white/20">
        {(['front', 'back'] as PhotoSide[]).map(side => (
          <button
            key={side}
            onClick={() => setPhotoSide(side)}
            className={`px-4 py-1.5 text-sm transition-colors capitalize ${
              photoSide === side
                ? 'bg-gold text-navy-dark font-semibold'
                : 'text-grey-muted hover:text-white'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {side}
          </button>
        ))}
      </div>

      {/* Compare panels */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Panel A */}
        <div className="flex-1 flex flex-col gap-2">
          <WeekSelector
            weeks={availableWeeks}
            value={weekA}
            onChange={setWeekA}
            label="Week A"
          />
          <PhotoPanel
            photo={photoA}
            loading={loading}
            side={photoSide}
            week={weekA}
            checkin={checkinA}
            formatDate={formatDate}
          />
        </div>

        {/* Weight delta badge */}
        <div className="flex md:flex-col items-center justify-center md:pt-10 gap-2 md:gap-1 self-center">
          {weightDelta !== null ? (
            <span
              className={`px-3 py-1 text-sm font-semibold ${
                weightDelta < 0
                  ? 'text-green-400 bg-green-400/10'
                  : weightDelta > 0
                  ? 'text-red-400 bg-red-400/10'
                  : 'text-grey-muted bg-white/5'
              }`}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {weightDelta > 0 ? '+' : ''}
              {weightDelta.toFixed(1)}kg
            </span>
          ) : (
            <span className="text-grey-muted text-xs">vs</span>
          )}
        </div>

        {/* Panel B */}
        <div className="flex-1 flex flex-col gap-2">
          <WeekSelector
            weeks={availableWeeks}
            value={weekB}
            onChange={setWeekB}
            label="Week B"
          />
          <PhotoPanel
            photo={photoB}
            loading={loading}
            side={photoSide}
            week={weekB}
            checkin={checkinB}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  )
}

interface WeekSelectorProps {
  weeks: number[]
  value: number
  onChange: (week: number) => void
  label: string
}

function WeekSelector({ weeks, value, onChange, label }: WeekSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-grey-muted text-xs">{label}</span>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-navy-mid border border-white/20 text-white text-sm px-2 py-1 focus:outline-none focus:border-gold"
      >
        {weeks.map(w => (
          <option key={w} value={w}>
            Week {w}
          </option>
        ))}
      </select>
    </div>
  )
}

interface PhotoPanelProps {
  photo?: CheckInPhoto
  loading: boolean
  side: PhotoSide
  week: number
  checkin?: CheckInSummary
  formatDate: (iso?: string) => string
}

function PhotoPanel({ photo, loading, side, week, checkin, formatDate }: PhotoPanelProps) {
  return (
    <div className="bg-navy-card border border-white/8 flex flex-col">
      {loading ? (
        <div className="w-full h-64 md:h-96 flex items-center justify-center">
          <span className="text-grey-muted text-sm">Loading…</span>
        </div>
      ) : photo?.signed_url ? (
        <img
          src={photo.signed_url}
          alt={`Week ${week} ${side}`}
          className="w-full h-64 md:h-96 object-contain bg-black/20"
        />
      ) : (
        <div className="w-full h-64 md:h-96 flex items-center justify-center">
          <span className="text-grey-muted text-sm">
            No {side} photo for Week {week}
          </span>
        </div>
      )}

      <div className="px-3 py-2 border-t border-white/8">
        <span className="text-white text-sm" style={{ fontFamily: 'var(--font-display)' }}>
          Week {week}
        </span>
        {checkin && (
          <span className="text-grey-muted text-xs ml-2">
            {formatDate(checkin.check_in_date)}{checkin.weight != null ? ` — ${checkin.weight}kg` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
