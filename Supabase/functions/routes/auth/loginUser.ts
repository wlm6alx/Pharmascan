import { supabase } from "../../supabaseClient.ts";

export async function loginUser(req: Request) {
    const { email, password } = await req.json();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error)
        return new Response(JSON.stringify({ success: false, error: error.message}), { status: 401});

    return new Response(JSON.stringify({
        success: true,
        session: data.session
    }));
}