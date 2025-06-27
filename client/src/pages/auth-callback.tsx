import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication Error",
            description: error.message,
            variant: "destructive",
          });
          setLocation('/');
          return;
        }

        if (data.session) {
          toast({
            title: "Login Successful",
            description: "Welcome to IdeaHunter!",
          });
          setLocation('/dashboard');
        } else {
          setLocation('/');
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        toast({
          title: "Authentication Error",
          description: "An unexpected error occurred during authentication.",
          variant: "destructive",
        });
        setLocation('/');
      }
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}
