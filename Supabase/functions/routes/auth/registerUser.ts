/**
 * =============================================================================
 * routes/auth/registerUser.ts  -   POST /auth/register
 * =============================================================================
 * 
 * Créer un compte utilisateur en 2 étapes atomiques:
 *  1 - Création dans auth.users via supabase.auth.admin.createUser()
 *  2 - Insertion du profil dans public.users (rôle patient par défaut)
 * 
 * Si l'étape 2 échoue, le compte auth est supprimé (rollback manuel)
 * Pour éviter les comptes orphelins (auth.users sans public.users).
 * 
 * BODY JSON:
 *      name            string requis
 *      surname         string optionnel
 *      username        string requis, >= 3 chars, unique
 *      email           string requis, format email valide
 *      password        string requis >= 12 chars, maj+min+chiffre+special
 *      phone           string optionnel, format +XXXXX
 *      role            string optionnel, 'admin'| 'pharmacien' | 'patient' | 'user'
 * 
 * ACCES : Public - L'appelant ne doit pas être connecté.
 * =============================================================================
 */

import { getAdminClient }                               from "@/supabaseAdminClient.ts";
import { extractToken, successResponse, errorResponse}  from "@/middleware/auth.ts";
import { supabase }                                     from "@/supabaseClient.ts";

//  