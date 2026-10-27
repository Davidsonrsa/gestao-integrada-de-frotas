import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { filtrarEquipamentos } from "./frota-relatorio";

const base = { identificacao: null, placa: null, localizacao: null, operador_contato: null, status: null, horimetro_atual: 1000, h_revisao: 500, limite_revisao: 500 };
const equipamentos = [
  { ...base, numero: "RE-30", cl: "05" },
  { ...base, numero: "RE-40", cl: "05", horimetro_atual: 1001 },
  { ...base, numero: "CB-03", cl: "49", horimetro_atual: 1200 },
];

describe("Equipamentos selecionados para relatório", () => {
  test("inclui somente os itens do CL selecionado", () => {
    assert.deepEqual(filtrarEquipamentos(equipamentos, "05", "", false).map((e) => e.numero), ["RE-30", "RE-40"]);
  });
  test("respeita também a busca dentro do CL", () => {
    assert.deepEqual(filtrarEquipamentos(equipamentos, "05", "RE-40", false).map((e) => e.numero), ["RE-40"]);
  });
  test("respeita apenas vencidos e exclui o equipamento exatamente no limite", () => {
    assert.deepEqual(filtrarEquipamentos(equipamentos, "05", "", true).map((e) => e.numero), ["RE-40"]);
  });
});