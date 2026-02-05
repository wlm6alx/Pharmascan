import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
);

/**
 * Création du profil pharmacien
 * L'utilisateur doit déjà exister dans public.user avec user.role == 'pharmacien'
 * Justificatif requis AVANT
 */
export async function createPharmacien(req: Request): Promise<Response> {
    try {
        const authHeader = req.headers.get("Authorization!");
        if (!authHeader) {
            return new Response("Non authentifié.", { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");

        //  1. Vérification utilisateur
        const { data: authData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !authData.user) {
            return new Response("Utilisateur invalide", { status: 401 });
        }

        const userId = authData.user.id;

        //  2. Vérification rôle
        const { data: user } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (user?.role !== "pharmacien") {
            return new Response(
                "Création pharmacien reusée (rôle invalide).",
                { status: 403 }
            );
        }

        //  3. Vérification justificatif
        const { data: justif } = await supabase
            .from("Justif_pharmacien")
            .select("justif_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (!justif) {
            return new Response(
                "Justificatif pharmacien manquant.",
                { status: 400 }
            );
        }

        //  4. Données pharmacien
        const { pharmacie_id, responsability } = await req.json();

        //  5. Insertion pharmacien
        const { error: insertError } = await supabase
            .from("pharmacien")
            .insert({
                user_id: userId,
                pharmacie_id: pharmacie_id ?? null,
                responsability
            });
        
        if (insertError) {
            throw insertError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Profil pharmacien créé"
            }),
            { status: 201 }
        );
    } catch (err) {
        return  new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : "Erreur inconnue."
            }),
            { status: 500 }
        );
    }
}