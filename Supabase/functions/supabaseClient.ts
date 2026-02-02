import { createClient } from '@supabase/supabase-js';

//  Variables d'environnement sécurisées du côté back-end
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

//  Création du client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);