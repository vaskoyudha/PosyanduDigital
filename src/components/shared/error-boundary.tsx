'use client'

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback UI. If omitted, a default Indonesian error card is shown. */
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React ErrorBoundary for wrapping dashboard sections.
 *
 * Catches render errors in child components and shows a
 * user-friendly Indonesian error message with a reload button.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <SomeClientComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development; could be sent to an error tracker
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <AlertCircle className="h-10 w-10 text-destructive/60 mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              Terjadi kesalahan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Komponen ini mengalami gangguan. Coba muat ulang halaman atau
              hubungi administrator jika masalah berlanjut.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
              >
                Coba Lagi
              </Button>
              <Button
                size="sm"
                onClick={this.handleReload}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Muat Ulang Halaman
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
