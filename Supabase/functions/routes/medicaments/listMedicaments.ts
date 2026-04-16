/**
 * =====================================================================================
 *  routes/medicaments/listMedicaments.ts  —  GET /medicaments
 * =====================================================================================
 *
 * Liste publique des médicaments visibles.
 *
 * POLITIQUE RLS :
 *  "Public can visible medicaments" FOR SELECT USING (visibility = true)
 *  → Client ANON suffit — pas d'authentification requise.
 *
 * FILTRES DISPONIBLES (query params) :
 *  ?name=<string>          Recherche partielle sur le nom (ILIKE)
 *  ?categorie=<string>     Filtre par catégorie (correspondance exacte)
 *
 * ACCÈS : Public — aucun JWT requis.
 *
 * RÉPONSE SUCCÈS 200 :
 *  { success: true, data: [{ medicament_id, name, categorie, description,
 *                             image_path, date_fabricate, date_expirate, created_at }] }
 *
 * =====================================================================================
 */

import { supabase }                             from "@/supabaseClient.ts";
import { successResponse, errorResponse }       from "@/middleware/auth.ts";

// =====================================================================================
//  Handler principal
// =====================================================================================

/**
 * Gère GET /medicaments.
 *
 * @param req   Requête HTTP entrante
 * @returns     Response JSON standardisée
 */
export async function listMedicaments(req: Request): Promise<Response> {

    //  --- Etape 1 :   Extraction des filtres depuis l'URL  ------------------------
    const url       = new URL(req.url);
    const name      = url.searchParams.get("name")?.trim()      ?? null;
    const categorie = url.searchParams.get("categorie")?.trim() ?? null;

    //  --- Etape 2 :   Construction de la requête  ---------------------------------
    //  Client ANON — RLS "Public can visible medicaments" (visibility = true) active.
    //  codeQR (UUID interne) n'est pas exposé dans la liste publique.
    let query = supabase
        .from("medicament")
        .select("medicament_id, name, categorie, description, image_path, date_fabricate, date_expirate, created_at")
        .eq("visibility", true)             //  défense en profondeur — redondant avec RLS
        .order("created_at", { ascending: false });

    //  Filtre optionnel par nom (recherche partielle insensible à la casse)
    if (name) {
        query = query.ilike("name", `%${name}%`);
    }

    //  Filtre optionnel par catégorie (correspondance exacte)
    if (categorie) {
        query = query.eq("categorie", categorie);
    }

    //  --- Etape 3 :   Exécution  --------------------------------------------------
    const { data: medicaments, error } = await query;

    if (error) {
        return errorResponse("Impossible de récupérer la liste des médicaments.", 500);
    }

    return successResponse(
        medicaments ?? [],
        `${medicaments?.length ?? 0} médicament(s) trouvé(s).`,
        200
    );
}