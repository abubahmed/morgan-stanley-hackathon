/**
 * lib/supabase.ts
 * Supabase client — replaces db/client.ts
 *
 * Uses service role key for server-side API routes (bypasses RLS).
 * Never import this in client components — use the anon key there.
 */
 
import { createClient } from "@supabase/supabase-js";
 
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
 
if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}
 
export const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});