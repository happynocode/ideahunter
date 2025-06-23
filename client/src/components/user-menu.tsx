import { useState } from 'react';
import { motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth.tsx';
import { User, LogOut, Shield, Settings } from 'lucide-react';
import AuthModal from './auth-modal';

export default function UserMenu() {
  const { user, signOut, isAdmin, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setAuthModalOpen(true)}
          className="glass-card rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-all duration-200 border border-white/20"
        >
          <User className="w-4 h-4 mr-2" />
          Sign In
        </Button>
        <AuthModal 
          open={authModalOpen} 
          onOpenChange={setAuthModalOpen}
          defaultTab="signin"
        />
      </>
    );
  }

  const userInitial = user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-56 bg-gray-900/95 border border-white/20 backdrop-blur-lg"
        align="end"
        forceMount
      >
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-white text-sm">
              {user.email}
            </p>
            {isAdmin && (
              <p className="text-xs text-amber-400 font-medium">
                Administrator
              </p>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator className="bg-white/20" />
        
        {isAdmin && (
          <>
            <DropdownMenuItem className="text-white hover:bg-white/10 focus:bg-white/10">
              <Shield className="mr-2 h-4 w-4 text-amber-400" />
              <span className="text-amber-400">Admin Access</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/20" />
          </>
        )}
        
        <DropdownMenuItem 
          onClick={signOut}
          className="text-white hover:bg-red-500/20 focus:bg-red-500/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 