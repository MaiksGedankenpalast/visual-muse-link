import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean | null;
  profileName: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    onboardingComplete: null,
    profileName: null,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          // Defer profile fetch to avoid Supabase deadlock
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_complete, name")
              .eq("id", user.id)
              .single();
            setState({
              user,
              loading: false,
              onboardingComplete: profile?.onboarding_complete ?? false,
              profileName: profile?.name ?? null,
            });
          }, 0);
        } else {
          setState({ user: null, loading: false, onboardingComplete: null, profileName: null });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        supabase
          .from("profiles")
          .select("onboarding_complete, name")
          .eq("id", user.id)
          .single()
          .then(({ data: profile }) => {
            setState({
              user,
              loading: false,
              onboardingComplete: profile?.onboarding_complete ?? false,
              profileName: profile?.name ?? null,
            });
          });
      } else {
        setState({ user: null, loading: false, onboardingComplete: null, profileName: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
