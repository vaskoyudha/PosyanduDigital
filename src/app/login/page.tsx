'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Leaf, AlertCircle, Baby } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (
          authError.message.toLowerCase().includes('invalid') ||
          authError.message.toLowerCase().includes('credentials') ||
          authError.message.toLowerCase().includes('password')
        ) {
          setError('Email atau kata sandi salah. Silakan periksa kembali.')
        } else if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError('Akun belum diverifikasi. Silakan periksa email Anda.')
        } else if (authError.message.toLowerCase().includes('too many')) {
          setError('Terlalu banyak percobaan masuk. Silakan coba lagi nanti.')
        } else {
          setError('Terjadi kesalahan. Silakan coba lagi.')
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — brand, hidden on mobile */}
      <div className="hidden lg:flex flex-col w-[480px] xl:w-[520px] shrink-0 relative overflow-hidden bg-gradient-to-b from-brand-800 to-brand-900 p-12">
        {/* Decorative: large blurred circle top-right */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-600/30 blur-3xl pointer-events-none" />
        {/* Decorative: small circle bottom-left */}
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-brand-700/40 blur-2xl pointer-events-none" />
        {/* Subtle dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo lockup */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Leaf className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PosyanduDigital</span>
        </div>

        {/* Illustration area */}
        <div className="relative flex-1 flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Layered radial rings */}
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-6 rounded-full border-2 border-white/15" />
            <div className="absolute inset-12 rounded-full border-2 border-white/20" />
            <div className="absolute inset-20 rounded-full bg-white/10" />
            {/* Central icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Baby className="h-16 w-16 text-white/70" strokeWidth={1} />
            </div>
            {/* Orbiting accent dots */}
            <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-white/30" />
            <div className="absolute bottom-8 left-6 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute top-1/2 -right-3 w-1 h-1 rounded-full bg-white/25" />
          </div>
        </div>

        {/* Tagline section */}
        <div className="relative mt-auto">
          <blockquote
            className="text-white/90 text-xl font-semibold leading-snug tracking-tight"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            &ldquo;Mendukung tumbuh kembang anak Indonesia melalui data yang akurat.&rdquo;
          </blockquote>
          <p className="mt-3 text-white/50 text-sm">
            Sistem digital untuk kader, bidan, dan tenaga gizi posyandu
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/30 text-xs">Kementerian Kesehatan RI · 2026</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-base p-8 min-h-screen">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Leaf className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            <span className="font-bold text-gray-900 text-base tracking-tight">PosyanduDigital</span>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Selamat datang</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masukkan kredensial Anda untuk melanjutkan
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@puskesmas.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="h-11 bg-white border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Kata Sandi
                </Label>
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  onClick={() => {}}
                >
                  Lupa kata sandi?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="h-11 bg-white border-gray-200 focus:border-brand-500 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-gray-400 leading-relaxed">
            Akun dikelola oleh administrator sistem.{' '}
            <span className="text-gray-500">Hubungi admin jika ada masalah akses.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
