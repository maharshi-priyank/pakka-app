import { Component, type ErrorInfo, type ReactNode } from 'react'
import { noticeError } from '@/lib/newrelic'

interface Props  { children: ReactNode }
interface State  { hasError: boolean }

/**
 * Catches unhandled render errors and reports them to New Relic before
 * showing a minimal fallback UI. The browser agent catches most runtime
 * errors on its own, but React's error boundaries are the only way to
 * intercept errors thrown during rendering.
 */
export class NewRelicErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    noticeError(error, { componentStack: info.componentStack ?? '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Something went wrong</p>
          <p className="text-sm text-gray-500">Please refresh the page. If the issue persists, contact support.</p>
          <button
            className="mt-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
