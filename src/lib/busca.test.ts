import { test } from "node:test";
import assert from "node:assert";
import { correspondeBusca, normalizarBusca, padraoIlikeBusca, padroesIlikeNotas } from "./busca";

test("RE-21 é encontrado com qualquer formatação", () => {
  for (const t of ["RE-21", "RE21", "re21", "re-21", "RE 21"]) {
    assert.strictEqual(correspondeBusca(t, "RE-21"), true, t);
  }
});

test("não encontra código diferente", () => {
  assert.strictEqual(correspondeBusca("RE22", "RE-21"), false);
});

test("normaliza e gera padrão do servidor", () => {
  assert.strictEqual(normalizarBusca(" re - 21 "), "RE21");
  assert.strictEqual(padraoIlikeBusca("re 21"), "%RE%21%");
});

test("busca de notas mantém palavras separadas", () => {
  assert.deepStrictEqual(padroesIlikeNotas("filtro oleo"), ["%filtro oleo%", "%FILTRO%OLEO%"]);
});

test("busca de notas preserva acentos no padrão textual", () => {
  assert.deepStrictEqual(padroesIlikeNotas("manutenção"), ["%manutenção%", "%MANUTENCAO%"]);
});

test("busca de notas mantém prefixos tolerantes a separadores", () => {
  for (const termo of ["RE-21", "RE21", "re21", "re-21", "RE 21"]) {
    assert.ok(padroesIlikeNotas(termo).includes("%RE%21%"), termo);
  }
});
