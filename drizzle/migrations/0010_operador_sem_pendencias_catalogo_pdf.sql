DROP POLICY manutencao_pendencias_insert_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_insert_auth ON public.manutencao_pendencias FOR INSERT TO authenticated
WITH CHECK (NOT private.has_role(auth.uid(), 'operador'));

ALTER TABLE public.frota_catalogos ALTER COLUMN link DROP NOT NULL;
ALTER TABLE public.frota_catalogos ADD COLUMN IF NOT EXISTS arquivo_path text;

CREATE POLICY "authenticated read frota catalogos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'frota-catalogos');

CREATE POLICY "admin write frota catalogos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'frota-catalogos' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete frota catalogos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'frota-catalogos' AND private.has_role(auth.uid(), 'admin'));