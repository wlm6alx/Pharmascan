import { supabase } from "../../../supabaseClient.ts";

/**
 * Remplacement du document
 */

export async function updateJustifPharmacien(username:string, document: string) {
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

    //  Update DB
    const { data, error } = await supabase
        .from("Justif_pharmacien")
        .update({
            updated_at: new Date().toISOString()
        })
        .eq("user_id", authUser.id)
        .eq("document_path", filePath)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return data;
}