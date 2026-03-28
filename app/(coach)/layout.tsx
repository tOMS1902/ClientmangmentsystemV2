import { CoachShell } from '@/components/coach/CoachShell'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <CoachShell today={today}>
      {children}
    </CoachShell>
  )
}
