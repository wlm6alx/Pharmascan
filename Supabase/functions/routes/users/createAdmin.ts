import { supabase } from "../../supabaseClient.ts";

export async function createAdmin(email: string, password: string) {
    //  Verifier si l'admin existe déjà
    const { data: existingAdmin } = await supabase
        .from("users")
        .select("*")
        .eq("role", "admin")
        .maybeSingle();

    if (existingAdmin) return existingAdmin;

    //  Créer admin via Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) throw new Error(error.message);

    //  Créer profil public
    const {error: insertError } = await supabase
        .from("users")
        .insert({
            id: data.user.id,
            name: "Admin",
            surname: "",
            username: "admin",
            email,
            role: "admin",
            userState: true
    });

    if (insertError) throw new Error(insertError.message);

    return data.user;
}