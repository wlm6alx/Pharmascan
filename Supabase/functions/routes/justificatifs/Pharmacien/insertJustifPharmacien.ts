import { supabase } from "../../../supabaseClient.ts";

/**
 * Cas d'insertion sans re-upload (migration, admin)
 * @param params 
 */

export async function insertJustifPharamcien(username: string, document:string) {

    
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
    const filePath = `${authUser.id}/${document}`;

    //  3. Insertion
    const { data, error: insertError } = await supabase
        .from("justif_pharmacien")
        .insert({
            user_id: authUser.id,
            document_path: filePath,
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
    )
}