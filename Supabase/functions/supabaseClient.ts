import { createClient, SupabaseClient } from '@supabase/supabase-js';

//  Variables d'environnement sécurisées du côté back-end
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

//  Création du client Supabase
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);