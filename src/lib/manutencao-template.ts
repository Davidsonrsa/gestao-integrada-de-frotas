export type ManutencaoItem = {
  sistema: string;
  item: string;
  acao: string;
  pm: "P" | "M";
  codigo?: string;
  quantidade?: string;
  status?: "" | "ok" | "substituido" | "inspecionado" | "ajustado" | "pendente" | "na";
};

export const MANUTENCAO_TEMPLATE: ManutencaoItem[] = [
  { sistema: "Motor", item: "Óleo Motor (15W40)", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro Lubrificante", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro de Ar primário", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Filtro de Ar secundário", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Indicador de Restrição", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Radiador", acao: "Limpar", pm: "M" },
  { sistema: "Motor", item: "Filtro Separador de água", acao: "Substituir", pm: "P" },
  { sistema: "Motor", item: "Correias", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Vazamentos", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Sistema de Escape", acao: "Inspecionar", pm: "M" },
  { sistema: "Motor", item: "Fixação e Coxins", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Filtros primário", acao: "Substituir", pm: "P" },
  { sistema: "Combustível", item: "Tubulação", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Aceleração e Parada", acao: "Inspecionar", pm: "M" },
  { sistema: "Combustível", item: "Rotação", acao: "Inspecionar", pm: "M" },
  { sistema: "Transmissão", item: "Óleo (Akcela Rec Lub)", acao: "Substituir", pm: "P" },
  { sistema: "Transmissão", item: "Filtro", acao: "Substituir", pm: "P" },
  { sistema: "Transmissão", item: "Respiro", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Óleo (AKC AW Hidraulic)", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Filtro", acao: "Substituir", pm: "P" },
  { sistema: "Hidráulico", item: "Pressões", acao: "Ajustar", pm: "M" },
  { sistema: "Vazamentos", item: "Bomba", acao: "Inspecionar", pm: "M" },
  { sistema: "Vazamentos", item: "Comandos", acao: "Inspecionar", pm: "M" },
  { sistema: "Vazamentos", item: "Mangueiras", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Faróis", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Lanternas", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Painel", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Alternador", acao: "Inspecionar", pm: "M" },
  { sistema: "Eletricidade", item: "Motor Partida", acao: "Inspecionar", pm: "M" },
  { sistema: "Eixos", item: "Óleo (Akcela Rec Lub)", acao: "Substituir", pm: "P" },
  { sistema: "Carregador e Articulação", item: "Pinos & Buchas", acao: "Inspecionar", pm: "M" },
  { sistema: "Carregador e Articulação", item: "Lubrificação", acao: "Substituir", pm: "P" },
];

export const STATUS_LABELS: Record<string, string> = {
  "": "—",
  ok: "OK",
  substituido: "Substituído",
  inspecionado: "Inspecionado",
  ajustado: "Ajustado",
  pendente: "Pendente",
  na: "N/A",
};
