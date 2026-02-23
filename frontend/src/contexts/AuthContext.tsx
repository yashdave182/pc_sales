import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { authService } from "../lib/supabaseClient";
import { setUserEmail, clearUserEmail } from "../services/api";
import { hasPermission } from "../config/permissions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to extract and normalize role
  const getRole = (user: User | null): string | null => {
    if (!user) return null;

    // 1. Check user_metadata (where the roles are stored as per screenshot)
    let role = user.user_metadata?.role;

    // 2. Check app_metadata (legacy fallback)
    if (!role) {
      role = user.app_metadata?.role;
    }

    // 3. Normalize: "Sales Manager" -> "sales_manager"
    if (role && typeof role === 'string') {
      const normalized = role.toLowerCase().replace(/ /g, '_');
      console.log(`[Auth] Normalized role '${role}' to '${normalized}'`);
      return normalized;
    }

    // 4. Hardcode admin by email if no metadata
    if (user.email === 'admin@parulchemicals.com') {
      return 'admin';
    }

    console.warn("[Auth] User has no role in metadata. Defaulting to 'sales_manager'.");
    return 'sales_manager';
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        const userRole = getRole(currentSession?.user ?? null);
        setRole(userRole);

        // Store user email for API requests
        if (currentSession?.user?.email) {
          setUserEmail(currentSession.user.email);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const userRole = getRole(currentSession?.user ?? null);
      setRole(userRole);

      setLoading(false);

      // Update user email in localStorage
      if (currentSession?.user?.email) {
        setUserEmail(currentSession.user.email);
      } else {
        clearUserEmail();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { session: newSession, user: newUser } = await authService.signIn(
        email,
        password,
      );
      setSession(newSession);
      setUser(newUser);

      const userRole = getRole(newUser ?? null);
      setRole(userRole);

      // Store user email for API requests
      if (newUser?.email) {
        setUserEmail(newUser.email);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
      setRole(null);

      // Clear user email from localStorage
      clearUserEmail();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (permission: string) => {
    return hasPermission(role || undefined, permission);
  };

  const value = {
    user,
    session,
    role,
    loading,
    signIn,
    signOut,
    hasPermission: checkPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
