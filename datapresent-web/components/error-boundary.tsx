"use client";

import { AlertTriangle } from "lucide-react";
import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryMessages {
  title: string;
  description: string;
  retry: string;
  home: string;
}

const defaultMessages: ErrorBoundaryMessages = {
  title: "Oups ! Quelque chose s'est mal passé",
  description:
    "Une erreur inattendue s'est produite. Veuillez rafraîchir la page ou retourner à l'accueil.",
  retry: "Réessayer",
  home: "Accueil",
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  messages?: ErrorBoundaryMessages;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const m = this.props.messages ?? defaultMessages;

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f8ec] dark:bg-[#0c1407] p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle
                className="w-8 h-8 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#17250e] dark:text-[#e3f1db] mb-2">
              {m.title}
            </h2>
            <p className="text-[#17250e]/70 dark:text-[#e3f1db]/70 mb-6">{m.description}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-[#3a6a20] text-white hover:bg-[#478524]"
              >
                {m.retry}
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="border-[#c5d9b3] text-[#17250e] dark:text-[#e3f1db]"
              >
                {m.home}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
