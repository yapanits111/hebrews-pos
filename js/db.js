import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Supabase library is loaded locally (js/vendor/supabase.js) so the app works
// offline too. It exposes a global `supabase` with createClient().
const { createClient } = window.supabase;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// True if the config still has placeholder values
export const configNotSet =
  SUPABASE_URL.includes("YOUR-PROJECT") ||
  SUPABASE_ANON_KEY.includes("YOUR-ANON");
