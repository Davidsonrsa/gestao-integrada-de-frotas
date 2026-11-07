export interface NotaCustoEquipamento {
  id: string;
  equipamento_id: string | null;
  identificacao: string | null;
  equipamento: string | null;
  cl: string | null;
  data: string | null;
  nf: string | null;
  descricao_produto: string | null;
  observacao: string | null;
  valor: number | null;
}

function normalizar(valor: string | null) {
  return (valor ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
}

export function custosDoEquipamento(
  notas: NotaCustoEquipamento[],
  equipamento: { id: string; numero: string; cl: string | null },
  inicio = "",
  fim = "",
) {
  const numero = normalizar(equipamento.numero);
  const vistos = new Set<string>();
  const itens = notas.filter((nota) => {
    if (vistos.has(nota.id)) return false;
    if (inicio && (!nota.data || nota.data < inicio)) return false;
    if (fim && (!nota.data || nota.data > fim)) return false;
    const pertence = nota.equipamento_id
      ? nota.equipamento_id === equipamento.id
      : Boolean(numero) &&
        (!nota.cl || normalizar(nota.cl) === normalizar(equipamento.cl)) &&
        [nota.identificacao, nota.equipamento].some((texto) => normalizar(texto) === numero);
    if (pertence) vistos.add(nota.id);
    return pertence;
  });
  return { itens, total: itens.reduce((soma, nota) => soma + Number(nota.valor ?? 0), 0) };
}
