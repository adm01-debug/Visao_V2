import React, { Component, ComponentType, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className="flex flex-col items-center justify-center p-8">
    <h2 className="text-xl font-bold text-red-600 mb-4">Algo deu errado</h2>
    <p className="text-gray-600 mb-4">{error?.message}</p>
    <button
      onClick={resetError}
      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
    >
      Tentar novamente
    </button>
  </div>
);

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  FallbackComponent: React.FC<ErrorFallbackProps> = DefaultErrorFallback
) {
  return class WithErrorBoundary extends Component<P, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    resetError = () => {
      this.setState({ hasError: false, error: undefined });
    };

    render() {
      if (this.state.hasError) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

export default withErrorBoundary;
