import { APP_CONFIG, API_ENDPOINTS } from "@/lib/constants";
import { VisuallyHidden } from '@/components/VisuallyHidden';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/i18n";
import { AccessibilityProvider } from "@/contexts/accessibility";
import { GlobalStreamingProvider } from "@/hooks/useGlobalStreaming";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipLinks } from "@/contexts/accessibility";
import { AppRoutes } from "@/AppRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <I18nProvider defaultLocale="pt-BR">
        <AccessibilityProvider>
          <ThemeProvider defaultTheme="dark" storageKey="visao-theme">
            <QueryClientProvider client={queryClient}>
              <GlobalStreamingProvider>
                <TooltipProvider>
                  <AuthProvider>
                    <SkipLinks />
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <AppRoutes />
                    </BrowserRouter>
                  </AuthProvider>
                </TooltipProvider>
              </GlobalStreamingProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </AccessibilityProvider>
      </I18nProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
