import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
);

/**
 * Création du profil patient
 * L'utilisateur doit déjà exister dans public.user avec user.role == 'patient'
 */
export async function createPatient(req: Request): Promise<Response> {
    try {
        const authHeader = req.headers.get("Authorization");
        if(!authHeader) {
            return new Response("Non authentifié.",
                { status: 401 }
            );
        }

        const token = authHeader.replace("Bearer ", "");

        //  1. Vérification utilisateur
        const { data: authData, error: authError } = await supabase.auth.getUser(token);

        if (authError || !authData.user) {
            return new Response("Utilisateur invalide.", { status: 401 });
        }

        const userId = authData.user.id;

        //  2. Vérification role
        const { data: user } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (user?.role !== "patient") {
            return new Response(
                "Création patient refusé (rôle invalide).",
                { status: 403 }
            );
        }

        //  3. Données patient
        const {
            gender,
            birthDate,
            urgence_phone,
            adress
        } = await req.json();

        //  4. Insertion patient
        const { error: insertError } = await supabase
        .from("patients")
        .insert({
            user_id: userId,
            gender,
            birthDate,
            urgence_phone,
            adress
        });

        if (insertError) {
            throw insertError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Profil patient créé."
            }),
            { status: 201 }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : "Erreur inconnue"
            }),
            { status: 500 }
        );
    }    
}