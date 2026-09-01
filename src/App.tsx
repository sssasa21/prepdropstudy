import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Submit from "./pages/Submit.tsx";
import Review from "./pages/Review.tsx";
import NotFound from "./pages/NotFound.tsx";
import { initPrepDrop } from "@/lib/prepdrop";
import { initRatings } from "@/lib/ratings";
import { getMissingEnvVars } from "@/lib/env";
import { ConfigError } from "@/components/ConfigError";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const missingEnv = getMissingEnvVars();

if (missingEnv.length === 0) {
  initPrepDrop();
  initRatings();
}

const queryClient = new QueryClient();

const App = () => {
  if (missingEnv.length > 0) return <ConfigError missing={missingEnv} />;

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/submit" element={<Submit />} />
              <Route path="/review" element={<Review />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};


export default App;
