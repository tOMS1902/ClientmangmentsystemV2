'use client'

import type { CheckInPhoto } from '@/lib/types'

interface PhotoHistoryGridProps {
  clientId: string
  weeks: number[]
  onSelectWeek: (week: number) => void
  selectedWeek?: number
  photosByWeek?: Record<number, CheckInPhoto[]>
}

export function PhotoHistoryGrid({
  weeks,
  onSelectWeek,
  selectedWeek,
  photosByWeek = {},
}: PhotoHistoryGridProps) {
  if (weeks.length === 0) {
    return (
      <p className="text-grey-muted text-sm">No progress photos uploaded yet.</p>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {weeks.map(week => {
        const photos = photosByWeek[week] ?? []
        const front = photos.find(p => p.photo_type === 'front')
        const back = photos.find(p => p.photo_type === 'back')
        const isSelected = selectedWeek === week

        return (
          <button
            key={week}
            onClick={() => onSelectWeek(week)}
            className={`bg-navy-card border p-3 cursor-pointer text-left transition-colors hover:border-white/20 ${
              isSelected ? 'border-gold' : 'border-white/8'
            }`}
          >
            <p
              className="text-white text-sm mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Week {week}
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <Thumbnail photo={front} alt={`Week ${week} front`} label="Front" />
              <Thumbnail photo={back} alt={`Week ${week} back`} label="Back" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

interface ThumbnailProps {
  photo?: CheckInPhoto
  alt: string
  label: string
}

function Thumbnail({ photo, alt, label }: ThumbnailProps) {
  if (photo?.signed_url) {
    return (
      <img
        src={photo.signed_url}
        alt={alt}
        className="w-full aspect-square object-cover bg-navy-mid"
      />
    )
  }

  return (
    <div className="w-full aspect-square bg-navy-mid flex items-center justify-center">
      <span className="text-grey-muted text-xs">{label}</span>
    </div>
  )
}
