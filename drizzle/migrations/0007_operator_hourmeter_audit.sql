CREATE TABLE public.horimetro_historico (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 equipamento_id uuid NOT NULL,
 operador_id uuid NOT NULL,
 equipamento_numero text NOT NULL,
 equipamento_cl text,
 operador_nome text NOT NULL,
 horimetro_anterior numeric,
 horimetro_atual numeric,
 data_horimetro date,
 registrado_em timestamptz NOT NULL DEFAULT now(),
 endereco text
);
GRANT SELECT ON public.horimetro_historico TO authenticated;
GRANT SELECT ON public.horimetro_historico TO service_role;
ALTER TABLE public.horimetro_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY horimetro_historico_admin_select ON public.horimetro_historico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX horimetro_historico_periodo_idx ON public.horimetro_historico (registrado_em DESC);
CREATE INDEX horimetro_historico_operador_idx ON public.horimetro_historico (operador_id, registrado_em DESC);
CREATE OR REPLACE FUNCTION public.registrar_horimetro_operador() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'operador') AND NOT public.has_role(auth.uid(), 'admin') AND (NEW.horimetro_atual IS DISTINCT FROM OLD.horimetro_atual OR NEW.data_horimetro_atual IS DISTINCT FROM OLD.data_horimetro_atual) THEN
  INSERT INTO public.horimetro_historico (equipamento_id, operador_id, equipamento_numero, equipamento_cl, operador_nome, horimetro_anterior, horimetro_atual, data_horimetro, registrado_em, endereco)
  VALUES (NEW.id, auth.uid(), NEW.numero, NEW.cl, COALESCE((SELECT full_name FROM public.profiles WHERE id=auth.uid()), 'Operador'), OLD.horimetro_atual, NEW.horimetro_atual, NEW.data_horimetro_atual, now(), NEW.horimetro_endereco);
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_horimetro_operador() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER equipamentos_horimetro_audit AFTER UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.registrar_horimetro_operador();
COMMENT ON TABLE public.horimetro_historico IS 'Immutable operator hourmeter audit. Snapshot values survive equipment/user removal; administrators alone may read. Records begin when auditing is enabled.';