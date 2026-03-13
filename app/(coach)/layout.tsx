import { CoachSidebar } from '@/components/coach/CoachSidebar'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-screen bg-navy-deep">
      <CoachSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-4 border-b border-white/8 flex justify-end">
          <span className="text-sm text-grey-muted">{today}</span>
        </header>
        <main className="flex-1 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
