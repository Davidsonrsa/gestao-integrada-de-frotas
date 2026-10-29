import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { operadorPodeAcessar } from "@/lib/route-guards";

describe("operadorPodeAcessar", () => {
  test("permite a tela Frota", () => {
    assert.strictEqual(operadorPodeAcessar("/equipamentos"), true);
  });

  test("permite as páginas do equipamento", () => {
    assert.strictEqual(operadorPodeAcessar("/equipamentos/abc-123"), true);
    assert.strictEqual(operadorPodeAcessar("/equipamentos/abc-123/manutencao"), true);
  });

  test("bloqueia as demais telas do app", () => {
    assert.strictEqual(operadorPodeAcessar("/"), false);
    assert.strictEqual(operadorPodeAcessar("/medicoes"), false);
    assert.strictEqual(operadorPodeAcessar("/custos"), false);
    assert.strictEqual(operadorPodeAcessar("/cotacoes"), false);
    assert.strictEqual(operadorPodeAcessar("/notas-fiscais"), false);
    assert.strictEqual(operadorPodeAcessar("/estoque"), false);
    assert.strictEqual(operadorPodeAcessar("/admin"), false);
  });
});
