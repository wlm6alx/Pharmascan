/**
 *  =============================================================
 *  routes/stock/aaddStock.ts    -   Ajout d'un médicament au stck
 *  =============================================================
 * 
 * RÔLE :
 *  ermet à un harmacien d'ajuter un médicament au stck de sa harmacie.
 * 
 * ENDPOINT :   POST /stock
 * 
 * BODY JSON attendu:
 *  {
 *      //  Identifiants de la pharmacie
 *      name, adress, ville, quartier, phone
 *      //  Identifiants du médicament
 *      medicament_name, medicament_date_fabricate, medicament_date_expirate,
 *      //  Donnéers stock
 *      quantity: number,
 *      price?: number
 *  }
 *  
 *  =============================================================
 */
import { supabaseAdmin }            from "@/supabaseAdminClient.ts";
import { 
    getAuthenticatedUser, 
    requireRole,
    errorResponse,
    successResponse, 
    extractToken}               from "@/middleware/auth.ts";


export async function addStock(req: Request): Promise<Response> {
    try {
        const token = extractToken(req);
        const currentUser = await getAuthenticatedUser(token);
        if ("error" in currentUser) return errorResponse(currentUser.error, currentUser.status);
        requireRole(currentUser.user, ["pharmacien", "admin"]);

        const {
            name, adress, ville , quartier, phone, 
            medicament_name, medicament_date_fabricate, medicament_date_expirate, 
            quantity, price
        } = await req.json();

        if (!name || !adress || !ville || !quartier || !phone ||
            !medicament_name || !medicament_date_fabricate || !medicament_date_expirate ||
            quantity === undefined ) {
            return errorResponse(
                "Identifiant(s) obligatoire(s) absent.",
                400
            );
        }

        if (quantity < 0) {
            return errorResponse(
                "La quantité ne peut pas être négative.",
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

        const pharamcieId = pharamcie.pharmacie_id;

        //  --- Vérification appartenance (si non admin) --------
        if (currentUser.user.role !== "admin") {
            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("username", currentUser.user.username)
                .single();

            const { data: isLinked } = await supabaseAdmin
                .from("pharmacien")
                .select("user_id")
                .eq("user_id", userRow?.id)
                .eq("pharmacie_id", pharamcieId)
                .maybeSingle();

            if (!isLinked) return errorResponse(
                "Accès refusé.",
                403
            )
        }

        //  --- Résolution identifiants médicament -> médicament_id -
        const { data: medicament } = await supabaseAdmin
            .from("medicament")
            .select("medicament_id")
            .eq("name", medicament_name)
            .eq("date_fabricate", medicament_date_fabricate)
            .eq("date_expirate", medicament_date_expirate)
            .maybeSingle();

        if (!medicament) return errorResponse(
            "Médicament introuvable avec ces identifiants.",
            404
        );

        //  --- Insertion dans Stockmedicament ---------------------
        //  Le trigger trg_sync_available calcule automatiquement available selon quantity
        const { error: insertError } = await supabaseAdmin
            .from("stockMedicament")
            .insert({
                pharmacy_id: pharamcieId,
                medicament_id: medicament.medicament_id,
                quantity: quantity,
                price: price ?? null,
                updateé_at: new Date().toISOString(),
            });                        

        if (insertError) {
            return errorResponse(`Erreur lors de l'ajout au stock : ${insertError.message}`, 500);
        }

        return successResponse({ message: `${medicament_name} ajouté avec succès`});
    } catch(err) {
        return errorResponse(
            err instanceof Error ? err.message : "Erreur inattendue",
            err instanceof Error && err.message.includes("Non authentifié") ? 401 :
            err instanceof Error && err.message.includes("Accès refusé")? 403 : 500
        );
    }
}