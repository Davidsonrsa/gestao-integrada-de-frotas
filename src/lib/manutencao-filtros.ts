import { MANUTENCAO_TEMPLATE, type ManutencaoItem } from "@/lib/manutencao-template";

type FiltrosEquipamento = Partial<
  Record<
    | "filtro_lub"
    | "filtro_diesel_p"
    | "filtro_diesel_s"
    | "filtro_sep_agua"
    | "filtro_ar_ext"
    | "filtro_ar_int"
    | "filtro_trans"
    | "filtro_hidr"
    | "filtro_respiro"
    | "filtro_ar_cond1"
    | "filtro_ar_cond2",
    string | null
  >
>;

export function criarItensManutencao(equipamento: FiltrosEquipamento): ManutencaoItem[] {
  const codigos: Record<string, string | null | undefined> = {
    "Motor|Filtro Lubrificante": equipamento.filtro_lub,
    "Motor|Filtro de Ar primário": equipamento.filtro_ar_ext,
    "Motor|Filtro de Ar secundário": equipamento.filtro_ar_int,
    "Motor|Filtro Separador de água": equipamento.filtro_sep_agua,
    "Combustível|Filtros primário": equipamento.filtro_diesel_p,
    "Transmissão|Filtro": equipamento.filtro_trans,
    "Hidráulico|Filtro": equipamento.filtro_hidr,
  };
  const itens: ManutencaoItem[] = MANUTENCAO_TEMPLATE.map((item) => ({
    ...item,
    codigo: codigos[`${item.sistema}|${item.item}`] ?? "",
    quantidade: "",
    status: "",
  }));
  const adicionais = [
    { sistema: "Combustível", item: "Filtro secundário", codigo: equipamento.filtro_diesel_s },
    { sistema: "Hidráulico", item: "Filtro de respiro", codigo: equipamento.filtro_respiro },
    { sistema: "Ar condicionado", item: "Filtro 1", codigo: equipamento.filtro_ar_cond1 },
    { sistema: "Ar condicionado", item: "Filtro 2", codigo: equipamento.filtro_ar_cond2 },
  ];
  for (const item of adicionais) {
    if (item.codigo)
      itens.push({
        ...item,
        codigo: item.codigo,
        acao: "Substituir",
        pm: "P",
        quantidade: "",
        status: "",
      });
  }
  return itens;
}
