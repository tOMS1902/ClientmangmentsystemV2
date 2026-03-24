'use client'

import { useState, useRef, useCallback } from 'react'
import type { CheckInPhoto } from '@/lib/types'

interface PhotoUploadSlotProps {
  label: string
  photoType: 'front' | 'back'
  existingPhoto?: CheckInPhoto
  onFileSelected: (file: File) => Promise<void>
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

type Status = 'idle' | 'uploading' | 'success' | 'error'

export function PhotoUploadSlot({
  label,
  existingPhoto,
  onFileSelected,
  disabled = false,
}: PhotoUploadSlotProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPEG, PNG, or WebP files are accepted.'
    if (file.size > MAX_BYTES) return 'File must be under 10 MB.'
    return null
  }

  const processFile = useCallback(async (file: File) => {
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      setStatus('error')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setStatus('uploading')

    try {
      await onFileSelected(file)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Tap to retry.')
      setStatus('error')
    }
  }, [onFileSelected])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // reset input so same file can be re-selected on retry
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStatus('idle')
    setError(null)
  }

  const borderClass = dragOver
    ? 'border-gold'
    : status === 'error'
    ? 'border-red-500/60'
    : 'border-white/20'

  const showExisting = status === 'idle' && !preview && existingPhoto?.signed_url

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center h-52 border border-dashed bg-navy-mid cursor-pointer select-none transition-colors ${borderClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/40'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Existing photo with hover overlay */}
      {showExisting && (
        <div className="absolute inset-0 group">
          <img
            src={existingPhoto.signed_url}
            alt={label}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
              Replace
            </span>
          </div>
        </div>
      )}

      {/* Preview of newly selected file */}
      {preview && (
        <div className="absolute inset-0">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-black/70 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/90 transition-colors"
            aria-label="Remove preview"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploading overlay */}
      {status === 'uploading' && (
        <div className="absolute inset-0 bg-navy-mid/80 flex flex-col items-center justify-center gap-2">
          <SpinnerIcon />
          <span className="text-grey-muted text-sm">Uploading…</span>
        </div>
      )}

      {/* Success overlay */}
      {status === 'success' && !preview && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-green-400 text-2xl">✔</span>
          <span className="text-green-400 text-sm">Photo saved</span>
        </div>
      )}

      {/* Success tick shown over preview */}
      {status === 'success' && preview && (
        <div className="absolute bottom-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1">
          Saved ✔
        </div>
      )}

      {/* Idle state — no existing photo, no preview */}
      {status === 'idle' && !showExisting && !preview && (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <CameraIcon />
          <span className="text-white/85 text-sm" style={{ fontFamily: 'var(--font-display)' }}>
            {label}
          </span>
          <span className="text-grey-muted text-xs">Tap to upload or drag a photo here</span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && !preview && (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="text-red-400 text-xs">{error}</span>
          <span className="text-grey-muted text-xs">Tap to retry</span>
        </div>
      )}

      {/* Error badge shown over preview */}
      {status === 'error' && preview && (
        <div className="absolute inset-0 bg-navy-mid/80 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="text-red-400 text-xs">{error}</span>
          <span className="text-grey-muted text-xs">Tap to retry</span>
        </div>
      )}

      {/* Label shown when existing photo is displayed */}
      {showExisting && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
          <span className="text-white/80 text-xs">{label}</span>
        </div>
      )}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-grey-muted">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin text-gold" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
