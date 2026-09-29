import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 [PawAlert ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: '#0f172a',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '1rem',
            }}
          >
            <AlertTriangle size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Dashboard View Encountered An Issue
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#94a3b8',
              maxWidth: '520px',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            {this.state.error?.message || 'A transient rendering error occurred while loading dashboard components.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#0d9488',
                borderColor: '#0d9488',
                fontWeight: 700,
              }}
            >
              <RotateCcw size={16} /> Reload Dashboard
            </button>
            <button
              onClick={() => (window.location.href = '/login')}
              className="btn btn-secondary"
              style={{ color: '#cbd5e1', borderColor: '#334155' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
