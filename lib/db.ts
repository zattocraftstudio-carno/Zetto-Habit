import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Copy .env.local.example to .env.local and fill in server-only values. ' +
      'Never expose these with a NEXT_PUBLIC_ prefix.'
  );
}

let cachedClient: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
