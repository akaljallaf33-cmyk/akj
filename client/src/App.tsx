import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from './contexts/DataContext';
import { YearProvider } from './contexts/YearContext';
import AuthGuard from './components/AuthGuard';
import Dashboard from "./pages/Dashboard";

function ProtectedDashboard() {
  return (
    <AuthGuard>
      <DataProvider>
        <YearProvider>
          <Dashboard />
        </YearProvider>
      </DataProvider>
    </AuthGuard>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={ProtectedDashboard} />
      <Route component={ProtectedDashboard} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
