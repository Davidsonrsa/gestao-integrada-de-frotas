CREATE OR REPLACE FUNCTION public.require_operator_hourmeter_location()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND private.has_role(auth.uid(), 'operador')
     AND NOT private.has_role(auth.uid(), 'admin')
     AND (NEW.horimetro_atual IS DISTINCT FROM OLD.horimetro_atual
          OR NEW.data_horimetro_atual IS DISTINCT FROM OLD.data_horimetro_atual)
  THEN
    IF NULLIF(btrim(NEW.horimetro_endereco), '') IS NULL
       OR NEW.horimetro_atualizado_em IS NULL
       OR NEW.horimetro_atualizado_em IS NOT DISTINCT FROM OLD.horimetro_atualizado_em
    THEN
      RAISE EXCEPTION 'Ative a localização do celular e permita o acesso à localização para salvar o horímetro.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_operator_hourmeter_location() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_operator_hourmeter_location BEFORE UPDATE ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.require_operator_hourmeter_location();