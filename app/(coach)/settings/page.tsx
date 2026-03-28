import { Settings } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { GoldRule } from '@/components/ui/GoldRule'

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <Eyebrow>Coach Portal</Eyebrow>
      <h1 className="text-3xl text-white mt-2" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
      <GoldRule className="mt-3 mb-10" />
      <div className="border border-white/8 bg-navy-card p-10 flex flex-col items-center text-center">
        <div className="w-14 h-14 border border-gold flex items-center justify-center mb-5">
          <Settings size={24} className="text-gold" />
        </div>
        <h2 className="text-xl text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>Coming Soon</h2>
        <p className="text-grey-muted text-sm max-w-sm">Settings and configuration options will be available in a future update. Check back soon.</p>
      </div>
    </div>
  )
}
