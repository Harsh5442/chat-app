import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/sonner";

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase connection not configured.");
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        toast.error("Supabase client not initialized.");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (data.user) {
        await supabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          display_name: data.user.email?.split('@')[0] || 'User',
        });
      }

      navigate('/');
      toast.success("Successfully logged in!");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      if (!supabase) {
        toast.error("Supabase client not initialized.");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          display_name: displayName,
        });
      }

      toast.success("Account created! Check your email for verification.");
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (!supabase) {
        toast.error("Supabase client not initialized.");
        return;
      }

      setLoading(true);
      await supabase.auth.signOut();
      navigate('/login');
      toast.success("Logged out successfully.");
    } catch (err: any) {
      toast.error(err.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
