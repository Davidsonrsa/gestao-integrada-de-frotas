CREATE TABLE public.frota_catalogos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  link text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.frota_catalogos TO authenticated;
GRANT ALL ON public.frota_catalogos TO service_role;

ALTER TABLE public.frota_catalogos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogos visiveis para autenticados"
  ON public.frota_catalogos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin insere catalogos"
  ON public.frota_catalogos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza catalogos"
  ON public.frota_catalogos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin exclui catalogos"
  ON public.frota_catalogos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));