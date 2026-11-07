export interface ItemCotacaoRascunho {
  chave: string;
  codigo: string;
  descricao: string;
  quantidade: string;
  unidade: string;
}

export function prepararItensCotacao(itens: ItemCotacaoRascunho[], cotacaoId: string) {
  if (!itens.length) throw new Error("Adicione pelo menos um item.");
  return itens.map((item, index) => {
    const quantidade = Number(item.quantidade.trim().replace(",", "."));
    if (!item.descricao.trim()) throw new Error(`Item ${index + 1}: informe a descrição.`);
    if (!Number.isFinite(quantidade) || quantidade <= 0)
      throw new Error(`Item ${index + 1}: informe uma quantidade maior que zero.`);
    if (!item.unidade.trim()) throw new Error(`Item ${index + 1}: informe a unidade.`);
    return {
      cotacao_id: cotacaoId,
      codigo: item.codigo.trim() || null,
      descricao: item.descricao.trim(),
      quantidade,
      unidade: item.unidade.trim().toUpperCase(),
    };
  });
}
