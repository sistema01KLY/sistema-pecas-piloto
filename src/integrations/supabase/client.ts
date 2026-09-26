import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    env: Record<string, string | undefined>;
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
