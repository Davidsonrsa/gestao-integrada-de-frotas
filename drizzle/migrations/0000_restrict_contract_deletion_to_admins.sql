DROP POLICY IF EXISTS "Permitir exclusão em contratos" ON public.contratos;

DROP POLICY IF EXISTS contratos_admin_delete ON public.contratos;

CREATE POLICY contratos_admin_delete
ON public.contratos
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));