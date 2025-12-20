import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
      <ThemeProvider defaultTheme="dark" storageKey="visao-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
