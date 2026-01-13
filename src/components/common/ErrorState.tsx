/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Error State Component
 */

import { memo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  error?: Error | string | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorStateComponent({
  error,
  title = "Ocorreu um erro",
  onRetry,
  className,
}: ErrorStateProps) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : error || "Algo deu errado. Por favor, tente novamente.";

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="mt-4 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export const ErrorState = memo(ErrorStateComponent);
export default ErrorState;
