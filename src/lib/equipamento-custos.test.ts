import { test } from "node:test";
import { strict as assert } from "node:assert";
import { custosDoEquipamento, type NotaCustoEquipamento } from "./equipamento-custos";

const equip = { id: "eq1", numero: "RE-43", cl: "05" };
const nota: NotaCustoEquipamento = {
  id: "nf1",
  equipamento_id: null,
  identificacao: "RE 43",
  equipamento: null,
  cl: null,
  data: "2026-10-06",
  nf: "123",
  descricao_produto: "Filtro",
  observacao: null,
  valor: 4000,
};
test("custos incluem data inicial e final e somam somente o período desejado", () => {
  const resultado = custosDoEquipamento(
    [
      nota,
      { ...nota, id: "nf2", data: "2026-10-31", valor: 350 },
      { ...nota, id: "nf3", data: "2026-09-30", valor: 200 },
    ],
    equip,
    "2026-10-06",
    "2026-10-31",
  );
  assert.deepEqual(
    resultado.itens.map((item) => item.id),
    ["nf1", "nf2"],
  );
  assert.equal(resultado.total, 4350);
});
test("vínculo explícito prevalece e notas duplicadas contam uma única vez", () => {
  const resultado = custosDoEquipamento(
    [
      nota,
      nota,
      { ...nota, id: "nf2", equipamento_id: "eq2" },
      { ...nota, id: "nf3", equipamento_id: "eq1", identificacao: "Outro", valor: 50 },
    ],
    equip,
  );
  assert.equal(resultado.total, 4050);
});
test("não atribui notas compartilhadas ou de outra CL por aproximação", () => {
  assert.equal(
    custosDoEquipamento(
      [
        { ...nota, identificacao: "RE 43-RE 30" },
        { ...nota, id: "2", cl: "04" },
        { ...nota, id: "3", identificacao: "RE 430" },
      ],
      equip,
    ).total,
    0,
  );
});
