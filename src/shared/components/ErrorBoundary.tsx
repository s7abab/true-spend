import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = { children: ReactNode };

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error('App error boundary:', err, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#F2F2F7',
            fontFamily: 'Geist, system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F0F12', marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: '#6B6B80', maxWidth: 320, marginBottom: 24 }}>
            Try reloading the page. If the problem continues, check your connection and Supabase configuration.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              background: '#0F0F12',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
