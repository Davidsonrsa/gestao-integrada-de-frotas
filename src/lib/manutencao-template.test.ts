import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { MANUTENCAO_TEMPLATE, iniciaBlocoManutencao } from "@/lib/manutencao-template";

describe("iniciaBlocoManutencao", () => {
  test("o primeiro item sempre abre um bloco", () => {
    assert.strictEqual(iniciaBlocoManutencao(MANUTENCAO_TEMPLATE, 0), true);
  });

  test("item do mesmo sistema do anterior não abre bloco", () => {
    assert.strictEqual(iniciaBlocoManutencao(MANUTENCAO_TEMPLATE, 1), false);
  });

  test("o template abre os oito blocos na ordem da tela", () => {
    const blocos = MANUTENCAO_TEMPLATE.filter((_, i) => iniciaBlocoManutencao(MANUTENCAO_TEMPLATE, i))
      .map((it) => it.sistema)
      .join(", ");
    assert.strictEqual(
      blocos,
      "Motor, Combustível, Transmissão, Hidráulico, Vazamentos, Eletricidade, Eixos, Carregador e Articulação",
    );
  });

  test("sistema que se repete mais adiante abre um novo bloco", () => {
    const itens = [
      { sistema: "Motor", item: "a", acao: "x", pm: "P" as const },
      { sistema: "Eixos", item: "b", acao: "x", pm: "M" as const },
      { sistema: "Motor", item: "c", acao: "x", pm: "M" as const },
    ];
    assert.deepStrictEqual(
      itens.map((_, i) => iniciaBlocoManutencao(itens, i)),
      [true, true, true],
    );
  });
});
