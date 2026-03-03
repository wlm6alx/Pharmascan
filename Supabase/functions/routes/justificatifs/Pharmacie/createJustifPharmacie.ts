import { supabase } from "../../../supabaseClient.ts";

/**
 * Création d'un justificatif pharmacie
 *  - Upload du document dans Supabase Storage privé
 *  - Insertion des métadonnées dans la table justif_pharmacie
 */
export async function createJustifPharmacie(document: string, username: string): Promise<Response> {
    try {
        //  1. Vérification authentification
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Utilisateur non authentiié!");
        
        const authUser = authData.user;
        const { data: userRow, error: userError } = await supabase
            .from("user")
            .select("username")
            .eq("id", authUser.id)
            .single();

        if (userError || !userRow) {
            throw new Error("Utilisateur introuvable!");
        }

        if (userRow?.username !== username) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Accès refusé (mauvais utilisateur)!"
                }),
                { status: 401 }
            );
        }

        //  2. Vérification du rôle
        if (authUser.role !== "pharmacien") {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Accès refusé (rôle pharmacien nécessaire)!"
                }),
                { status: 401 }
            );
        }

        //  3. FilePath
        const file = `${authUser.id}/${document}`;

        if(!username || !document) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Paramètres manquants."
                }),
                { status: 400 }
            );
        }

        //  4. Upload vers Supabase Storage (bucket privé)
        const { error: UploadError } = await supabase.storage
            .from("pharmacie_justif")
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

        //  5. Insérer la ligne dans la table justif_pharamacie (to see new)
        const { data, error: insertError } = await supabase
            .from("justif_pharmacie")
            .insert({
                user_id: authUser.id,
                document_path: file,
                create_at: new Date().toISOString()
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
                error: err instanceof Error ? err.message: "Erreur inconnue!"
            }),
            { status: 500 }
        );
    }
}