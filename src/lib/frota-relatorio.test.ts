import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import {
  filtrarEquipamentos,
  itensFiltrosParaCotacao,
  quantidadeItemRevisao,
  resumirItensRevisao,
  selecionarEquipamentosRelatorio,
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
        {
          codigo: "ARS8889",
          descricao: "Filtro de ar externo",
          quantidade: 1,
          equipamentos: ["RE-40"],
        },
        {
          codigo: "PSL283",
          descricao: "Filtro lubrificante",
          quantidade: 2,
          equipamentos: ["RE-30", "RE-40"],
        },
      ],
    );
  });
  test("soma uma unidade por filtro com o mesmo código em campos diferentes", () => {
    assert.deepEqual(
      itensFiltrosParaCotacao([
        { id: "1", numero: "RE-30", filtro_lub: "PSL283", filtro_hidr: " psl283 " },
        { id: "2", numero: "RE-40", filtro_lub: "PSL283" },
      ]),
      [
        {
          codigo: "PSL283",
          descricao: "Filtro lubrificante",
          quantidade: 3,
          equipamentos: ["RE-30", "RE-40"],
        },
      ],
    );
  });
  test("respeita a seleção de CL e busca usada pelo relatório", () => {
    const frota = equipamentos.map((e, i) => ({ ...e, id: String(i), filtro_lub: "PSL283" }));
    assert.deepEqual(itensFiltrosParaCotacao(filtrarEquipamentos(frota, "05", "RE-40", false)), [
      {
        codigo: "PSL283",
        descricao: "Filtro lubrificante",
        quantidade: 1,
        equipamentos: ["RE-40"],
      },
    ]);
  });
  test("não duplica equipamentos nem inclui códigos vazios", () => {
    const e = { id: "1", numero: "RE-30", filtro_lub: "PSL283", filtro_trans: "  " };
    assert.deepEqual(itensFiltrosParaCotacao([e, e]), [
      {
        codigo: "PSL283",
        descricao: "Filtro lubrificante",
        quantidade: 1,
        equipamentos: ["RE-30"],
      },
    ]);
  });
  test("revisão de 500 h leva só lubrificante, ar e diesel", () => {
    const e = {
      id: "1",
      numero: "RE-30",
      proxima_revisao_horimetro: 500,
      filtro_lub: "L",
      filtro_ar_ext: "A",
      filtro_diesel_s: "D",
      filtro_hidr: "H",
      filtro_trans: "T",
    };
    assert.deepEqual(
      itensFiltrosParaCotacao([e]).map((i) => i.codigo),
      ["A", "D", "L"],
    );
  });
  test("revisão de 1000 h leva todos os filtros", () => {
    const e = {
      id: "1",
      numero: "RE-57",
      proxima_revisao_horimetro: 1000,
      filtro_lub: "L",
      filtro_hidr: "H",
      filtro_trans: "T",
      filtro_respiro: "R",
    };
    assert.deepEqual(
      itensFiltrosParaCotacao([e]).map((i) => i.codigo),
      ["H", "L", "R", "T"],
    );
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
  test("mostra a próxima revisão de cada equipamento na lista", () => {
    const resumo = resumirItensRevisao([
      { id: "1", numero: "RE-30", filtro_lub: "PSL283", proxima_revisao_horimetro: 250 },
      { id: "2", numero: "RE-40", filtro_lub: "PSL283", proxima_revisao_horimetro: 1000 },
      { id: "3", numero: "RE-55", filtro_lub: "PSL283" },
    ]);
    assert.deepEqual(resumo.find((item) => item.codigo === "PSL283")?.equipamentos, [
      "RE-30 (250 h)",
      "RE-40 (1000 h)",
      "RE-55",
    ]);
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
  test("usa somente equipamentos marcados dentro da CL na impressão e cotação", () => {
    const frota = equipamentos.map((e, i) => ({ ...e, id: String(i), filtro_lub: "PSL283" }));
    const selecionados = selecionarEquipamentosRelatorio(filtrarEquipamentos(frota, "05", "", false), ["1", "2"]);
    assert.deepEqual(selecionados.map((e) => e.numero), ["RE-40"]);
    assert.equal(resumirItensRevisao(selecionados)[0]?.total, 1);
    assert.deepEqual(itensFiltrosParaCotacao(selecionados)[0]?.equipamentos, ["RE-40"]);
    assert.equal(itensFiltrosParaCotacao(selecionados)[0]?.quantidade, 1);
  });
  test("seleção vazia não inclui equipamentos; seleção padrão inclui todos os visíveis", () => {
    const frota = [{ id: "1" }, { id: "2" }];
    assert.deepEqual(selecionarEquipamentosRelatorio(frota, []), []);
    assert.deepEqual(selecionarEquipamentosRelatorio(frota, null), frota);
  });
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
