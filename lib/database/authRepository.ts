import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/database/client";

export async function signUpWithEmailPassword(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmailPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}

export async function getCurrentSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthChanges(handler: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(handler);
}
