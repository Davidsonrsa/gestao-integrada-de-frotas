ALTER TABLE public.profiles ADD COLUMN acesso_medicoes boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.acesso_medicoes IS 'false = usuário bloqueado no módulo de Medições (tela e banco)';

CREATE OR REPLACE FUNCTION public.can_access_medicoes()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT acesso_medicoes FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

DROP POLICY IF EXISTS medicoes_diarias_admin_select ON public.medicoes_diarias;
DROP POLICY IF EXISTS medicoes_diarias_admin_insert ON public.medicoes_diarias;
DROP POLICY IF EXISTS medicoes_diarias_admin_update ON public.medicoes_diarias;
DROP POLICY IF EXISTS medicoes_diarias_admin_delete ON public.medicoes_diarias;

CREATE POLICY medicoes_diarias_admin_select ON public.medicoes_diarias
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_medicoes());

CREATE POLICY medicoes_diarias_admin_insert ON public.medicoes_diarias
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_medicoes());

CREATE POLICY medicoes_diarias_admin_update ON public.medicoes_diarias
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_medicoes())
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_medicoes());

CREATE POLICY medicoes_diarias_admin_delete ON public.medicoes_diarias
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_medicoes());