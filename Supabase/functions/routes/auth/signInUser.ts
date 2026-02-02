import { supabase } from "../../supabaseClient.ts";

export async function getUser(userId: string) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // retourne null si non trouvé
    
        if (error) throw new Error(error.message);

        return data;
}