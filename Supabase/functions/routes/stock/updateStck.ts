/**
 *  =============================================================
 *  routes/stock/getStock.ts    -   Consultation du stock d'une pharmacie
 *  =============================================================
 * 
 * RÔLE :
 *  Retourne le stock visible d'une pharmacie.
 *  Utilise la vue stock_public_view pour les utilisateurs standards.
 * 
 * ENDPOINT :   GET /stock?name=&adress=&ville=&quartier=&phone=
 *  =============================================================
 */
import { supabase }                 from "@/supabaseClient.ts";
import { supabaseAdmin }            from "@/supabaseAdminClient.ts";
import { 
    getAuthenticatedUser, 
    requireRole,
    errorResponse,
    successResponse }               from "@/middleware/auth.ts";

