import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Scoutly Uncaught React Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          padding: 24
        }}>
          <div style={{
            maxWidth: 600,
            width: "100%",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 14,
            padding: 32,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#ef4444", color: "white", padding: "6px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13 }}>
                Scoutly App Recovery
              </div>
              <strong style={{ fontSize: 18 }}>Something interrupted the UI</strong>
            </div>

            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, margin: "0 0 16px" }}>
              An unexpected error occurred during rendering. Scoutly caught it to prevent an unhandled crash.
            </p>

            {this.state.error && (
              <pre style={{
                background: "#0f172a",
                padding: 14,
                borderRadius: 8,
                fontSize: 12,
                color: "#fca5a5",
                overflowX: "auto",
                marginBottom: 20
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}

            <button
              onClick={() => {
                try {
                  localStorage.removeItem("scoutly-session");
                } catch {}
                window.location.reload();
              }}
              style={{
                background: "#22c55e",
                color: "#0f172a",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer"
              }}
            >
              🔄 Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
