import { supabase } from "@/integrations/supabase/client";

// As tabelas do módulo de estoque ainda não constam nos tipos gerados do banco.
// O cliente continua respeitando a sessão e todas as políticas de acesso.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const estoqueDb = supabase as any;