import { useState, useEffect } from "react";
import { supabase, getUserProfile, createUserProfile, isTrialActive } from "../lib/supabase";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u) => {
    if (!u) { setProfile(null); return; }
    let p = await getUserProfile(u.id);
    if (!p) p = await createUserProfile(u.id);
    setProfile(p);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      loadProfile(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = profile ? isTrialActive(profile) : false;

  return { user, profile, loading, hasAccess };
}
