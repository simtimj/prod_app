import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createMissingSupabaseClient(): SupabaseClient {
  const missingEnvError = new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );

  const auth = {
    signUp: async () => {
      throw missingEnvError;
    },
    signInWithPassword: async () => {
      throw missingEnvError;
    },
    signOut: async () => {
      throw missingEnvError;
    },
    getSession: async () => {
      throw missingEnvError;
    },
    onAuthStateChange: () => {
      throw missingEnvError;
    },
  };

  return { auth } as unknown as SupabaseClient;
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : createMissingSupabaseClient();
