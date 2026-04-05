import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">
        Algo deu errado
      </h2>
      <p className="text-muted-foreground dark:text-muted-foreground mb-4 max-w-md">
        {error.message || "Ocorreu um erro inesperado"}
      </p>
      <Button onClick={resetErrorBoundary} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

export default ErrorFallback;
