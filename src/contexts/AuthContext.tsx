"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Profile, Role } from "@/types";
import { markUnlocked } from "@/lib/biometric";

export const REMEMBER_DEVICE_KEY = "harrik_remember_device";
const TAB_SESSION_KEY = "harrik_tab_session";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  isSecurity: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, department:departments(*), organization:organizations(*)")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    // ------------------------- Sign-in-once enforcement -------------------------
    // When the user chooses NOT to remember this device, the session must end
    // when the browser/app is fully closed. sessionStorage clears at that point,
    // so on a fresh browser session we sign out first.
    const enforceEphemeralSession = async () => {
      try {
        const remember = localStorage.getItem(REMEMBER_DEVICE_KEY);
        const tabOpen = sessionStorage.getItem(TAB_SESSION_KEY);
        if (remember === "false" && !tabOpen) {
          await supabase.auth.signOut();
        }
        sessionStorage.setItem(TAB_SESSION_KEY, "1");
      } catch {
        // ignore storage access errors (private mode, etc.)
      }
    };

    const initializeAuth = async () => {
      try {
        await enforceEphemeralSession();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string, remember: boolean = true) => {
    try {
      localStorage.setItem(REMEMBER_DEVICE_KEY, remember ? "true" : "false");
      sessionStorage.setItem(TAB_SESSION_KEY, "1");
    } catch {
      // ignore storage errors
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      setUser(data.user);
      // A fresh password login unlocks the device for this session (no biometric prompt).
      markUnlocked();
      await fetchProfile(data.user.id);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  };

  const role = profile?.role ?? null;
  const isAdmin = role === "admin" || role === "super_admin";
  const isSecurity = role === "security" || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isSecurity,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
