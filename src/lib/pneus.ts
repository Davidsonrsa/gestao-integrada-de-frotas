export const POSICOES_EIXOS = [
  { nome: "Eixo 1", esquerda: ["1E"], direita: ["1D"] },
  { nome: "Eixo 2", esquerda: ["2EE", "2EI"], direita: ["2DI", "2DE"] },
  { nome: "Eixo 3", esquerda: ["3EE", "3EI"], direita: ["3DI", "3DE"] },
];

export const LEGENDA_RECAPAGEM = [
  { label: "Novo", bg: "#111111", fg: "#ffffff" },
  { label: "1 recapagem", bg: "#22c55e", fg: "#111111" },
  { label: "2 recapagens", bg: "#facc15", fg: "#111111" },
  { label: "3 recapagens", bg: "#2563eb", fg: "#ffffff" },
  { label: "4 recapagens", bg: "#dc2626", fg: "#ffffff" },
  { label: "+ de 4", bg: "#6b7280", fg: "#ffffff" },
];

export function corRecapagem(n: number) {
  return LEGENDA_RECAPAGEM[Math.min(Math.max(0, Math.floor(n)), 5)];
}
