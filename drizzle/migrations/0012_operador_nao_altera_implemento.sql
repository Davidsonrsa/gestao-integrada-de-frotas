CREATE OR REPLACE FUNCTION public.equipamentos_enforce_field_perms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin') THEN
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'operador') THEN
    IF NEW.item              IS DISTINCT FROM OLD.item             OR
       NEW.cl                IS DISTINCT FROM OLD.cl               OR
       NEW.numero            IS DISTINCT FROM OLD.numero           OR
       NEW.cartao_ticket     IS DISTINCT FROM OLD.cartao_ticket    OR
       NEW.identificacao     IS DISTINCT FROM OLD.identificacao    OR
       NEW.afericao_taco     IS DISTINCT FROM OLD.afericao_taco    OR
       NEW.placa             IS DISTINCT FROM OLD.placa            OR
       NEW.ano               IS DISTINCT FROM OLD.ano              OR
       NEW.localizacao       IS DISTINCT FROM OLD.localizacao      OR
       NEW.operador_contato  IS DISTINCT FROM OLD.operador_contato OR
       NEW.telefone          IS DISTINCT FROM OLD.telefone         OR
       NEW.cnh               IS DISTINCT FROM OLD.cnh              OR
       NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
       NEW.u_revisao         IS DISTINCT FROM OLD.u_revisao        OR
       NEW.h_revisao         IS DISTINCT FROM OLD.h_revisao        OR
       NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
       NEW.hr_rodado         IS DISTINCT FROM OLD.hr_rodado        OR
       NEW.status            IS DISTINCT FROM OLD.status           OR
       NEW.modelo            IS DISTINCT FROM OLD.modelo           OR
       NEW.limite_revisao    IS DISTINCT FROM OLD.limite_revisao   OR
       NEW.cover_storage_path IS DISTINCT FROM OLD.cover_storage_path OR
       NEW.observacoes       IS DISTINCT FROM OLD.observacoes      OR
       NEW.motor_oleo        IS DISTINCT FROM OLD.motor_oleo       OR
       NEW.hidraulico_oleo   IS DISTINCT FROM OLD.hidraulico_oleo  OR
       NEW.transmissao_oleo  IS DISTINCT FROM OLD.transmissao_oleo OR
       NEW.eixo_oleo         IS DISTINCT FROM OLD.eixo_oleo        OR
       NEW.tandem_oleo       IS DISTINCT FROM OLD.tandem_oleo      OR
       NEW.filtro_lub        IS DISTINCT FROM OLD.filtro_lub       OR
       NEW.filtro_diesel_p   IS DISTINCT FROM OLD.filtro_diesel_p  OR
       NEW.filtro_diesel_s   IS DISTINCT FROM OLD.filtro_diesel_s  OR
       NEW.filtro_sep_agua   IS DISTINCT FROM OLD.filtro_sep_agua  OR
       NEW.filtro_ar_ext     IS DISTINCT FROM OLD.filtro_ar_ext    OR
       NEW.filtro_ar_int     IS DISTINCT FROM OLD.filtro_ar_int    OR
       NEW.filtro_trans      IS DISTINCT FROM OLD.filtro_trans     OR
       NEW.filtro_hidr       IS DISTINCT FROM OLD.filtro_hidr      OR
       NEW.filtro_respiro    IS DISTINCT FROM OLD.filtro_respiro   OR
       NEW.filtro_ar_cond1   IS DISTINCT FROM OLD.filtro_ar_cond1  OR
       NEW.filtro_ar_cond2   IS DISTINCT FROM OLD.filtro_ar_cond2  OR
       NEW.h_implemento      IS DISTINCT FROM OLD.h_implemento     OR
       NEW.h_implemento_revisao IS DISTINCT FROM OLD.h_implemento_revisao OR
       NEW.proxima_manutencao_implemento IS DISTINCT FROM OLD.proxima_manutencao_implemento
    THEN
      RAISE EXCEPTION 'Operador só pode lançar o horímetro atual';
    END IF;

    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    RETURN NEW;
  END IF;

  IF NEW.item              IS DISTINCT FROM OLD.item             OR
     NEW.cl                IS DISTINCT FROM OLD.cl               OR
     NEW.numero            IS DISTINCT FROM OLD.numero           OR
     NEW.cartao_ticket     IS DISTINCT FROM OLD.cartao_ticket    OR
     NEW.identificacao     IS DISTINCT FROM OLD.identificacao    OR
     NEW.afericao_taco     IS DISTINCT FROM OLD.afericao_taco    OR
     NEW.placa             IS DISTINCT FROM OLD.placa            OR
     NEW.ano               IS DISTINCT FROM OLD.ano              OR
     NEW.localizacao       IS DISTINCT FROM OLD.localizacao      OR
     NEW.operador_contato  IS DISTINCT FROM OLD.operador_contato OR
     NEW.telefone          IS DISTINCT FROM OLD.telefone         OR
     NEW.cnh               IS DISTINCT FROM OLD.cnh              OR
     NEW.data_ultima_revisao IS DISTINCT FROM OLD.data_ultima_revisao OR
     NEW.u_revisao         IS DISTINCT FROM OLD.u_revisao        OR
     NEW.h_revisao         IS DISTINCT FROM OLD.h_revisao        OR
     NEW.proxima_revisao_horimetro IS DISTINCT FROM OLD.proxima_revisao_horimetro OR
     NEW.hr_rodado         IS DISTINCT FROM OLD.hr_rodado        OR
     NEW.status            IS DISTINCT FROM OLD.status           OR
     NEW.modelo            IS DISTINCT FROM OLD.modelo           OR
     NEW.limite_revisao    IS DISTINCT FROM OLD.limite_revisao   OR
     NEW.cover_storage_path IS DISTINCT FROM OLD.cover_storage_path
  THEN
    RAISE EXCEPTION 'Colaborador só pode alterar horímetro, observações, filtros e lubrificantes';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;