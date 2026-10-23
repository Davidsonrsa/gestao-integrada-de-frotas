import { supabase } from "@/integrations/supabase/client";

export const ESTOQUE_FOTOS_BUCKET = "estoque-fotos";

export async function uploadEstoqueFoto(tipo: "produtos" | "pneus", file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${tipo}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(ESTOQUE_FOTOS_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getEstoqueFotoUrl(path?: string | null) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(ESTOQUE_FOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function getEstoqueFotoUrls(paths: (string | null | undefined)[]) {
  const valid = paths.filter((p): p is string => Boolean(p));
  const entries = await Promise.all(
    valid.map(async (p) => [p, await getEstoqueFotoUrl(p)] as const),
  );
  return new Map(entries.filter(([, url]) => Boolean(url)) as [string, string][]);
}
