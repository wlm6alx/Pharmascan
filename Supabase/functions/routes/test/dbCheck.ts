import { supabase } from "@/supabaseClient.ts";

export async function dbCheck(): Promise<Response> {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .limit(1);

    if (error) {
        console.error("DB ERROR:", error);
        return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { "Content-Type": "application/json" } }
    );
}