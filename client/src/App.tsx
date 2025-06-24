import { Switch, Route, Redirect, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth.tsx";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";

function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }
  
  // Redirect non-admin users to home page
  if (!user || !isAdmin) {
    return <Redirect to="/" />;
  }
  
  return <Admin />;
}

function AppRouter() {
  // Get base path for GitHub Pages
  const basePath = process.env.NODE_ENV === 'production' ? '/reddit-idea-scraper' : '';
  
  return (
    <Router base={basePath}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/admin" component={AdminRoute} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
