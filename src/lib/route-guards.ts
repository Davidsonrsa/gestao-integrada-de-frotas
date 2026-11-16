import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireAdmin() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw redirect({ to: "/auth" });

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  if (!roles?.some((item) => item.role === "admin")) {
    throw redirect({ to: "/" });
  }
}

/** Admin com acesso a Medições liberado (profiles.acesso_medicoes). */
export async function requireAcessoMedicoes() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw redirect({ to: "/auth" });

  const [{ data: roles }, { data: perfil }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("acesso_medicoes").eq("id", userId).maybeSingle(),
  ]);

  const isAdmin = roles?.some((item) => item.role === "admin") ?? false;
  if (!isAdmin || perfil?.acesso_medicoes === false) {
    throw redirect({ to: "/" });
  }
}

/** Operador só pode acessar a tela Frota e as páginas dos equipamentos designados. */
export function operadorPodeAcessar(pathname: string): boolean {
  return pathname === "/equipamentos" || pathname.startsWith("/equipamentos/");
}

/** Redireciona o operador para a Frota ao tentar abrir outra tela. */
export async function bloquearOperadorForaDaFrota(userId: string, pathname: string) {
  if (operadorPodeAcessar(pathname)) return;
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isOperador =
    (roles?.some((item) => item.role === "operador") ?? false) &&
    !(roles?.some((item) => item.role === "admin") ?? false);
  if (isOperador) throw redirect({ to: "/equipamentos" });
}
