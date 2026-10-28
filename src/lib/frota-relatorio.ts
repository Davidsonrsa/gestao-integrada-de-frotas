export const ITENS_REVISAO = [
  ["filtro_lub", "Filtro lubrificante"],
  ["filtro_diesel_p", "Filtro diesel primário"],
  ["filtro_diesel_s", "Filtro diesel secundário"],
  ["filtro_sep_agua", "Filtro separador de água"],
  ["filtro_ar_ext", "Filtro de ar externo"],
  ["filtro_ar_int", "Filtro de ar interno"],
  ["filtro_trans", "Filtro transmissão"],
  ["filtro_hidr", "Filtro hidráulico"],
  ["filtro_respiro", "Filtro de respiro"],
  ["filtro_ar_cond1", "Filtro ar-condicionado 1"],
  ["filtro_ar_cond2", "Filtro ar-condicionado 2"],
  ["motor_oleo", "Óleo motor"],
  ["hidraulico_oleo", "Óleo hidráulico"],
  ["transmissao_oleo", "Óleo transmissão"],
  ["eixo_oleo", "Óleo eixo"],
  ["tandem_oleo", "Óleo tandem"],
] as const;

export function quantidadeItemRevisao(campo: string, valor: string) {
  if (campo.startsWith("filtro")) return { n: 1, un: "un" };
  const codigo = valor.toUpperCase().replace(/\s/g, "");
  if (codigo.includes("15W40")) return { n: 13, un: "L" };
  if (codigo.includes("10W30") && campo === "transmissao_oleo") return { n: 16, un: "L" };
  if (codigo.includes("10W30") && campo === "eixo_oleo") return { n: 14, un: "L" };
  return null;
}

type EquipamentoRevisao = { id: string; numero: string } & Partial<
  Record<(typeof ITENS_REVISAO)[number][0], string | null>
>;

export function itensFiltrosParaCotacao(equipamentos: EquipamentoRevisao[]) {
  const porCodigo = new Map<string, { codigo: string; quantidade: number }>();
  const vistos = new Set<string>();
  for (const equipamento of equipamentos) {
    if (vistos.has(equipamento.id)) continue;
    vistos.add(equipamento.id);
    for (const [campo] of ITENS_REVISAO) {
      if (!campo.startsWith("filtro")) continue;
      const codigo = equipamento[campo]?.trim();
      if (!codigo) continue;
      const chave = codigo.toUpperCase().replace(/\s/g, "");
      const item = porCodigo.get(chave) ?? { codigo, quantidade: 0 };
      item.quantidade += 1;
      porCodigo.set(chave, item);
    }
  }
  return [...porCodigo.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

export function resumirItensRevisao(equipamentos: EquipamentoRevisao[]) {
  const resumo = new Map<string, {
    tipo: string; codigo: string; equipamentos: Map<string, string>; total: number; un: string;
  }>();
  for (const equipamento of equipamentos) {
    for (const [campo, tipo] of ITENS_REVISAO) {
      const codigo = equipamento[campo]?.trim();
      if (!codigo) continue;
      const chave = `${tipo}|${codigo.toUpperCase().replace(/\s/g, "")}`;
      const quantidade = quantidadeItemRevisao(campo, codigo);
      const item = resumo.get(chave) ?? {
        tipo, codigo, equipamentos: new Map<string, string>(), total: 0, un: quantidade?.un ?? "",
      };
      if (!item.equipamentos.has(equipamento.id)) {
        item.equipamentos.set(equipamento.id, equipamento.numero);
        item.total += quantidade?.n ?? 0;
      }
      resumo.set(chave, item);
    }
  }
  return [...resumo.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([, item]) => ({
      tipo: item.tipo, codigo: item.codigo, total: item.total, un: item.un,
      qtd: item.equipamentos.size,
      equipamentos: [...item.equipamentos.values()].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    }));
}

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
    const rodado =
      e.horimetro_atual != null && e.h_revisao != null
        ? Math.max(0, Number(e.horimetro_atual) - Number(e.h_revisao))
        : null;
    if (somenteVencidos && !(rodado != null && rodado > Number(e.limite_revisao ?? 500)))
      return false;
    return (
      !termo ||
      [e.numero, e.identificacao, e.placa, e.localizacao, e.operador_contato, e.status].some(
        (valor) => valor?.toLowerCase().includes(termo),
      )
    );
  });
}
