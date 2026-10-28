import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import {
  filtrarEquipamentos,
  itensFiltrosParaCotacao,
  quantidadeItemRevisao,
  resumirItensRevisao,
} from "./frota-relatorio";

const base = {
  identificacao: null,
  placa: null,
  localizacao: null,
  operador_contato: null,
  status: null,
  horimetro_atual: 1000,
  h_revisao: 500,
  limite_revisao: 500,
};
const equipamentos = [
  { ...base, numero: "RE-30", cl: "05" },
  { ...base, numero: "RE-40", cl: "05", horimetro_atual: 1001 },
  { ...base, numero: "CB-03", cl: "49", horimetro_atual: 1200 },
];

describe("Filtros enviados para nova cotação", () => {
  test("envia somente código e quantidade dos filtros, sem óleos ou equipamentos", () => {
    assert.deepEqual(
      itensFiltrosParaCotacao([
        {
          id: "1",
          numero: "RE-30",
          filtro_lub: "PSL283",
          motor_oleo: "15W40",
          transmissao_oleo: "10W30",
        },
        { id: "2", numero: "RE-40", filtro_lub: "PSL283", filtro_ar_ext: "ARS8889" },
      ]),
      [
        { codigo: "ARS8889", quantidade: 1 },
        { codigo: "PSL283", quantidade: 2 },
      ],
    );
  });
  test("soma uma unidade por filtro com o mesmo código em campos diferentes", () => {
    assert.deepEqual(
      itensFiltrosParaCotacao([
        { id: "1", numero: "RE-30", filtro_lub: "PSL283", filtro_hidr: " psl283 " },
        { id: "2", numero: "RE-40", filtro_lub: "PSL283" },
      ]),
      [{ codigo: "PSL283", quantidade: 3 }],
    );
  });
  test("respeita a seleção de CL e busca usada pelo relatório", () => {
    const frota = equipamentos.map((e, i) => ({ ...e, id: String(i), filtro_lub: "PSL283" }));
    assert.deepEqual(itensFiltrosParaCotacao(filtrarEquipamentos(frota, "05", "RE-40", false)), [
      { codigo: "PSL283", quantidade: 1 },
    ]);
  });
  test("não duplica equipamentos nem inclui códigos vazios", () => {
    const e = { id: "1", numero: "RE-30", filtro_lub: "PSL283", filtro_trans: "  " };
    assert.deepEqual(itensFiltrosParaCotacao([e, e]), [{ codigo: "PSL283", quantidade: 1 }]);
  });
});

describe("Resumo de filtros e óleos", () => {
  test("lista os números dos equipamentos com o mesmo código e soma uma unidade por filtro", () => {
    const resumo = resumirItensRevisao([
      { id: "1", numero: "RE-30", filtro_lub: "PSL283" },
      { id: "2", numero: "RE-40", filtro_lub: "PSL283" },
      { id: "3", numero: "RE-55", filtro_lub: "OUTRO" },
    ]);
    assert.deepEqual(
      resumo.find((item) => item.codigo === "PSL283"),
      {
        tipo: "Filtro lubrificante",
        codigo: "PSL283",
        equipamentos: ["RE-30", "RE-40"],
        qtd: 2,
        total: 2,
        un: "un",
      },
    );
  });
  test("10W30 transmissão usa 16 litros", () => {
    assert.deepEqual(quantidadeItemRevisao("transmissao_oleo", "10w30"), { n: 16, un: "L" });
  });
  test("10W30 eixo usa 14 litros", () => {
    assert.deepEqual(quantidadeItemRevisao("eixo_oleo", "10W30"), { n: 14, un: "L" });
  });
  test("15W40 usa 13 litros", () => {
    assert.deepEqual(quantidadeItemRevisao("motor_oleo", "15W40"), { n: 13, un: "L" });
  });
  test("soma os litros dos equipamentos listados", () => {
    const [item] = resumirItensRevisao([
      { id: "1", numero: "RE-30", transmissao_oleo: "10W30" },
      { id: "2", numero: "RE-40", transmissao_oleo: "10W30" },
    ]);
    assert.equal(item.total, 32);
    assert.equal(item.qtd, 2);
  });
});

describe("Equipamentos selecionados para relatório", () => {
  test("inclui somente os itens do CL selecionado", () => {
    assert.deepEqual(
      filtrarEquipamentos(equipamentos, "05", "", false).map((e) => e.numero),
      ["RE-30", "RE-40"],
    );
  });
  test("respeita também a busca dentro do CL", () => {
    assert.deepEqual(
      filtrarEquipamentos(equipamentos, "05", "RE-40", false).map((e) => e.numero),
      ["RE-40"],
    );
  });
  test("respeita apenas vencidos e exclui o equipamento exatamente no limite", () => {
    assert.deepEqual(
      filtrarEquipamentos(equipamentos, "05", "", true).map((e) => e.numero),
      ["RE-40"],
    );
  });
});
