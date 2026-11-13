ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS h_implemento numeric,
  ADD COLUMN IF NOT EXISTS h_implemento_revisao numeric,
  ADD COLUMN IF NOT EXISTS proxima_manutencao_implemento numeric;

COMMENT ON COLUMN public.equipamentos.h_implemento IS 'Horimetro atual do implemento (RV-01/02/03)';
COMMENT ON COLUMN public.equipamentos.h_implemento_revisao IS 'Horimetro do implemento na ultima manutencao';
COMMENT ON COLUMN public.equipamentos.proxima_manutencao_implemento IS 'Horimetro do implemento da proxima manutencao';