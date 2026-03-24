import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://XXXX.supabase.co';   // ← remplace
const SUPABASE_ANON_KEY = 'XXXX';                        // ← remplace

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);



REACT_APP_SUPABASE_URL=https://XXXX.supabase.co
REACT_APP_SUPABASE_ANON_KEY=XXXX