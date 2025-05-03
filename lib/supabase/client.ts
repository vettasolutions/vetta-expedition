import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase URL and Anonymous Key must be defined in environment variables',
    );
  }
  // Create a supabase client on the browser with project's credentials
  return createBrowserClient(supabaseUrl, supabaseKey);
}

// Note: This uses the `@supabase/ssr` browser client helper.
// Ensure your environment variables are correctly set.
