CREATE POLICY "authenticated read estoque fotos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'estoque-fotos');

CREATE POLICY "authenticated write estoque fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'estoque-fotos');

CREATE POLICY "authenticated delete estoque fotos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'estoque-fotos');