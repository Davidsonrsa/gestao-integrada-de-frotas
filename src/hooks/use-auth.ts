import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "colaborador" | "operador";

export interface NotasFiscaisPermissoes {
  visualizar: boolean;
  gerenciar: boolean;
}

export interface AuthState {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  role: AppRole | null;
  isAdmin: boolean;
  isOperador: boolean;
  fullName: string;
  notasFiscais: NotasFiscaisPermissoes & { autorizado: boolean };
}

const EMPTY_NF = { visualizar: false, gerenciar: false, autorizado: false };

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;

  // Perfil/permissões ficam em cache: não são recarregados a cada troca de aba
  const { data } = useQuery({
    queryKey: ["auth-profile", uid],
    enabled: !!uid,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [{ data: roles }, { data: prof }, { data: nfPerms }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase.from("profiles").select("full_name").eq("id", uid!).maybeSingle(),
        supabase
          .from("notas_fiscais_permissoes")
          .select("visualizar,gerenciar")
          .eq("user_id", uid!)
          .maybeSingle(),
      ]);

      const isAdmin = roles?.some((r) => r.role === "admin") ?? false;
      const isOperador = !isAdmin && (roles?.some((r) => r.role === "operador") ?? false);
      const nfPermission = nfPerms as NotasFiscaisPermissoes | null;

      return {
        role: (isAdmin ? "admin" : isOperador ? "operador" : "colaborador") as AppRole,
        fullName: prof?.full_name ?? "",
        notasFiscais: {
          visualizar: nfPermission?.visualizar ?? false,
          gerenciar: nfPermission?.gerenciar ?? false,
          autorizado: (nfPermission?.visualizar ?? false) || (nfPermission?.gerenciar ?? false),
        },
      };
    },
  });

  return {
    loading: loadingSession,
    session,
    userId: uid,
    role: data?.role ?? null,
    isAdmin: data?.role === "admin",
    isOperador: data?.role === "operador",
    fullName: data?.fullName ?? "",
    notasFiscais: data?.notasFiscais ?? EMPTY_NF,
  };
}
