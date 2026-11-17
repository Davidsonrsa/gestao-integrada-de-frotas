import { test } from "node:test";
import assert from "node:assert/strict";
import { podeEditarImplemento } from "./implemento-permissoes";

test("colaborador pode lançar e manter horímetros do implemento", () => {
  assert.equal(podeEditarImplemento("colaborador"), true);
});

test("administrador mantém edição do implemento", () => {
  assert.equal(podeEditarImplemento("admin"), true);
});

test("operador não pode editar horímetros do implemento", () => {
  assert.equal(podeEditarImplemento("operador"), false);
});

test("perfil ainda não carregado não libera edição do implemento", () => {
  assert.equal(podeEditarImplemento(null), false);
});