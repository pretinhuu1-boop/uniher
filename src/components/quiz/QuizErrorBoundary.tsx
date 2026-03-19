'use client';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export default class QuizErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Quiz error:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          fontFamily: 'var(--ff-body)',
        }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '1rem' }}>
            <circle cx="24" cy="24" r="22" stroke="var(--rose-300)" strokeWidth="2" />
            <path d="M24 16v10M24 30v2" stroke="var(--rose-500)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h3 style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-900)',
            marginBottom: '0.5rem',
          }}>
            Ops, algo deu errado
          </h3>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-600)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            Houve um problema ao carregar o diagnóstico. Tente novamente.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              background: 'var(--rose-500)',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              fontFamily: 'var(--ff-body)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recomeçar diagnóstico
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
