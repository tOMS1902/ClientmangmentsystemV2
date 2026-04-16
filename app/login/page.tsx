'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoldRule } from '@/components/ui/GoldRule'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Sign in failed')
        setLoading(false)
        return
      }

      router.push(data.redirect)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-navy-card border border-gold p-8">
        <div className="text-center mb-6">
          <div
            className="text-4xl text-gold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            LE
          </div>
          <h1
            className="text-2xl text-white mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome Back
          </h1>
          <p className="text-grey-muted text-sm">The Legal Edge coaching platform</p>
        </div>

        <GoldRule />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  )
}
