import { test } from "node:test";
import { strict as assert } from "node:assert";
import { prepararItensCotacao } from "./cotacao-itens-lote";

const item = {
  chave: "1",
  codigo: " PSL283 ",
  descricao: " Filtro lubrificante ",
  quantidade: "2",
  unidade: "un",
};
test("prepara todos os itens para salvar juntos na mesma cotação", () => {
  const resultado = prepararItensCotacao(
    [item, { ...item, chave: "2", codigo: "ARS8889", quantidade: "1,5" }],
    "cotacao-1",
  );
  assert.deepEqual(resultado, [
    {
      cotacao_id: "cotacao-1",
      codigo: "PSL283",
      descricao: "Filtro lubrificante",
      quantidade: 2,
      unidade: "UN",
    },
    {
      cotacao_id: "cotacao-1",
      codigo: "ARS8889",
      descricao: "Filtro lubrificante",
      quantidade: 1.5,
      unidade: "UN",
    },
  ]);
});
test("um item inválido impede preparar o lote inteiro", () => {
  assert.throws(
    () => prepararItensCotacao([item, { ...item, descricao: " " }], "cotacao-1"),
    /Item 2/,
  );
  assert.throws(
    () => prepararItensCotacao([item, { ...item, quantidade: "0" }], "cotacao-1"),
    /Item 2/,
  );
  assert.throws(() => prepararItensCotacao([], "cotacao-1"));
});
