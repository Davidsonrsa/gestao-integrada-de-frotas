ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS horimetro_atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS horimetro_endereco text;

CREATE OR REPLACE FUNCTION public.equipamentos_enforce_horimeter_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.horimetro_atualizado_em IS DISTINCT FROM OLD.horimetro_atualizado_em OR
    NEW.horimetro_endereco IS DISTINCT FROM OLD.horimetro_endereco
  ) AND NEW.horimetro_atual IS NOT DISTINCT FROM OLD.horimetro_atual THEN
    RAISE EXCEPTION 'A localização e o horário só podem ser alterados junto com o horímetro';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipamentos_horimeter_metadata ON public.equipamentos;
CREATE TRIGGER equipamentos_horimeter_metadata
BEFORE UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.equipamentos_enforce_horimeter_metadata();
