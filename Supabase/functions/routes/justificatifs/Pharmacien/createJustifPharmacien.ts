/**import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
);
*/

/**
 * Création du justificatif pharmacien
 */
/**export async function createJustifPharmacien(req: Request): Promise<Response> {
    try {
        //  1. Vérification authentification
        const authHeader = req.headers.get("Authorization!");
        if (!authHeader) {
            return new Response("Non authentifié.", { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "");

        const { data: authData, error: authError } = await supabase.auth.getUser(token);

        if (authError || ! authData.user) {
            return new Response("Utilisateur invalide.", { status: 401 });
        }

        const userId = authData.user.id;

        //  2. Vérification rôle pharmacien
        const { data: user } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (user?.role !== "pharmacien") {
            return new Response(
                "Seuls les pharmaciens peuvent fournir un justificatif.",
                { status: 403 }
            );
        }

        //  3. Données du justificatif
        const { document_path } = await req.json();

        if(!document_path) {
            return new Response(
                "document_path requis.",
                { status: 400 }
            );
        }

        //  4. Insertion justificatif
        const { error: insertError } = await supabase
            .from("jsutif_pharmacien")
            .insert({
                user_id: userId,
                document_path
            });
        
        if (insertError) {
            throw insertError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Justificatif pharmacien enregistré."
            }),
            { status: 201 }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : "Erreur inconnue."
            }),
            { status: 500 }
        );
    }   
}
*/

import { supabase } from "../../../supabaseClient.ts";

/**
 * Création d'un justificatif pharmacien
 *  - Upload du document dans Supabase Storage privé
 *  - Insertion des métadonnées dans la table justif_pharmacien
 */
export async function createJustifPharmacien(document: string, username: string): Promise<Response> {
    try {
            
        //  1. Vérification authentification
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Utilisatteur non authentifié");
    
        const authUser = authData.user;
        const { data: userRow, error: userError} = await supabase
            .from("user")
            .select("username")
            .eq("id", authUser.id)
            .single();

        if(userError || !userRow) {
            throw new Error("Utilisateur introuvalble!");
        }

        if (userRow?.username !== username) {
            throw new Error("Accès refusé (Mauvais utilisateur)!");
        }
    
        //  2. FilePath
        const file = `${authUser.id}/${document}`;

        if (!username || !document) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Paramètres manquants."
                }),
                { status: 400 }
            );
        }

        //  3. Upload vers Supabase Storage (bucket privé)
        const { error: UploadError } = await supabase.storage
            .from("pharmacien_justif")
            .upload(file, document);

        if (UploadError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: UploadError.message
                }),
                { status: 500 }
            );
        }

        //  4. insérer la ligne dans la table justif_pharmacien
        const { data, error: insertError } = await supabase
            .from("justif_pharmacien")
            .insert({
                user_id: authUser.id,
                document_path: file,
                create_at: new Date().toISOString(),
                update_at: new Date().toISOString()
            })
            .select()
            .single();
        if (insertError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: insertError.message
                }),
                { status: 500 }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Justificatif ajouté avec succès.",
                justificatif: data
            }),
            { status: 201 }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Erreur inconnue!"
            }),
            { status: 500 }
        );
    }
}