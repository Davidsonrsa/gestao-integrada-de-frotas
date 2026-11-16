CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','colaborador'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

DO $$
DECLARE r record; q text; c text; stmt text;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('estoque_produtos','estoque_entrada_itens','estoque_transferencias','estoque_categorias','estoque_pneus','estoque_inventarios','estoque_saidas','estoque_localizacoes','estoque_entradas','estoque_movimentacoes','estoque_fornecedores','estoque_saida_itens','contratos','frota_catalogos','contrato_custos','fornecedor_contatos','fornecedores','manutencao_historico','classificacoes_financeiras','equipamento_fotos')
  LOOP
    q := r.qual; c := r.with_check; stmt := '';
    IF q IN ('true','(auth.uid() IS NOT NULL)') THEN stmt := stmt || ' USING (public.is_staff())'; END IF;
    IF c IN ('true','(auth.uid() IS NOT NULL)') THEN stmt := stmt || ' WITH CHECK (public.is_staff())'; END IF;
    IF r.cmd = 'ALL' AND q = 'true' AND c IS NULL THEN stmt := stmt || ' WITH CHECK (public.is_staff())'; END IF;
    IF stmt <> '' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename) || stmt;
    END IF;
  END LOOP;

  FOR r IN SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
    AND (coalesce(qual,'') ~ '(estoque-fotos|equipamento-fotos|frota-catalogos)' OR coalesce(with_check,'') ~ '(estoque-fotos|equipamento-fotos|frota-catalogos)')
  LOOP
    stmt := '';
    IF r.qual IS NOT NULL AND r.qual !~ 'has_role' THEN stmt := stmt || format(' USING ((%s) AND public.is_staff())', r.qual); END IF;
    IF r.with_check IS NOT NULL AND r.with_check !~ 'has_role' THEN stmt := stmt || format(' WITH CHECK ((%s) AND public.is_staff())', r.with_check); END IF;
    IF stmt <> '' THEN
      EXECUTE format('ALTER POLICY %I ON storage.objects', r.policyname) || stmt;
    END IF;
  END LOOP;
END $$;

ALTER POLICY equip_update_auth ON public.equipamentos
  USING (public.is_staff() OR EXISTS (SELECT 1 FROM public.operador_equipamentos oe WHERE oe.equipamento_id = equipamentos.id AND oe.user_id = auth.uid()))
  WITH CHECK (public.is_staff() OR EXISTS (SELECT 1 FROM public.operador_equipamentos oe WHERE oe.equipamento_id = equipamentos.id AND oe.user_id = auth.uid()));