import * as React from "react";
import * as Sentry from "@sentry/react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    if (typeof Sentry.captureException === "function") {
      Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050607] px-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0b0e12] p-8 text-center shadow-lg">
            <h1 className="mb-3 text-xl font-semibold text-white">Something went wrong.</h1>
            <p className="mb-6 text-sm text-gray-400">Please reload the page. If the problem persists, contact support.</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-lg bg-[#c0c0c0] px-4 py-2 text-sm font-medium text-black hover:bg-[#a8a8a8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0e12] focus:ring-[#c0c0c0]"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
