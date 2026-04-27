'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface LoginPageProps {
  onLogin?: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveRedirectPath = (): string => {
    const redirectParam = searchParams.get('redirect')

    if (!redirectParam || !redirectParam.startsWith('/')) {
      return '/dashboard'
    }

    if (redirectParam.startsWith('/login')) {
      return '/dashboard'
    }

    return redirectParam
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()

      if (!normalizedEmail || !normalizedPassword) {
        setError('Email and password are required')
        return
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(result.error ?? 'Unable to sign in')
        return
      }

      onLogin?.()

      // Ensure cookie-based auth context is established before leaving login.
      const verifySession = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!verifySession.ok) {
        setError('Login succeeded, but session could not be verified. Please try again.')
        return
      }

      const redirectTo = resolveRedirectPath()
      window.location.assign(redirectTo)
    } catch {
      setError('Unable to sign in right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://www.investmentexperts.ae/hero.jpeg')" }}
      />
      <div className="absolute inset-0 bg-slate-950/65" />

      <Card className="relative z-10 w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-black text-white shadow-[0_0_24px_rgba(202,138,4,0.55)] ring-1 ring-amber-400/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.investmentexperts.ae/logo.png"
              alt="Investment Experts Real Estate logo"
              className="h-14 w-14 object-contain drop-shadow-[0_0_10px_rgba(202,138,4,0.7)]"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 [text-shadow:0_0_10px_rgba(202,138,4,0.45)]">
              Investment Experts Real Estate
            </CardTitle>
            <CardDescription className="mt-1 text-2xl font-extrabold text-slate-900 [text-shadow:0_0_10px_rgba(202,138,4,0.45)]">
              IE Whatsapp AI Agent
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@iere.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            ) : null}
            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="absolute bottom-4 z-10 text-center text-sm text-white/60">
        © 2026 IERE Dubai. Developed by Ayaz Khan. Powered by Artificial Intelligence.
      </div>
    </div>
  )
}
