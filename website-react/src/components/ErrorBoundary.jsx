import { Component } from 'react'
import { reportClientError } from '../services/reportClientError.js'

// Error boundaries must be class components — React has no hook equivalent
// for getDerivedStateFromError/componentDidCatch.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    reportClientError({
      message: error?.message ?? 'Unknown render error',
      stack:   error?.stack,
      screen:  'render_crash',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="status-page-wrap">
        <div className="status-card">
          <span className="status-icon" style={{ opacity: 0.4 }}>▲</span>
          <h1 className="status-title">Something went wrong.</h1>
          <p className="status-sub">This page hit an unexpected error. Try reloading.</p>
          <button className="btn btn--primary" onClick={this.handleReset}>
            Try Again
          </button>
        </div>
      </div>
    )
  }
}
