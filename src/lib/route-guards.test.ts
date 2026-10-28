import { describe, expect, it } from "bun:test";
import { operadorPodeAcessar } from "@/lib/route-guards";

describe("operadorPodeAcessar", () => {
  it("permite a tela Frota", () => {
    expect(operadorPodeAcessar("/equipamentos")).toBe(true);
  });

  it("permite as páginas do equipamento", () => {
    expect(operadorPodeAcessar("/equipamentos/abc-123")).toBe(true);
    expect(operadorPodeAcessar("/equipamentos/abc-123/manutencao")).toBe(true);
  });

  it("bloqueia as demais telas do app", () => {
    expect(operadorPodeAcessar("/")).toBe(false);
    expect(operadorPodeAcessar("/medicoes")).toBe(false);
    expect(operadorPodeAcessar("/custos")).toBe(false);
    expect(operadorPodeAcessar("/cotacoes")).toBe(false);
    expect(operadorPodeAcessar("/notas-fiscais")).toBe(false);
    expect(operadorPodeAcessar("/estoque")).toBe(false);
    expect(operadorPodeAcessar("/admin")).toBe(false);
  });
});
