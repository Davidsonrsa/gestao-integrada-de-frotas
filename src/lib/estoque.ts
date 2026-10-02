export type EstoqueStatus = "ESTOQUE NORMAL" | "ESTOQUE BAIXO" | "ESTOQUE ZERADO";

export type ProdutoEstoqueResumo = {
  estoque_atual: number | null;
  estoque_minimo: number | null;
};

export const estoqueUnidades = ["UN", "L", "KG", "M", "JOGO", "KIT", "PAR"];

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function getEstoqueStatus(item: ProdutoEstoqueResumo): EstoqueStatus {
  const atual = Number(item.estoque_atual ?? 0);
  const minimo = Number(item.estoque_minimo ?? 0);

  if (atual <= 0) return "ESTOQUE ZERADO";
  if (minimo > 0 && atual <= minimo) return "ESTOQUE BAIXO";
  return "ESTOQUE NORMAL";
}

export function getEstoqueStatusColor(status: EstoqueStatus) {
  switch (status) {
    case "ESTOQUE ZERADO":
      return "bg-red-100 text-red-700 border-red-200";
    case "ESTOQUE BAIXO":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
}

export function getStatusMeta(status: EstoqueStatus) {
  return {
    label: status,
    className: getEstoqueStatusColor(status),
  };
}
