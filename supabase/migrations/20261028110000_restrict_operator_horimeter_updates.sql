CREATE TABLE IF NOT EXISTS public.operador_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, equipamento_id)
);

GRANT SELECT, INSERT, DELETE ON public.operador_equipamentos TO authenticated;
GRANT ALL ON public.operador_equipamentos TO service_role;
ALTER TABLE public.operador_equipamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_equip_select ON public.operador_equipamentos;
CREATE POLICY op_equip_select ON public.operador_equipamentos
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS op_equip_insert_admin ON public.operador_equipamentos;
CREATE POLICY op_equip_insert_admin ON public.operador_equipamentos
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS op_equip_delete_admin ON public.operador_equipamentos;
CREATE POLICY op_equip_delete_admin ON public.operador_equipamentos
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS equip_select_auth ON public.equipamentos;
CREATE POLICY equip_select_auth ON public.equipamentos
FOR SELECT TO authenticated
USING (
  NOT private.has_role(auth.uid(), 'operador'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.operador_equipamentos oe
    WHERE oe.equipamento_id = equipamentos.id
      AND oe.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS manutencao_pendencias_select_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_select_auth ON public.manutencao_pendencias
FOR SELECT TO authenticated
USING (
  NOT private.has_role(auth.uid(), 'operador'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.operador_equipamentos oe
    WHERE oe.equipamento_id = manutencao_pendencias.equipamento_id
      AND oe.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS manutencao_pendencias_insert_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_insert_auth ON public.manutencao_pendencias
FOR INSERT TO authenticated
WITH CHECK (
  NOT private.has_role(auth.uid(), 'operador'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.operador_equipamentos oe
    WHERE oe.equipamento_id = manutencao_pendencias.equipamento_id
      AND oe.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS manutencao_pendencias_update_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_update_auth ON public.manutencao_pendencias
FOR UPDATE TO authenticated
USING (NOT private.has_role(auth.uid(), 'operador'::public.app_role))
WITH CHECK (NOT private.has_role(auth.uid(), 'operador'::public.app_role));

DROP POLICY IF EXISTS manutencao_pendencias_delete_auth ON public.manutencao_pendencias;
CREATE POLICY manutencao_pendencias_delete_auth ON public.manutencao_pendencias
FOR DELETE TO authenticated
USING (NOT private.has_role(auth.uid(), 'operador'::public.app_role));

CREATE OR REPLACE FUNCTION public.equipamentos_enforce_field_perms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'operador'::public.app_role) THEN
    IF NEW.item IS DISTINCT FROM OLD.item OR
       NEW.cl IS DISTINCT FROM OLD.cl OR
       NEW.numero IS DISTINCT FROM OLD.numero OR
       NEW.cartao_ticket IS DISTINCT FROM OLD.cartao_ticket OR
       NEW.identificacao IS DISTINCT FROM OLD.identificacao OR
       NEW.afericao_taco IS DISTINCT FROM OLD.afericao_taco OR
       NEW.placa IS DISTINCT FROM OLD.placa OR
       NEW.ano IS DISTINCT FROM OLD.ano OR
       NEW.localizacao IS DISTINCT FROM OLD.localizacao OR
       NEW.operador_contato IS DISTINCT FROM OLD.operador_contato OR
       NEW.telefone IS DISTINCT FROM OLD.telefone OR
       NEW.cnh IS DISTINCT FROM OLD.cnh OR
       NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
       NEW.u_revisao IS DISTINCT FROM OLD.u_revisao OR
       NEW.h_revisao IS DISTINCT FROM OLD.h_revisao OR
       NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
       NEW.hr_rodado IS DISTINCT FROM OLD.hr_rodado OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.modelo IS DISTINCT FROM OLD.modelo OR
       NEW.limite_revisao IS DISTINCT FROM OLD.limite_revisao OR
       NEW.cover_storage_path IS DISTINCT FROM OLD.cover_storage_path OR
       NEW.observacoes IS DISTINCT FROM OLD.observacoes OR
       NEW.motor_oleo IS DISTINCT FROM OLD.motor_oleo OR
       NEW.hidraulico_oleo IS DISTINCT FROM OLD.hidraulico_oleo OR
       NEW.transmissao_oleo IS DISTINCT FROM OLD.transmissao_oleo OR
       NEW.eixo_oleo IS DISTINCT FROM OLD.eixo_oleo OR
       NEW.tandem_oleo IS DISTINCT FROM OLD.tandem_oleo OR
       NEW.filtro_lub IS DISTINCT FROM OLD.filtro_lub OR
       NEW.filtro_diesel_p IS DISTINCT FROM OLD.filtro_diesel_p OR
       NEW.filtro_diesel_s IS DISTINCT FROM OLD.filtro_diesel_s OR
       NEW.filtro_sep_agua IS DISTINCT FROM OLD.filtro_sep_agua OR
       NEW.filtro_ar_ext IS DISTINCT FROM OLD.filtro_ar_ext OR
       NEW.filtro_ar_int IS DISTINCT FROM OLD.filtro_ar_int OR
       NEW.filtro_trans IS DISTINCT FROM OLD.filtro_trans OR
       NEW.filtro_hidr IS DISTINCT FROM OLD.filtro_hidr OR
       NEW.filtro_respiro IS DISTINCT FROM OLD.filtro_respiro OR
       NEW.filtro_ar_cond1 IS DISTINCT FROM OLD.filtro_ar_cond1 OR
       NEW.filtro_ar_cond2 IS DISTINCT FROM OLD.filtro_ar_cond2
    THEN
      RAISE EXCEPTION 'Operador só pode alterar o horímetro atual e sua data';
    END IF;

    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    RETURN NEW;
  END IF;

  IF NEW.item IS DISTINCT FROM OLD.item OR
     NEW.cl IS DISTINCT FROM OLD.cl OR
     NEW.numero IS DISTINCT FROM OLD.numero OR
     NEW.cartao_ticket IS DISTINCT FROM OLD.cartao_ticket OR
     NEW.identificacao IS DISTINCT FROM OLD.identificacao OR
     NEW.afericao_taco IS DISTINCT FROM OLD.afericao_taco OR
     NEW.placa IS DISTINCT FROM OLD.placa OR
     NEW.ano IS DISTINCT FROM OLD.ano OR
     NEW.localizacao IS DISTINCT FROM OLD.localizacao OR
     NEW.operador_contato IS DISTINCT FROM OLD.operador_contato OR
     NEW.telefone IS DISTINCT FROM OLD.telefone OR
     NEW.cnh IS DISTINCT FROM OLD.cnh OR
     NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
     NEW.u_revisao IS DISTINCT FROM OLD.u_revisao OR
     NEW.h_revisao IS DISTINCT FROM OLD.h_revisao OR
     NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
     NEW.hr_rodado IS DISTINCT FROM OLD.hr_rodado OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.modelo IS DISTINCT FROM OLD.modelo OR
     NEW.limite_revisao IS DISTINCT FROM OLD.limite_revisao OR
     NEW.cover_storage_path IS DISTINCT FROM OLD.cover_storage_path
  THEN
    RAISE EXCEPTION 'Colaborador só pode alterar horímetro, observações, filtros e lubrificantes';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS equipamentos_operator_horimeter_only ON public.equipamentos;
DROP TRIGGER IF EXISTS equipamentos_field_perms ON public.equipamentos;
CREATE TRIGGER equipamentos_field_perms
BEFORE UPDATE ON public.equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.equipamentos_enforce_field_perms();
