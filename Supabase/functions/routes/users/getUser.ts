import { supabase } from "../../supabaseClient.ts";
import type { User } from "../types/User.ts";

type UserUpdate = Partial <
    Pick<User, "name" | "surname" | "phone" | 'username' | 'userState'>
>;

export async function updateUser(userId: string, updateFields: UserUpdate) {
    const { data, error } = await supabase
        .from("users")
        .update(updateFields)
        .eq("id", userId);
        
    if (error) throw new Error(error.message);

    return data;
}