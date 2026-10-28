DO $$
BEGIN
  IF EXISTS (
    SELECT equipamento_id
    FROM public.operador_equipamentos
    GROUP BY equipamento_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Há equipamentos vinculados a mais de um operador. Corrija os vínculos duplicados antes de aplicar esta migration.';
  END IF;

  IF EXISTS (
    SELECT user_id
    FROM public.operador_equipamentos
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Há operadores vinculados a mais de um equipamento. Corrija os vínculos duplicados antes de aplicar esta migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS operador_equipamentos_equipamento_id_key
  ON public.operador_equipamentos (equipamento_id);

CREATE UNIQUE INDEX IF NOT EXISTS operador_equipamentos_user_id_key
  ON public.operador_equipamentos (user_id);
