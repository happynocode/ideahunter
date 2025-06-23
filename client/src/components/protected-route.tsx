import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth.tsx';
import { Button } from '@/components/ui/button';
import { Shield, Lock, User } from 'lucide-react';
import AuthModal from './auth-modal';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  fallback?: ReactNode;
  showAuthPrompt?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  fallback,
  showAuthPrompt = true 
}: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  // Check authentication
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAuthPrompt) {
      return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 rounded-xl border border-white/20 text-center max-w-md w-full"
          >
            <Lock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-gray-400 mb-6">
              You need to login to access this page
            </p>
            <Button
              onClick={() => setAuthModalOpen(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In Now
            </Button>
          </motion.div>
          
          <AuthModal 
            open={authModalOpen} 
            onOpenChange={setAuthModalOpen}
            defaultTab="signin"
          />
        </div>
      );
    }

    return null;
  }

  // Check admin permission
  if (requireAdmin && user && !isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 rounded-xl border border-white/20 text-center max-w-md w-full"
        >
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Insufficient Permissions</h2>
          <p className="text-gray-400 mb-6">
            You need administrator permissions to access this page
          </p>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

// Simplified components for inline protection
export function AuthRequired({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} fallback={fallback} showAuthPrompt={false}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminRequired({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true} fallback={fallback} showAuthPrompt={false}>
      {children}
    </ProtectedRoute>
  );
} 