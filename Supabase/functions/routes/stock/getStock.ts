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
    errorResponse,
    successResponse }               from "@/middleware/auth.ts";


export async function getStock(req: Request): Promise<Response> {
    try {
        const url       = new URL(req.url);
        const name      = url.searchParams.get("name");
        const adress    = url.searchParams.get("adress");
        const ville     = url.searchParams.get("ville");
        const quartier  = url.searchParams.get("quartier");
        const phone     = url.searchParams.get("phone");

        if (!name || !adress || !ville || !quartier || !phone) {
            return errorResponse(
                "Identifiant(s) obligatoire(s) absent.",
                400
            );
        }

        //  --- Résolution identifiant -> Pharmacie_id  ---------
        const { data: pharamcie } = await supabaseAdmin
            .from("pharmacie")
            .select("pharmacie_id")
            .eq("name", name)
            .eq("adress", adress)
            .eq("ville", ville)
            .eq("quartier", quartier)
            .eq("phone", phone)
            .eq("exist", true)
            .eq("validate", true)
            .maybeSingle();

        if (!pharamcie) {
            return errorResponse(
                "Pharmacie introuvable ou non validée.",
                404
            );
        }

        //  --- Lecture depuis la vue publique (stock_public_view) -
        //  La vue expose uniquement stock_id, medicament_id, pharmacy_id, available
        //  Les UUIDs sont nécessaires en interne pour les jointures
        const { data: stock, error } = await supabase
            .from("stock_public_view")
            .select("available")                        //  Exposition minimale - pas les UUIDs
            .eq("pharmacy_id", pharamcie.pharmacie_id);

        if (error) return errorResponse(
            `Erreur: ${error.message}`,
            500
        );

        //  --- Jointure pour afficher les noms des médicaments ---
        //  Requête enrichie avec les noms (sans exposer les UUIDs)
        const { data: enrichedStock } = await supabaseAdmin
            .frfom("stockMedicament")
            .select(`
                quantity,
                price,
                available,
                update_at,
                medicament:medicament_id(
                    name, categorie, description
                )
            `)
            .eq("pharmacy_id", pharamcie.pharmacie_id)
            .eq("available", true);

        return successResponse({ stock: enrichedStock ?? [] });
    } catch(err) {
        return errorResponse(err instanceof Error ? err.message : "Erreur inattendue", 500);
    }
}