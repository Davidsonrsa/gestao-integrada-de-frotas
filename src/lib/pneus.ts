export const POSICOES_EIXOS = [
  { nome: "Eixo 1", esquerda: ["1E"], direita: ["1D"] },
  { nome: "Eixo 2", esquerda: ["2EE", "2EI"], direita: ["2DI", "2DE"] },
  { nome: "Eixo 3", esquerda: ["3EE", "3EI"], direita: ["3DI", "3DE"] },
];

const EIXOS_RE = [
  { nome: "Dianteiro", esquerda: ["1E"], direita: ["1D"] },
  { nome: "Traseiro", esquerda: ["2E"], direita: ["2D"] },
];

/**
 * Posições das rodas no desenho do caminhão visto de cima.
 * x, y = centro da roda; w, h = tamanho da área clicável — tudo em % da imagem.
 */
export const POSICOES_CAMINHAO = [
  { pos: "1E", x: 12.9, y: 18.6, w: 13, h: 12 },
  { pos: "1D", x: 84.3, y: 18.6, w: 13, h: 12 },
  { pos: "2EE", x: 10.0, y: 60.2, w: 16, h: 18 },
  { pos: "2EI", x: 27.1, y: 60.2, w: 16, h: 18 },
  { pos: "2DI", x: 72.5, y: 60.2, w: 16, h: 18 },
  { pos: "2DE", x: 88.9, y: 60.2, w: 16, h: 18 },
  { pos: "3EE", x: 10.0, y: 78.1, w: 16, h: 18 },
  { pos: "3EI", x: 27.1, y: 78.1, w: 16, h: 18 },
  { pos: "3DI", x: 72.5, y: 78.1, w: 16, h: 18 },
  { pos: "3DE", x: 88.9, y: 78.1, w: 16, h: 18 },
];

/**
 * Posições das rodas no desenho do carro (chassi visto de cima).
 * x, y = centro da roda; w, h = tamanho da área clicável — tudo em % da imagem.
 */
export const POSICOES_CARRO = [
  { pos: "1E", x: 16.5, y: 12.9, w: 23, h: 24 },
  { pos: "1D", x: 76.6, y: 12.3, w: 23, h: 24 },
  { pos: "2E", x: 16.5, y: 85.7, w: 23, h: 24 },
  { pos: "2D", x: 76.6, y: 85.7, w: 23, h: 24 },
  { pos: "ESTEPE", x: 89.1, y: 49.0, w: 19, h: 32 },
];

const EIXOS_CARRO = [
  { nome: "Dianteiro", esquerda: ["1E"], direita: ["1D"] },
  { nome: "Traseiro", esquerda: ["2E"], direita: ["2D"] },
];

export type TipoPneus = "re" | "caminhao" | "carro";

/**
 * Sigla RE = retroescavadeira (4 pneus, sem estepe);
 * siglas VC/HILUX = carros (4 pneus + estepe);
 * os demais são caminhões (3 eixos + estepe).
 */
export type TipoChassi = TipoPneus | "sem_pneus";
export const TIPOS_CHASSI: { value: TipoChassi; label: string }[] = [
  { value: "re", label: "Retroescavadeira (4 pneus)" },
  { value: "caminhao", label: "Caminhão (10 + estepe)" },
  { value: "carro", label: "Carro (4 + estepe)" },
  { value: "sem_pneus", label: "Sem pneus" },
];

export function layoutPneus(numero?: string | null, tipo?: string | null) {
  if (tipo === "re") return { tipo: "re" as TipoPneus, eixos: EIXOS_RE, estepe: false, total: 4 };
  if (tipo === "carro") return { tipo: "carro" as TipoPneus, eixos: EIXOS_CARRO, estepe: true, total: 5 };
  if (tipo === "caminhao") return { tipo: "caminhao" as TipoPneus, eixos: POSICOES_EIXOS, estepe: true, total: 11 };
  const n = numero ?? "";
  if (/^\s*RE\b|^\s*RE[-\s]?\d/i.test(n)) {
    return { tipo: "re" as TipoPneus, eixos: EIXOS_RE, estepe: false, total: 4 };
  }
  if (/^\s*(VC|HILUX)\b|^\s*(VC|HILUX)[-\s]?\d/i.test(n)) {
    return { tipo: "carro" as TipoPneus, eixos: EIXOS_CARRO, estepe: true, total: 5 };
  }
  return { tipo: "caminhao" as TipoPneus, eixos: POSICOES_EIXOS, estepe: true, total: 11 };
}

/** Keep ambiguous legacy positions accessible without guessing their physical wheel. */
export function montagemPneus<T extends { posicao?: string | null }>(numero: string | null | undefined, pneus: T[], tipo?: string | null) {
  const layout = layoutPneus(numero, tipo);
  const posicoes = new Set(layout.eixos.flatMap((e) => [...e.esquerda, ...e.direita]));
  if (layout.estepe) posicoes.add("ESTEPE");
  const montados = new Map<string, T>();
  const pendentes: T[] = [];
  for (const pneu of pneus) {
    if (pneu.posicao && posicoes.has(pneu.posicao) && !montados.has(pneu.posicao)) {
      montados.set(pneu.posicao, pneu);
    } else {
      pendentes.push(pneu);
    }
  }
  return { montados, pendentes, posicoes, total: layout.total, vinculados: pneus.length };
}

export function podeAplicarPneu(numero: string | null | undefined, pneus: { posicao?: string | null }[], posicao: string) {
  const montagem = montagemPneus(numero, pneus);
  return montagem.posicoes.has(posicao) && !montagem.montados.has(posicao) && montagem.vinculados < montagem.total;
}

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

/** Medidas padrão dos pneus das retroescavadeiras (RE). */
export const MEDIDAS_RE = {
  dianteiro: ["12x16,5", "12,80x18"],
  traseiro: ["19,5x24", "16,9x24", "1400x24"],
};
