import { supabase } from "../../supabaseClient.ts";

export async function updateUser(userId: string, updateFields: Record<string, any>) {
    const { data, error } = await supabase
        .from("users")
        .update(updateFields)
        .eq("id", userId);

    if (error) throw new Error(error.message);

    return data;
}