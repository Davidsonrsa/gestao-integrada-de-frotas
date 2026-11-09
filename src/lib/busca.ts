/** Normaliza texto de busca: maiúsculas, sem acentos, sem hífens, espaços ou separadores. */
export function normalizarBusca(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Verdadeiro quando o termo (normalizado) aparece em algum dos valores (normalizados). */
export function correspondeBusca(termo: string, ...valores: unknown[]): boolean {
  const t = normalizarBusca(termo);
  if (!t) return true;
  return valores.some((v) => normalizarBusca(v).includes(t));
}

/** Padrão ILIKE tolerante a separadores: "re21" → "%RE%21%". */
export function padraoIlikeBusca(termo: string): string {
  const partes = normalizarBusca(termo).match(/[A-Z]+|[0-9]+/g) ?? [];
  return partes.length ? `%${partes.join("%")}%` : "";
}
