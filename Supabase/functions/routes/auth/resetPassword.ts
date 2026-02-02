import { supabase } from "../../supabaseClient.ts";

export async function resetPassword(req: Request): Promise<Response> {
    try{
        const { email, lastPage } = await req.json();

        if(!email) {
            return new Response(
                JSON.stringify({ success: false, error: "Email manquant"}),
                {status: 400}
            );
        }

        const redirectUrl = 
            lastPage || "https://pharmascan.app/dashboard";

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if(error) {
            return new Response(
                JSON.stringify({ success: false, error: error.message}),
                { status: 400 }
            );
        }

        return new Response(
            JSON.stringify({ success: true, message: "Email de reinitialisation envoyé"}),
            { status: 200 }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ success: false, error: (err as Error).message}),
            { status: 500 }
        );
    }
}