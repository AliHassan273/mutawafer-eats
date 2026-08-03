/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase variables are not configured yet.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
