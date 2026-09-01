import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { getMissingEnvVars } from "./lib/env";
import { ConfigError } from "./components/ConfigError";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

// App (and everything it imports, including the backend client) is loaded lazily
// so a missing env var renders a config screen instead of a blank white page.
const App = lazy(() => import("./App.tsx"));

const missing = getMissingEnvVars();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
    Loading PrepDrop...
  </div>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      {missing.length > 0 ? (
        <ConfigError missing={missing} />
      ) : (
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      )}
    </AppErrorBoundary>
  </StrictMode>,
);
