// import { supabase } from "../../supabaseClient.ts";

/**
 *  réinitialise ou crée un utilisateur admin
 * @param req Requête HTTP contenant {email}
 * 
 */

/**export async function resetAdmin (req: Request): Promise<Response> {
    try{
        const { email } = await req.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Email d\'admin actuel manquant"
                }),
                {status: 400}
            );
        }

        //  1. Vérification existance d'admin
        const { data: existingAdmin } = await supabase
        .from("users")
        .select("*")
        .eq("role", 'admin')
        .maybeSingle();

        if (existingAdmin) {
            //  Delete the last admin account
            const { error: delError } = await supabase
                .from("users")
                .delete()
                .eq("id", existingAdmin.id);

            if (delError) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        step: "check_username",
                        error: delError.message
                    }),
                    {status: 500}
                );
            }
        }

        //  2. Création d'admin Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: "admin",
            //  L'utilisateur doit confirmer par l'email
            email_confirm: false
        });

        if(authError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    step: "auth",
                    error: authError.message
                }),
                {status: 400}
            );
        }

        //  3. Insertion profil public
        const { error: insertError } = await supabase
            .from("users")
            .insert({
            id: authData.user.id,
            name: "Administrateur",
            surname: null,
            phone: null,
            username: "administrateur",
            email: email,
            role: "admin",
            userState: true
        });

        if (insertError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    step: "db",
                    error: insertError.message
                }),
                {status: 500}
            );
        }

        //  Réponse finale
        return new Response(
            JSON.stringify({
                success:true,
                message: "Administrateur réinitialisé"
            }),
            { status: 201 }
        );
    } catch (err: unknown) {
        let message = "Unknown error";

        if (err instanceof Error) {
            message = err.message;
        }

        return new Response(
            JSON.stringify({
                success: false,
                step: "global",
                error: message
            }),
            {status: 500}
        );
    }
};
**/

import { createClient } from "@supabase/supabase-js";

const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
);

const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Réinitialise ou crée l'administrateur unique
 * Autorisé UNIQUEMENT :
 *  - par un admin authentifié
 *  - OU par le backend (service_role)
 */

export async function resetAdmin(req: Request): Promise<Response> {
    try {
        const { email } = await req.json();

        if (!email) {
            return new Response(
                JSON.stringify({
                    error: "Email requis."
                }),
                { status: 400 }
            );
        }

        //  1. Vérification appelant
        const authHeader = req.headers.get("Authorization");
        let isServiceCall = false;

        if (!authHeader) {
            //  Pas de JWT -> uniquement backend autorisé
            isServiceCall = true;
        }

        if (!isServiceCall) {
            const token = authHeader?.replace("Bearer ", "");

            const { data: authData, error } = await supabaseAnon.auth.getUser(token);

            if (error || !authData.user) {
                return new Response(
                    JSON.stringify({
                        error: "Authentification invalide."
                    }),
                    { status: 401 }
                );
            }

            const {data: user } = await supabaseAnon
                .from("users")
                .select("role")
                .eq("id", authData.user.id)
                .single();

            if (user?.role !== "admin") {
                return new Response(
                    JSON.stringify({
                        error: "Accès réservé à l\'admin."
                    }),
                    { status: 403 }
                );
            }
        }

        //  2. Recherche admin existant
        const { data: existingAdmin } = await supabaseService
            .from("users")
            .select("id")
            .eq("role", "admin")
            .maybeSingle();

        if (existingAdmin) {
            //  Pas de delete (interdit par trigger)
            //  downgradde l'ancien admin
            await supabaseService
                .from("users")
                .update({
                    role: "authenticated",
                    userState: false
                })
                .eq("id", existingAdmin.id);
        }

        //  3. Création Auth admin
        const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
            email,
            password: "admin",
            email_confirm: false
        });

        if (authError || !authData.user) {
            throw authError;
        }

        //  4. Profil public admin
        await supabaseService.from("users").insert({
            id: authData.user.id,
            name: "Administrateur",
            username: "administrateur",
            email,
            role: "admin",
            userState: true
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Administrateur réinitialisé."
            }),
            { status: 201 }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message: "Erreur inconnue."
            }),
            { status: 500 }
        );
    }
}