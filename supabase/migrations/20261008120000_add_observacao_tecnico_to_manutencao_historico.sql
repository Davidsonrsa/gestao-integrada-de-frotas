ALTER TABLE public.manutencao_historico
  ADD COLUMN IF NOT EXISTS observacao_tecnico text;
