import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { registerProofPilotTools } from '@/lib/webmcp';
import NotFound from '@/pages/not-found';
import LandingPage from '@/pages/landing';
import WorkspacePage from '@/pages/workspace';
import DecisionsPage from '@/pages/decisions';
import ActivityPage from '@/pages/activity';
import BriefPage from '@/pages/brief';
import DeveloperPage from '@/pages/developer';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
         <Route path="/" component={LandingPage} />
         <Route path="/workspace" component={WorkspacePage} />
         <Route path="/decisions" component={DecisionsPage} />
         <Route path="/decisions/:id" component={WorkspacePage} />
         <Route path="/activity" component={ActivityPage} />
         <Route path="/activity/:id" component={ActivityPage} />
         <Route path="/brief" component={BriefPage} />
         <Route path="/brief/:id" component={BriefPage} />
         <Route path="/developer" component={DeveloperPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  useEffect(() => {
    registerProofPilotTools(() => 'demo-ai-assistant');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

