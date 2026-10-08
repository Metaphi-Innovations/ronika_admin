import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/admin.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  state = { error: null };
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fee' }}>
          <h2>Something went wrong in the Admin Panel</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{(this.state.error as any).toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>{(this.state.error as any).stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
