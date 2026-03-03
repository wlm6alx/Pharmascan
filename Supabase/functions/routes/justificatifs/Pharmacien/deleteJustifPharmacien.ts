import { supabase } from "../../../supabaseClient.ts";

export async function deleteJustifPharmacien(
  documentName: string,
  username: string
) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("Non authentifié");

  const userId = authData.user.id;

  const { data: userRow } = await supabase
    .from("users")
    .select("username")
    .eq("id", userId)
    .single();

  if (userRow?.username !== username) {
    throw new Error("Accès refusé");
  }

  const documentPath = `${userId}/${documentName}`;

  // 1️⃣ Suppression du fichier Storage
  const { error: storageError } = await supabase.storage
    .from("pharmacien_justifs")
    .remove([documentPath]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  // 2️⃣ Suppression DB
  const { error: dbError } = await supabase
    .from("justif_pharmacien")
    .delete()
    .eq("user_id", userId)
    .eq("document_path", documentPath);

  if (dbError) {
    throw new Error(dbError.message);
  }

  return { success: true };
}
