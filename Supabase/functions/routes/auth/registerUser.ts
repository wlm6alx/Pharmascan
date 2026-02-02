import { supabase } from "../../supabaseClient.ts";

export async function registerUser (req: Request): Promise<Response> {
    try{
        const { name, surname, phone, username, email, password, role, userState } = await req.json();

        //  1. Vérification unicité username
        const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

        if (checkError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    step: "check_username",
                    error: checkError.message
                }),
                {status: 500}
            );
        }

        if(existingUser) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Username déjà utilisé"
                }),
                {status: 409}
            );
        }

        //  2. Création de Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
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
            name: name,
            surname: surname,
            phone: phone,
            username: username,
            email: email,
            role: role ?? "patient",
            userState: userState ?? true
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
                userId: authData.user.id
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