import { serve } from "https://deno.land/std@0.95.0/http/server.ts";
import { registerUser } from "./routes/auth/registerUser.ts";
import { loginUser } from "./routes/auth/loginUser.ts";
import { resetPassword } from "./routes/auth/resetPassword.ts";
import { updatePassword } from "./routes/auth/updatePassword.ts";

serve(async (req: Request) => {
    const url = new URL(req.url);
    const { pathname } = new URL(req.url);

    if (req.method === "POST" && pathname === "/auth/register") return registerUser(req);
    if (req.method === "POST" && pathname === "/auth/login") return loginUser(req);
    if (req.method === "POST" && url.pathname === "/auth/resetPassword") return resetPassword(req);
    if (req.method === "POST" && pathname === "/auth/update-password") return updatePassword(req);
    
    return new Response(JSON.stringify({ error: "Route inconnue" }), { status: 404});
});