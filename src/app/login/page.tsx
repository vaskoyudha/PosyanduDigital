'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Leaf, AlertCircle } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-green-100/60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-50/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / App header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 shadow-lg shadow-green-200 mb-4">
            <Leaf className="w-8 h-8 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PosyanduDigital</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium tracking-wide">
            Sistem Informasi Posyandu Digital
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-green-100/50 bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Masuk ke Akun</CardTitle>
            <CardDescription className="text-gray-500">
              Masukkan email dan kata sandi Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Alamat Email
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
                  className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Kata Sandi
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
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
                  className="border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-colors"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11 shadow-sm shadow-green-200 transition-all duration-200 hover:shadow-md hover:shadow-green-200"
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

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400 leading-relaxed">
                Akun dikelola oleh administrator sistem.{' '}
                <span className="text-gray-500">Hubungi admin jika ada masalah akses.</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-xs text-gray-400">
          © 2026 PosyanduDigital · Kementerian Kesehatan RI
        </p>
      </div>
    </div>
  )
}
