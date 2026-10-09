import { test, expect } from "bun:test";
import { criarItensManutencao } from "./manutencao-filtros";

test("nova manutenção copia todos os códigos cadastrados sem misturar sistemas", () => {
  const filtros = { filtro_lub: "LUB-1", filtro_diesel_p: "DP-2", filtro_diesel_s: "DS-3", filtro_sep_agua: "AG-4", filtro_ar_ext: "AE-5", filtro_ar_int: "AI-6", filtro_trans: "TR-7", filtro_hidr: "HI-8", filtro_respiro: "RE-9", filtro_ar_cond1: "AC-10", filtro_ar_cond2: "AC-11" };
  const itens = criarItensManutencao(filtros);
  for (const codigo of Object.values(filtros)) expect(itens.filter((item) => item.codigo === codigo)).toHaveLength(1);
  expect(itens.find((item) => item.sistema === "Transmissão" && item.item === "Respiro")?.codigo).toBe("");
});

test("sem filtros mantém checklist vazio e cria cópia independente", () => {
  const itens = criarItensManutencao({});
  expect(itens).toHaveLength(32);
  expect(itens.every((item) => item.codigo === "" && item.status === "" && item.quantidade === "")).toBe(true);
  itens[0].codigo = "EDITADO";
  expect(criarItensManutencao({})[0].codigo).toBe("");
});