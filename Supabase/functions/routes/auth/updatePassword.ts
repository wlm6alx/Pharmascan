import { supabase } from "../../supabaseClient.ts";

export async function updatePassword(req: Request) {
    const { access_token, new_password} = await req.json();

    await supabase.auth.setSession({
        access_token,
        refresh_token: ""
    });

    const { error } = await supabase.auth.updateUser({ password: new_password });

    if (error)
        return new Response(JSON.stringify({ success: false, error: error.message}), { status: 400 });
    
    return new Response(JSON.stringify({ success: true }));
}