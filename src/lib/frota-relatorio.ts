type EquipamentoFiltro = {
  cl: string | null;
  numero: string;
  identificacao: string | null;
  placa: string | null;
  localizacao: string | null;
  operador_contato: string | null;
  status: string | null;
  horimetro_atual: number | null;
  h_revisao: number | null;
  limite_revisao: number | null;
};

export function filtrarEquipamentos<T extends EquipamentoFiltro>(
  equipamentos: T[],
  cl: string,
  busca: string,
  somenteVencidos: boolean,
): T[] {
  const termo = busca.trim().toLowerCase();
  return equipamentos.filter((e) => {
    if (cl !== "__all" && (e.cl ?? "") !== cl) return false;
    const rodado = e.horimetro_atual != null && e.h_revisao != null
      ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
      : null;
    if (somenteVencidos && !(rodado != null && rodado > Number(e.limite_revisao ?? 500))) return false;
    return !termo || [e.numero, e.identificacao, e.placa, e.localizacao, e.operador_contato, e.status]
      .some((valor) => valor?.toLowerCase().includes(termo));
  });
}